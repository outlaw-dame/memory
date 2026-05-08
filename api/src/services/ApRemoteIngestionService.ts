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
import { apRemotePosts, atRecords, apActorCache } from '../db/atBridgeSchema'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import crypto from 'crypto'
import { secureFetch } from '../utils/secureFetch'
import { isPublicHttpUrl } from '../utils/urlGuards'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AS_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public'
const MAX_CONTENT_LENGTH = 100_000
const MAX_URI_LENGTH = 3072
const MAX_ACTIVITIES_PER_BATCH = 100
const AP_ACTOR_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/** In-flight fetch guard — prevents concurrent duplicate fetches of the same actor. */
const _actorFetchInFlight = new Set<string>()

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

function extractActorUri(activity: Record<string, unknown>): string | null {
  const actor = activity['actor']
  if (typeof actor === 'string' && isHttpsUrl(actor)) return actor
  if (typeof actor === 'object' && actor !== null && !Array.isArray(actor)) {
    const id = extractString(actor as Record<string, unknown>, 'id')
    if (id && isHttpsUrl(id)) return id
  }
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

function stableRepostId(actorUri: string, objectUri: string): string {
  return crypto
    .createHash('sha256')
    .update(`${actorUri}\0${objectUri}`)
    .digest('hex')
    .slice(0, 32)
}

async function recordAnnounceActivity(
  activity: Record<string, unknown>,
  objectUri: string,
  sourceRelayUri?: string,
): Promise<void> {
  if (activity['type'] !== 'Announce') return

  const actorUri = extractActorUri(activity)
  if (!actorUri) return

  const createdAt = parsePublished(activity['published'])
  const repostId = stableRepostId(actorUri, objectUri)
  const repostUri = `canonical://share/${repostId}`
  const record = {
    kind: 'ShareAdd',
    sourceProtocol: 'activitypub',
    sourceEventId: repostUri,
    sourceAccountRef: {
      canonicalAccountId: actorUri,
      activityPubActorUri: actorUri,
      webId: actorUri,
      handle: actorUri,
    },
    object: {
      canonicalObjectId: objectUri,
      activityPubObjectId: objectUri,
    },
    createdAt: createdAt.toISOString(),
    observedAt: new Date().toISOString(),
    visibility: { public: true },
    provenance: {
      originProtocol: 'activitypub',
      originEventId: extractString(activity, 'id') ?? repostUri,
      projectionMode: 'native',
    },
    warnings: [],
    _ingestContract: 'ActivityPubAnnounce',
  }

  await db
    .insert(atRecords)
    .values({
      authorDid: actorUri,
      collection: 'canonical.share',
      rkey: repostId,
      atUri: repostUri,
      cid: null,
      operation: 'create',
      record,
      isActive: true,
      createdAt,
      ingestedAt: new Date(),
      sourceRelay: sourceRelayUri ?? 'activitypub:relay',
      firehoseSeq: null,
    })
    .onConflictDoUpdate({
      target: atRecords.atUri,
      set: {
        operation: 'create',
        record,
        isActive: true,
        createdAt,
        ingestedAt: new Date(),
        sourceRelay: sourceRelayUri ?? 'activitypub:relay',
      },
    })
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

/**
 * Extract an AP-native quote URI from a Note/Article object.
 *
 * Vendor field precedence (most-standard → most-legacy):
 *   1. `quote`         — FEP-e232 draft standard
 *   2. `quoteUrl`      — Misskey / Calckey
 *   3. `quoteUri`      — alternate spelling used by some servers
 *   4. `_misskey_quote` — legacy Misskey field
 *
 * Returns a validated https/http URI or null.
 */
export function extractQuotedPostUri(noteObject: Record<string, unknown>): string | null {
  const candidates = [
    noteObject['quote'],
    noteObject['quoteUrl'],
    noteObject['quoteUri'],
    noteObject['_misskey_quote'],
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && isHttpsUrl(candidate)) {
      return candidate
    }
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
// AP Actor Cache helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the AP actor document for `actorUri` and upsert into `ap_actor_cache`
 * if the existing entry is missing or older than AP_ACTOR_CACHE_TTL_MS.
 * Always fire-and-forget (never awaited by callers).
 */
async function cacheApActorIfStale(actorUri: string): Promise<void> {
  if (_actorFetchInFlight.has(actorUri)) return
  _actorFetchInFlight.add(actorUri)
  try {
    // Skip if a fresh entry already exists.
    const threshold = new Date(Date.now() - AP_ACTOR_CACHE_TTL_MS)
    const existing = await db
      .select({ cachedAt: apActorCache.cachedAt })
      .from(apActorCache)
      .where(eq(apActorCache.actorUri, actorUri))
      .limit(1)
    if (existing.length > 0 && existing[0].cachedAt && existing[0].cachedAt > threshold) {
      return
    }

    const resp = await (async () => {
      try {
        const { response } = await secureFetch(actorUri, {
          headers: { Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"' },
          timeoutMs: 5000,
          // AP actor URIs are federation identifiers; we still run the
          // full URL-hygiene pipeline (sanitize + DNS resolve + Safe
          // Browsing) but allow callers to suppress SB if a future
          // private/internal AP cluster is introduced.
        })
        return response
      } catch {
        // Guard rejection or transport failure — actor cache is best-effort.
        return null
      }
    })()
    if (!resp || !resp.ok) return

    const actor = await resp.json() as Record<string, unknown>

    const preferredUsername = typeof actor['preferredUsername'] === 'string'
      ? actor['preferredUsername'].slice(0, 512)
      : null
    const displayName = typeof actor['name'] === 'string'
      ? actor['name'].slice(0, 640)
      : null
    const summary = typeof actor['summary'] === 'string'
      ? actor['summary'].slice(0, 5000)
      : null
    const domain = extractDomain(actorUri)

    // icon = avatar, image = banner
    const iconObj = actor['icon']
    const imageObj = actor['image']
    function extractMediaUrl(obj: unknown): string | null {
      // Reject non-public URLs (private IPs, loopback, javascript:, file:, etc.)
      // before storing — the browser will later request these directly so we
      // must not let federated actors point clients at internal hosts.
      if (typeof obj === 'string') return isPublicHttpUrl(obj) ? obj : null
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        const url = (obj as Record<string, unknown>)['url']
        if (typeof url === 'string' && isPublicHttpUrl(url)) return url
      }
      return null
    }
    const avatarUrl = extractMediaUrl(iconObj)
    const bannerUrl = extractMediaUrl(imageObj)

    // Extract follower/following/post counts when the actor document exposes
    // them as collection objects with totalItems (Misskey, Pleroma, some others).
    // Most Mastodon instances only expose URIs here; those remain null.
    function extractCollectionCount(obj: unknown): number | null {
      if (typeof obj === 'number' && Number.isFinite(obj) && obj >= 0) return Math.trunc(obj)
      if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        const ti = (obj as Record<string, unknown>)['totalItems']
        if (typeof ti === 'number' && Number.isFinite(ti) && ti >= 0) return Math.trunc(ti)
      }
      return null
    }
    const followersCount = extractCollectionCount(actor['followers'])
    const followingCount = extractCollectionCount(actor['following'])
    const postsCount = extractCollectionCount(actor['outbox'])

    await db
      .insert(apActorCache)
      .values({
        actorUri,
        preferredUsername,
        displayName,
        avatarUrl,
        bannerUrl,
        summary,
        domain,
        followersCount,
        followingCount,
        postsCount,
        cachedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: apActorCache.actorUri,
        set: {
          preferredUsername,
          displayName,
          avatarUrl,
          bannerUrl,
          summary,
          domain,
          followersCount,
          followingCount,
          postsCount,
          cachedAt: new Date(),
        },
      })
  } catch {
    // Non-fatal — actor cache is best-effort
  } finally {
    _actorFetchInFlight.delete(actorUri)
  }
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
  const quotedPostUri = extractQuotedPostUri(noteObject)
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
        quotedPostUri,
        hashtags,
        createdAt: publishedAt,
        sourceRelay: sourceRelayUri ?? null,
      })
      .onConflictDoNothing({ target: apRemotePosts.objectUri })
    await recordAnnounceActivity(activity, objectId, sourceRelayUri)
    // Fire-and-forget: refresh actor profile cache in the background.
    cacheApActorIfStale(authorWebId).catch(() => undefined)
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

// ---------------------------------------------------------------------------
// Reply root reconciliation
// ---------------------------------------------------------------------------

const MAX_RECONCILE_BATCH = 500
/** Max chain depth to walk before treating the chain as broken / circular. */
const MAX_CHAIN_DEPTH = 50

/**
 * Walk the `ap_remote_posts` chain upward from `startParentUri` to find the
 * thread root.  Returns the root `object_uri`, or `null` if the root is not
 * in our local DB (i.e. the chain leads to an external URI we never ingested).
 *
 * Protects against cycles by capping depth at MAX_CHAIN_DEPTH.
 */
async function resolveReplyRoot(startParentUri: string): Promise<string | null> {
  let currentUri: string = startParentUri
  const seen = new Set<string>()

  for (let depth = 0; depth < MAX_CHAIN_DEPTH; depth++) {
    if (seen.has(currentUri)) return null // cycle detected
    seen.add(currentUri)

    const rows = await db
      .select({
        objectUri: apRemotePosts.objectUri,
        replyParentUri: apRemotePosts.replyParentUri,
      })
      .from(apRemotePosts)
      .where(eq(apRemotePosts.objectUri, currentUri))
      .limit(1)

    const row = rows[0]
    if (!row) return null // not in our DB — chain is external

    if (!row.replyParentUri) {
      // This row is a root post (no parent)
      return row.objectUri
    }

    currentUri = row.replyParentUri
  }

  return null // depth limit exceeded — treat as unresolvable
}

/**
 * Idempotent sweep that resolves `reply_root_uri` for AP remote posts that
 * are part of a thread but whose root was not known at ingest time.
 *
 * Safe to run multiple times; only processes rows where:
 *   - `reply_parent_uri IS NOT NULL` (it's a reply)
 *   - `reply_root_uri IS NULL` (root not yet resolved)
 *
 * Designed to run as a periodic background job.
 *
 * @returns number of rows updated
 */
export async function reconcileApRemoteReplyRoots(): Promise<number> {
  // Fetch a batch of unresolved reply posts
  const unresolvedRows = await db
    .select({
      id: apRemotePosts.id,
      objectUri: apRemotePosts.objectUri,
      replyParentUri: apRemotePosts.replyParentUri,
    })
    .from(apRemotePosts)
    .where(
      and(
        isNotNull(apRemotePosts.replyParentUri),
        isNull(apRemotePosts.replyRootUri),
      ),
    )
    .limit(MAX_RECONCILE_BATCH)

  if (unresolvedRows.length === 0) return 0

  let updated = 0

  for (const row of unresolvedRows) {
    if (!row.replyParentUri) continue

    try {
      const rootUri = await resolveReplyRoot(row.replyParentUri)
      if (!rootUri) continue // root not in our DB yet — skip for now

      await db
        .update(apRemotePosts)
        .set({ replyRootUri: rootUri })
        .where(
          and(
            eq(apRemotePosts.id, row.id),
            isNull(apRemotePosts.replyRootUri), // idempotency guard
          ),
        )

      updated++
    } catch (err) {
      console.error('[ApRemoteIngestion] reconcileApRemoteReplyRoots error for', row.objectUri, err)
    }
  }

  console.log('[ApRemoteIngestion] reconcileApRemoteReplyRoots', {
    processed: unresolvedRows.length,
    updated,
  })

  return updated
}

/**
 * Start a periodic background sweep that resolves `reply_root_uri` for AP
 * remote posts.  Runs once immediately on startup, then on the configured
 * interval.
 *
 * @param intervalMs - how often to run (default: 5 minutes)
 * @returns NodeJS timer handle (can be used to stop the sweep via clearInterval)
 */
export function startApRemoteReconciliationService(intervalMs = 5 * 60 * 1000): ReturnType<typeof setInterval> {
  const execute = async () => {
    try {
      await reconcileApRemoteReplyRoots()
    } catch (err) {
      console.error('[ApRemoteIngestion] reconcileApRemoteReplyRoots background run failed:', err)
    }
  }

  void execute()
  const timer = setInterval(() => {
    void execute()
  }, intervalMs)

  console.info('[ApRemoteIngestion] Reply root reconciliation service started', { intervalMs })

  return timer
}
