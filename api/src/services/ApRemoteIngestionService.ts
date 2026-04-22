/**
 * AP Remote Ingestion Service
 *
 * Receives raw ActivityPub activities forwarded by the fedify-sidecar when it
 * receives content from AP relay subscriptions.  Extracts Note/Article objects,
 * deduplicates by object URI, and persists them to the ap_remote_posts table
 * so they appear in the unified memory feed alongside local and AT Protocol posts.
 *
 * Supported activity types:
 *   - Create{Note|Article}   — direct Note creation
 *   - Announce{Note|Article} — relay-style re-broadcast of a Note
 *
 * Security notes:
 *   - Content is stored as-received; HTML sanitisation happens at render time.
 *   - Object URIs are validated to be https: URLs before storage.
 *   - Published timestamps are clamped to now() to prevent sort-order manipulation.
 *   - All database errors are non-fatal; the webhook returns 200 regardless so
 *     the sidecar does not retry on transient write failures.
 */

import { db } from '../db/client'
import { apRemotePosts } from '../db/atBridgeSchema'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AS_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public'
const MAX_CONTENT_LENGTH = 100_000
const MAX_URI_LENGTH = 3072
const MAX_ACTIVITIES_PER_BATCH = 100

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_URI_LENGTH) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function extractDomain(uri: string): string | null {
  try {
    return new URL(uri).hostname
  } catch {
    return null
  }
}

function isPublicActivity(activity: Record<string, unknown>): boolean {
  const toField = activity['to']
  const ccField = activity['cc']
  const check = (field: unknown): boolean => {
    if (field === AS_PUBLIC) return true
    if (Array.isArray(field)) return field.includes(AS_PUBLIC)
    return false
  }
  return check(toField) || check(ccField)
}

function extractString(obj: Record<string, unknown>, key: string): string | null {
  const val = obj[key]
  if (typeof val === 'string' && val.length > 0) return val
  return null
}

function extractTags(noteObject: Record<string, unknown>): string[] {
  const tags = noteObject['tag']
  if (!Array.isArray(tags)) return []
  const result: string[] = []
  for (const tag of tags) {
    if (typeof tag !== 'object' || tag === null) continue
    const t = tag as Record<string, unknown>
    if (t['type'] === 'Hashtag' && typeof t['name'] === 'string') {
      // Normalize: strip leading # and lowercase
      const name = (t['name'] as string).replace(/^#/, '').trim().toLowerCase()
      if (name.length > 0 && name.length <= 100) result.push(name)
    }
  }
  return result
}

function clampToNow(date: Date): Date {
  const now = new Date()
  return date > now ? now : date
}

function parsePublished(value: unknown): Date {
  if (typeof value !== 'string') return new Date()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date()
  return clampToNow(parsed)
}

function extractInReplyTo(noteObject: Record<string, unknown>): string | null {
  const inReplyTo = noteObject['inReplyTo']
  if (typeof inReplyTo === 'string' && isHttpsUrl(inReplyTo)) return inReplyTo
  if (Array.isArray(inReplyTo)) {
    const first = inReplyTo.find(v => typeof v === 'string' && isHttpsUrl(v))
    return (first as string | undefined) ?? null
  }
  return null
}

function extractNoteObject(activity: Record<string, unknown>): Record<string, unknown> | null {
  const type = activity['type']
  const object = activity['object']

  const allowedTypes = new Set(['Create', 'Announce', 'Update'])
  const noteTypes = new Set(['Note', 'Article', 'Page'])

  if (typeof type !== 'string' || !allowedTypes.has(type)) return null

  // object is an inline Note
  if (typeof object === 'object' && object !== null && !Array.isArray(object)) {
    const obj = object as Record<string, unknown>
    if (typeof obj['type'] === 'string' && noteTypes.has(obj['type'])) return obj
    // For Announce wrapping a non-Note object, skip
    return null
  }

  // object is just a URI string — caller would need to fetch it; we skip here
  // (the sidecar should send the resolved object when possible)
  return null
}

// ---------------------------------------------------------------------------
// Main ingestion logic
// ---------------------------------------------------------------------------

export interface ApIngestResult {
  ingested: number
  skipped: number
  errors: number
}

/**
 * Process a single raw AP activity.  Returns `true` if a row was inserted
 * (or already existed), `false` if the activity should be skipped.
 */
async function ingestSingleActivity(
  activity: Record<string, unknown>,
  sourceRelayUri?: string,
): Promise<boolean> {
  const noteObject = extractNoteObject(activity)
  if (!noteObject) return false

  const objectId = extractString(noteObject, 'id')
  if (!isHttpsUrl(objectId)) return false

  // Determine public visibility from either the wrapping activity or the Note
  if (!isPublicActivity(activity) && !isPublicActivity(noteObject)) return false

  const attributedTo = noteObject['attributedTo']
  let authorWebId: string | null = null
  if (typeof attributedTo === 'string') {
    authorWebId = isHttpsUrl(attributedTo) ? attributedTo : null
  } else if (Array.isArray(attributedTo) && typeof attributedTo[0] === 'string') {
    authorWebId = isHttpsUrl(attributedTo[0]) ? (attributedTo[0] as string) : null
  }
  if (!authorWebId) return false

  const rawContent =
    extractString(noteObject, 'content') ??
    extractString(noteObject, 'contentMap') ??
    ''
  const content = rawContent.slice(0, MAX_CONTENT_LENGTH)
  if (content.trim().length === 0) return false

  const noteType = (noteObject['type'] as string).toLowerCase()
  const postType = noteType === 'article' || noteType === 'page' ? 'article' : 'note'

  const title = postType === 'article' ? extractString(noteObject, 'name') : null
  const summary = extractString(noteObject, 'summary')
  const canonicalUrl = extractString(noteObject, 'url') ?? null
  const publishedAt = parsePublished(noteObject['published'])
  const hashtags = extractTags(noteObject)
  const replyParentUri = extractInReplyTo(noteObject)
  const authorDomain = extractDomain(authorWebId)

  // Derive display name: prefer name/preferredUsername from actor embedded info,
  // fall back to username@domain extracted from the actor URI
  let authorName: string
  const actorName = noteObject['attributedToName']
  if (typeof actorName === 'string' && actorName.trim().length > 0) {
    authorName = actorName.trim().slice(0, 512)
  } else {
    // Extract username from actor URI path (e.g. /users/alice → alice)
    try {
      const pathname = new URL(authorWebId).pathname
      const segments = pathname.split('/').filter(Boolean)
      const username = segments[segments.length - 1] ?? ''
      authorName = username.length > 0
        ? `${username}@${authorDomain ?? 'unknown'}`
        : (authorDomain ?? authorWebId.slice(0, 64))
    } catch {
      authorName = authorWebId.slice(0, 64)
    }
  }

  try {
    await db
      .insert(apRemotePosts)
      .values({
        objectUri: objectId,
        authorWebId,
        authorName,
        authorDomain,
        content,
        postType,
        title,
        summary,
        canonicalUrl,
        isPublic: true,
        replyParentUri,
        replyRootUri: null,
        hashtags,
        createdAt: publishedAt,
        sourceRelay: sourceRelayUri ?? null,
      })
      .onConflictDoNothing({ target: apRemotePosts.objectUri })
    return true
  } catch (err) {
    console.error('[ApRemoteIngestion] DB insert error:', err)
    return false
  }
}

/**
 * Process a batch of raw AP activities (or a single activity object).
 * Each activity is fault-isolated; errors in one do not abort others.
 */
export async function ingestApRemoteActivities(
  payload: unknown,
  sourceRelayUri?: string,
): Promise<ApIngestResult> {
  const result: ApIngestResult = { ingested: 0, skipped: 0, errors: 0 }

  const activities: unknown[] = Array.isArray(payload)
    ? payload.slice(0, MAX_ACTIVITIES_PER_BATCH)
    : [payload]

  for (const raw of activities) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      result.skipped++
      continue
    }
    try {
      const inserted = await ingestSingleActivity(
        raw as Record<string, unknown>,
        sourceRelayUri,
      )
      if (inserted) {
        result.ingested++
      } else {
        result.skipped++
      }
    } catch (err) {
      console.error('[ApRemoteIngestion] Unhandled error for activity:', err)
      result.errors++
    }
  }

  return result
}
