import { createHash } from 'node:crypto'
import Elysia, { t } from 'elysia'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import { atIdentities, atRecords } from '../db/atBridgeSchema'
import setupPlugin from './setup'
import { signedIn, signedInGuard } from './elysiaCompat'
import {
  MediaAttachmentError,
  cleanupExpiredMediaAttachments,
  cleanupExpiredStoryMediaAttachments,
  getOwnedMediaAttachment,
  markMediaAttachmentAttachedToStory,
  markStoryMediaAttachmentDeleted,
  normalizeIdempotencyKey,
  type MediaAttachmentRow,
} from '../services/MediaAttachments'

const STORY_COLLECTION = 'org.activitypods.story.slide'
const STORY_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const STORY_MAX_TTL_MS = STORY_DEFAULT_TTL_MS
const STORY_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000
const STORY_MAX_TEXT_LENGTH = 1000
const STORY_MAX_ALT_LENGTH = 1000
const STORY_MAX_LINKS = 4
const STORY_MAX_VIDEO_DURATION_MS = 60_000
const STORY_MAX_LIMIT = 100
const STORY_DEFAULT_LIMIT = 30
const NETWORK_TIMEOUT_MS = 5000
const NETWORK_MAX_RETRIES = 1
const STORY_WRITE_BASE_URL = normalizeBaseUrl(
  process.env.MEMORY_STORY_SIDECAR_BASE_URL ||
  process.env.ATPROTO_SIDECAR_BASE_URL ||
  process.env.FEDIFY_SIDECAR_URL ||
  process.env.ACTIVITYPODS_SIDECAR_URL ||
  '',
)
const STORY_WRITE_TOKEN =
  process.env.MEMORY_STORY_SIDECAR_TOKEN ||
  process.env.ACTIVITYPODS_TOKEN ||
  process.env.INTERNAL_API_TOKEN ||
  ''
const STORY_BLOB_BASE_URL = normalizeBaseUrl(
  process.env.MEMORY_STORY_PUBLIC_XRPC_BASE_URL ||
  process.env.ATPROTO_PUBLIC_XRPC_BASE_URL ||
  STORY_WRITE_BASE_URL,
)
const ACTIVITYPODS_BASE_URL = normalizeBaseUrl(process.env.ACTIVITYPODS_URL || '')
const ACTIVITYPODS_TOKEN = process.env.ACTIVITYPODS_TOKEN || process.env.INTERNAL_API_TOKEN || ''

type StoryVisibility = 'public' | 'unlisted'

export type StoryLink = {
  uri: string
  title?: string
}

type StoryMediaView = {
  kind: 'image' | 'video'
  mimeType: string
  alt: string
  url: string | null
  cid: string | null
  aspectRatio: { width: number; height: number } | null
  durationMs: number | null
}

type StoryItem = {
  uri: string
  cid: string | null
  media: StoryMediaView
  text: string | null
  links: StoryLink[]
  createdAt: string
  expiresAt: string
  expiresInSeconds: number
  visibility: StoryVisibility
  seen: boolean
  viewerCanDelete: boolean
}

type StoryGroup = {
  actor: {
    did: string
    handle: string | null
    displayName: string | null
    avatarUrl: string | null
    isViewer: boolean
  }
  latestAt: string
  seen: boolean
  items: StoryItem[]
}

type StoryRecordEnvelope = {
  $type?: string
  kind?: string
  createdAt?: unknown
  expiresAt?: unknown
  visibility?: unknown
  media?: unknown
  text?: unknown
  links?: unknown
  allowReplies?: unknown
}

type SidecarStoryWriteResponse = {
  uri?: unknown
  cid?: unknown
  record?: unknown
}

const storyQuery = t.Object({
  mode: t.Optional(t.Union([t.Literal('following'), t.Literal('all')])),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: STORY_MAX_LIMIT, default: STORY_DEFAULT_LIMIT })),
})

const storyCreateBody = t.Object({
  mediaAttachmentId: t.String({ minLength: 36, maxLength: 36 }),
  alt: t.String({ minLength: 1, maxLength: STORY_MAX_ALT_LENGTH }),
  text: t.Optional(t.String({ maxLength: STORY_MAX_TEXT_LENGTH })),
  links: t.Optional(t.Array(t.Object({
    uri: t.String({ minLength: 7, maxLength: 2048 }),
    title: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  }), { maxItems: STORY_MAX_LINKS })),
  visibility: t.Optional(t.Union([t.Literal('public'), t.Literal('unlisted')])),
  expiresAt: t.Optional(t.String({ minLength: 10, maxLength: 64 })),
  idempotencyKey: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
})

const storyDeleteQuery = t.Object({
  uri: t.String({ minLength: 1, maxLength: 3072 }),
})

const storyViewedBody = t.Object({
  uri: t.Optional(t.String({ minLength: 1, maxLength: 3072 })),
  uris: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 3072 }), { minItems: 1, maxItems: 100 })),
  viewedAt: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
})

const storiesPlugin = new Elysia({ name: 'stories', prefix: '/at' })
  .use(setupPlugin)
  .guard(signedInGuard)
  .get(
    '/stories',
    async ({ query, user, set }) => {
      try {
        await cleanupExpiredStoryMediaAttachments(user.userId)
        const limit = query.limit ?? STORY_DEFAULT_LIMIT
        const mode = query.mode ?? 'following'
        const allowedAuthors = mode === 'following'
          ? await resolveFollowedStoryAuthors(user)
          : null
        const groups = await listStoryGroups(user, {
          limit,
          allowedAuthors,
        })
        return { groups }
      } catch (error) {
        console.error('[Stories] Failed to list stories:', error)
        return routeError(set, 500, 'Failed to load stories')
      }
    },
    {
      query: storyQuery,
      detail: { description: 'List active ATProto story groups for the signed-in user' },
      ...signedIn,
    },
  )
  .post(
    '/stories',
    async ({ body, user, set }) => {
      try {
        if (!isStoryWriteConfigured()) {
          return routeError(set, 503, 'Story writes are not configured')
        }

        await cleanupExpiredMediaAttachments(user.userId)
        await cleanupExpiredStoryMediaAttachments(user.userId)

        const attachment = await getOwnedMediaAttachment(user.userId, body.mediaAttachmentId)
        validateStoryAttachment(attachment)

        const alt = sanitizeStoryText(body.alt, STORY_MAX_ALT_LENGTH)
        if (!alt) {
          return routeError(set, 400, 'alt is required')
        }

        const createdAt = new Date()
        const expiresAt = normalizeStoryExpiresAt(body.expiresAt, createdAt)
        const text = sanitizeStoryText(body.text, STORY_MAX_TEXT_LENGTH)
        const links = normalizeSubmittedStoryLinks(body.links ?? [])
        const visibility: StoryVisibility = body.visibility === 'unlisted' ? 'unlisted' : 'public'
        const idempotencyKey = normalizeIdempotencyKey(body.idempotencyKey)
        const rkey = idempotencyKey ? stableRkey(`${user.getWebId()}:${idempotencyKey}`) : undefined

        if (rkey && user.atprotoDid) {
          const existing = await findActiveStoryByUri(`at://${user.atprotoDid}/${STORY_COLLECTION}/${rkey}`)
          if (existing) {
            return { story: await storyItemFromRow(existing, user, new Set([existing.atUri])) }
          }
        }

        const mediaUrl = attachment.canonicalUrl || attachment.sourceUrl
        if (!mediaUrl) {
          return routeError(set, 409, 'Media attachment has no usable URL')
        }

        const sidecarResponse = await createStoryThroughSidecar({
          canonicalAccountId: user.getWebId(),
          mediaAttachmentId: attachment.id,
          mediaUrl,
          mediaType: attachment.sourceMediaType,
          alt,
          text,
          links,
          visibility,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          aspectRatio: storyAspectRatioFromAttachment(attachment),
          durationMs: attachment.durationMs,
          ...(rkey ? { rkey } : {}),
        })

        const uri = typeof sidecarResponse.uri === 'string' ? sidecarResponse.uri : ''
        const parsed = parseAtUri(uri)
        if (!parsed || parsed.collection !== STORY_COLLECTION) {
          return routeError(set, 502, 'Sidecar returned an invalid story URI')
        }

        const record = normalizeStoredStoryRecord(sidecarResponse.record) ?? {
          $type: STORY_COLLECTION,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          visibility,
          media: null,
          text,
          links,
        }
        const cid = typeof sidecarResponse.cid === 'string' ? sidecarResponse.cid : null

        await db
          .insert(atRecords)
          .values({
            authorDid: parsed.did,
            collection: STORY_COLLECTION,
            rkey: parsed.rkey,
            atUri: uri,
            cid,
            operation: 'create',
            record: record as any,
            isActive: true,
            createdAt,
            ingestedAt: new Date(),
            sourceRelay: 'memory:stories',
            firehoseSeq: null,
          })
          .onConflictDoUpdate({
            target: atRecords.atUri,
            set: {
              cid,
              operation: 'create',
              record: record as any,
              isActive: true,
              createdAt,
              ingestedAt: new Date(),
              sourceRelay: 'memory:stories',
              firehoseSeq: null,
            },
          })

        await markMediaAttachmentAttachedToStory(user.userId, attachment.id, uri, expiresAt)

        const stored = await findActiveStoryByUri(uri)
        return { story: stored ? await storyItemFromRow(stored, user, new Set([uri])) : null }
      } catch (error) {
        if (error instanceof MediaAttachmentError) {
          return routeError(set, error.status, error.message)
        }
        console.error('[Stories] Failed to create story:', error)
        return routeError(set, 400, error instanceof Error ? error.message : 'Story create failed')
      }
    },
    {
      body: storyCreateBody,
      detail: { description: 'Create a 24-hour ATProto story from an owned media attachment' },
      ...signedIn,
    },
  )
  .delete(
    '/stories',
    async ({ query, user, set }) => {
      try {
        const story = await findStoryByUri(query.uri)
        if (!story || story.collection !== STORY_COLLECTION || !story.isActive) {
          return routeError(set, 404, 'Story not found')
        }
        if (!isOwnedStory(story.authorDid, user)) {
          return routeError(set, 403, 'You can only delete your own stories')
        }
        if (!isStoryWriteConfigured()) {
          return routeError(set, 503, 'Story writes are not configured')
        }

        await deleteStoryThroughSidecar(user.getWebId(), query.uri)

        await db
          .update(atRecords)
          .set({
            isActive: false,
            operation: 'delete',
            ingestedAt: new Date(),
          })
          .where(eq(atRecords.atUri, query.uri))

        await markStoryMediaAttachmentDeleted(user.userId, query.uri)

        return { ok: true }
      } catch (error) {
        console.error('[Stories] Failed to delete story:', error)
        return routeError(set, 400, error instanceof Error ? error.message : 'Story delete failed')
      }
    },
    {
      query: storyDeleteQuery,
      detail: { description: 'Delete an owned ATProto story' },
      ...signedIn,
    },
  )
  .post(
    '/stories/viewed',
    async ({ body, user, set }) => {
      const uris = [...new Set([body.uri, ...(body.uris ?? [])].filter((value): value is string => typeof value === 'string' && value.trim().length > 0))]
      if (uris.length === 0) {
        return routeError(set, 400, 'uri or uris is required')
      }

      try {
        await recordViewedObjectIds(user.getWebId(), uris, body.viewedAt)
        return { ok: true, recorded: uris.length }
      } catch (error) {
        console.error('[Stories] Failed to record viewed stories:', error)
        return routeError(set, 502, 'Failed to record viewed stories')
      }
    },
    {
      body: storyViewedBody,
      detail: { description: 'Record viewed ATProto stories for the signed-in user' },
      ...signedIn,
    },
  )

async function listStoryGroups(
  user: any,
  options: { limit: number; allowedAuthors: Set<string> | null },
): Promise<StoryGroup[]> {
  const rows = await db
    .select({
      id: atRecords.id,
      authorDid: atRecords.authorDid,
      collection: atRecords.collection,
      rkey: atRecords.rkey,
      atUri: atRecords.atUri,
      cid: atRecords.cid,
      record: atRecords.record,
      isActive: atRecords.isActive,
      createdAt: atRecords.createdAt,
      ingestedAt: atRecords.ingestedAt,
      handle: atIdentities.handle,
      displayName: atIdentities.displayName,
      avatarUrl: atIdentities.avatarUrl,
    })
    .from(atRecords)
    .leftJoin(atIdentities, eq(atRecords.authorDid, atIdentities.did))
    .where(and(eq(atRecords.collection, STORY_COLLECTION), eq(atRecords.isActive, true)))
    .orderBy(desc(atRecords.createdAt), desc(atRecords.id))
    .limit(Math.min(options.limit * 8, 500))

  const now = new Date()
  const activeRows = rows.filter(row => {
    if (options.allowedAuthors && !options.allowedAuthors.has(row.authorDid)) return false
    const story = normalizeStoredStoryRecord(row.record)
    if (!story) return false
    const expiresAt = parseDate(story.expiresAt)
    return !!expiresAt && expiresAt > now
  })

  const uris = activeRows.map(row => row.atUri)
  const viewed = await resolveViewedObjectIds(user.getWebId(), uris)

  const groupsByActor = new Map<string, StoryGroup>()
  for (const row of activeRows) {
    const item = await storyItemFromRow(row, user, viewed)
    if (!item) continue

    const existing = groupsByActor.get(row.authorDid)
    if (!existing) {
      groupsByActor.set(row.authorDid, {
        actor: {
          did: row.authorDid,
          handle: row.handle ?? (isOwnedStory(row.authorDid, user) ? user.atprotoHandle : null),
          displayName: row.displayName ?? (isOwnedStory(row.authorDid, user) ? user.userName : null),
          avatarUrl: row.avatarUrl ?? null,
          isViewer: isOwnedStory(row.authorDid, user),
        },
        latestAt: item.createdAt,
        seen: item.seen,
        items: [item],
      })
      continue
    }

    existing.items.push(item)
    if (new Date(item.createdAt) > new Date(existing.latestAt)) {
      existing.latestAt = item.createdAt
    }
    existing.seen = existing.items.every(candidate => candidate.seen)
  }

  return [...groupsByActor.values()]
    .map(group => ({
      ...group,
      items: group.items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      seen: group.items.every(item => item.seen),
    }))
    .sort((a, b) => {
      if (a.actor.isViewer !== b.actor.isViewer) return a.actor.isViewer ? -1 : 1
      if (a.seen !== b.seen) return a.seen ? 1 : -1
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    })
    .slice(0, options.limit)
}

async function storyItemFromRow(row: {
  authorDid: string
  atUri: string
  cid: string | null
  record: unknown
}, user: any, viewed: Set<string>): Promise<StoryItem | null> {
  const story = normalizeStoredStoryRecord(row.record)
  if (!story) return null
  const createdAt = parseDate(story.createdAt) ?? new Date()
  const expiresAt = parseDate(story.expiresAt)
  if (!expiresAt || expiresAt <= new Date()) return null
  const media = normalizeStoryMedia(story.media, row.authorDid)
  if (!media) return null

  return {
    uri: row.atUri,
    cid: row.cid,
    media,
    text: sanitizeStoryText(story.text, STORY_MAX_TEXT_LENGTH),
    links: normalizeStoryLinks(story.links),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    visibility: story.visibility === 'unlisted' ? 'unlisted' : 'public',
    seen: viewed.has(row.atUri),
    viewerCanDelete: isOwnedStory(row.authorDid, user),
  }
}

function normalizeStoryMedia(value: unknown, did: string): StoryMediaView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const media = value as Record<string, unknown>
  const blob = media.blob && typeof media.blob === 'object' && !Array.isArray(media.blob)
    ? media.blob as Record<string, unknown>
    : null
  const ref = blob?.ref && typeof blob.ref === 'object' && !Array.isArray(blob.ref)
    ? blob.ref as Record<string, unknown>
    : null
  const cid = typeof ref?.['$link'] === 'string' ? ref['$link'] : null
  const mimeType = typeof blob?.mimeType === 'string' ? blob.mimeType : ''
  const kind = media.kind === 'video' ? 'video' : 'image'
  const alt = sanitizeStoryText(media.alt, STORY_MAX_ALT_LENGTH)
  if (!cid || !mimeType || !alt) return null

  return {
    kind,
    mimeType,
    alt,
    url: buildBlobUrl(did, cid),
    cid,
    aspectRatio: normalizeAspectRatio(media.aspectRatio),
    durationMs: typeof media.durationMs === 'number' && Number.isFinite(media.durationMs) ? media.durationMs : null,
  }
}

function normalizeStoredStoryRecord(value: unknown): StoryRecordEnvelope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as StoryRecordEnvelope
  if (record.$type === STORY_COLLECTION && record.media) return record
  if (record.kind === 'StoryCreate' && record.media) return record
  return null
}

function validateStoryAttachment(row: MediaAttachmentRow | null): asserts row is MediaAttachmentRow {
  if (!row) {
    throw new MediaAttachmentError(404, 'media.attachments.notFound', 'Media attachment not found')
  }
  if (row.postId || row.storyUri) {
    throw new MediaAttachmentError(409, 'media.attachments.notAttachable', 'Media attachment is already attached')
  }
  if (row.state !== 'uploaded' && row.state !== 'ready') {
    throw new MediaAttachmentError(409, 'media.attachments.notAttachable', 'Media attachment is not ready')
  }
  if (!row.sourceUrl && !row.canonicalUrl) {
    throw new MediaAttachmentError(409, 'media.attachments.notAttachable', 'Media attachment has no usable URL')
  }
  if (!row.sourceMediaType.startsWith('image/') && !row.sourceMediaType.startsWith('video/')) {
    throw new MediaAttachmentError(415, 'media.attachments.unsupportedType', 'Stories support image and video media only')
  }
  if (row.sourceMediaType.startsWith('video/') && (row.durationMs ?? 0) > STORY_MAX_VIDEO_DURATION_MS) {
    throw new MediaAttachmentError(400, 'media.attachments.videoTooLong', 'Story video must be 60 seconds or shorter')
  }
}

export function normalizeStoryExpiresAt(value: unknown, createdAt: Date): Date {
  const fallback = new Date(createdAt.getTime() + STORY_DEFAULT_TTL_MS)
  let expiresAt = fallback
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseDate(value)
    if (!parsed) {
      throw new Error('expiresAt must be a valid ISO timestamp')
    }
    expiresAt = parsed
  }
  const ttl = expiresAt.getTime() - createdAt.getTime()
  if (ttl <= 0) {
    throw new Error('expiresAt must be in the future')
  }
  if (ttl > STORY_MAX_TTL_MS) {
    throw new Error('expiresAt cannot be more than 24 hours after creation')
  }
  if (createdAt.getTime() > Date.now() + STORY_MAX_CLOCK_SKEW_MS) {
    throw new Error('createdAt is too far in the future')
  }
  return expiresAt
}

function sanitizeStoryText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, maxLength) : null
}

function normalizeStoryLinks(value: unknown): StoryLink[] {
  if (!Array.isArray(value)) return []
  const links: StoryLink[] = []
  const seen = new Set<string>()
  for (const candidate of value) {
    if (links.length >= STORY_MAX_LINKS) break
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const raw = candidate as Record<string, unknown>
    const uri = typeof raw.uri === 'string' ? raw.uri.trim() : ''
    if (!uri || seen.has(uri) || !isHttpUrl(uri)) continue
    seen.add(uri)
    const title = sanitizeStoryText(raw.title, 120)
    links.push(title ? { uri, title } : { uri })
  }
  return links
}

export function normalizeSubmittedStoryLinks(value: unknown): StoryLink[] {
  const rawLinks = Array.isArray(value) ? value : []
  const links = normalizeStoryLinks(rawLinks)
  if (links.length !== rawLinks.length) {
    throw new Error('Story links must be unique http(s) URLs')
  }
  return links
}

function storyAspectRatioFromAttachment(row: MediaAttachmentRow): { width: number; height: number } | undefined {
  if (!row.width || !row.height || row.width <= 0 || row.height <= 0) return undefined
  return { width: row.width, height: row.height }
}

function normalizeAspectRatio(value: unknown): { width: number; height: number } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  return typeof raw.width === 'number' && typeof raw.height === 'number' && raw.width > 0 && raw.height > 0
    ? { width: Math.floor(raw.width), height: Math.floor(raw.height) }
    : null
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function parseAtUri(value: string): { did: string; collection: string; rkey: string } | null {
  const match = value.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/)
  if (!match) return null
  return { did: match[1], collection: match[2], rkey: match[3] }
}

function stableRkey(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 13)
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function routeError(set: { status?: unknown }, statusCode: number, message: string): string {
  set.status = statusCode
  return message
}

function isStoryWriteConfigured(): boolean {
  return STORY_WRITE_BASE_URL.length > 0 && STORY_WRITE_TOKEN.length > 0
}

function isViewershipIntegrationEnabled(): boolean {
  return ACTIVITYPODS_BASE_URL.length > 0 && ACTIVITYPODS_TOKEN.length > 0
}

function isOwnedStory(authorDid: string, user: any): boolean {
  return authorDid === user.atprotoDid || authorDid === user.getWebId()
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function buildBlobUrl(did: string, cid: string): string | null {
  if (!STORY_BLOB_BASE_URL) return null
  return `${STORY_BLOB_BASE_URL}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`
}

async function createStoryThroughSidecar(payload: Record<string, unknown>): Promise<SidecarStoryWriteResponse> {
  const response = await fetchWithBackoff(`${STORY_WRITE_BASE_URL}/api/internal/atproto/stories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STORY_WRITE_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const body = await readJson(response)
  if (!response.ok) {
    throw new Error(extractResponseError(body) || `Story create failed (${response.status})`)
  }
  return body as SidecarStoryWriteResponse
}

async function deleteStoryThroughSidecar(canonicalAccountId: string, uri: string): Promise<void> {
  const response = await fetchWithBackoff(`${STORY_WRITE_BASE_URL}/api/internal/atproto/stories`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${STORY_WRITE_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ canonicalAccountId, uri }),
  })
  const body = await readJson(response)
  if (!response.ok) {
    throw new Error(extractResponseError(body) || `Story delete failed (${response.status})`)
  }
}

async function findActiveStoryByUri(uri: string) {
  const [row] = await db
    .select({
      authorDid: atRecords.authorDid,
      atUri: atRecords.atUri,
      cid: atRecords.cid,
      record: atRecords.record,
      collection: atRecords.collection,
      isActive: atRecords.isActive,
    })
    .from(atRecords)
    .where(and(eq(atRecords.atUri, uri), eq(atRecords.collection, STORY_COLLECTION), eq(atRecords.isActive, true)))
    .limit(1)
  return row ?? null
}

async function findStoryByUri(uri: string) {
  const [row] = await db
    .select({
      authorDid: atRecords.authorDid,
      atUri: atRecords.atUri,
      cid: atRecords.cid,
      record: atRecords.record,
      collection: atRecords.collection,
      isActive: atRecords.isActive,
    })
    .from(atRecords)
    .where(eq(atRecords.atUri, uri))
    .limit(1)
  return row ?? null
}

async function resolveFollowedStoryAuthors(user: any): Promise<Set<string>> {
  const authors = new Set<string>()
  if (user.atprotoDid) authors.add(user.atprotoDid)
  authors.add(user.getWebId())

  const viewerIds = [user.atprotoDid, user.getWebId()].filter((value): value is string => !!value)
  if (viewerIds.length === 0) return authors

  const rows = await db
    .select({ record: atRecords.record })
    .from(atRecords)
    .where(and(
      eq(atRecords.isActive, true),
      inArray(atRecords.authorDid, viewerIds),
      inArray(atRecords.collection, ['app.bsky.graph.follow', 'canonical.follow']),
      isNotNull(atRecords.record),
    ))
    .limit(1000)

  for (const row of rows) {
    const did = extractFollowSubjectDid(row.record)
    if (did) authors.add(did)
  }

  return authors
}

function extractFollowSubjectDid(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (typeof record.subject === 'string' && record.subject.startsWith('did:')) return record.subject
  const subject = record.subject && typeof record.subject === 'object' && !Array.isArray(record.subject)
    ? record.subject as Record<string, unknown>
    : null
  if (typeof subject?.did === 'string' && subject.did.startsWith('did:')) return subject.did
  const target = record.targetObject && typeof record.targetObject === 'object' && !Array.isArray(record.targetObject)
    ? record.targetObject as Record<string, unknown>
    : null
  if (typeof target?.atUri === 'string') return parseAtUri(target.atUri)?.did ?? null
  return null
}

async function resolveViewedObjectIds(actorId: string, objectIds: string[]): Promise<Set<string>> {
  if (!isViewershipIntegrationEnabled() || objectIds.length === 0) return new Set<string>()

  const response = await fetchWithBackoff(`${ACTIVITYPODS_BASE_URL}/api/internal/viewership-history/resolve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACTIVITYPODS_TOKEN}`,
      'X-API-Key': ACTIVITYPODS_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ actorId, objectIds }),
  })

  if (!response.ok) throw new Error(`Viewership resolve failed: ${response.status}`)
  const payload = await readJson(response)
  const viewedObjectIds = Array.isArray((payload as any)?.viewedObjectIds)
    ? (payload as any).viewedObjectIds.filter((value: unknown): value is string => typeof value === 'string')
    : []
  return new Set(viewedObjectIds)
}

async function recordViewedObjectIds(actorId: string, objectIds: string[], viewedAt?: string): Promise<void> {
  if (!isViewershipIntegrationEnabled() || objectIds.length === 0) return
  const body: Record<string, unknown> = { actorId, objectIds }
  if (typeof viewedAt === 'string' && viewedAt.trim()) body.viewedAt = viewedAt

  const response = await fetchWithBackoff(`${ACTIVITYPODS_BASE_URL}/api/internal/viewership-history/record`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACTIVITYPODS_TOKEN}`,
      'X-API-Key': ACTIVITYPODS_TOKEN,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Viewership record failed: ${response.status}`)
}

async function fetchWithBackoff(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= NETWORK_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timeout)
      if (response.status >= 500 && attempt < NETWORK_MAX_RETRIES) {
        await delay(200 * (attempt + 1))
        continue
      }
      return response
    } catch (error) {
      clearTimeout(timeout)
      lastError = error
      if (attempt >= NETWORK_MAX_RETRIES) throw error
      await delay(200 * (attempt + 1))
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('Network request failed'))
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text }
  }
}

function extractResponseError(value: unknown): string | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const raw = (value as Record<string, unknown>).error
    return typeof raw === 'string' ? raw : null
  }
  return null
}

export default storiesPlugin
