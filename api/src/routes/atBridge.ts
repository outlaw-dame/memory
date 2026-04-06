/**
 * AT Protocol Bridge — API Routes
 *
 * Exposes the AT Protocol federated content to the memory UI.
 *
 * Endpoints:
 *   GET /at/feed          — Unified feed (AT + ActivityPods posts)
 *   GET /at/posts         — AT Protocol posts only
 *   GET /at/identities    — AT Protocol identity cache
 *   GET /at/status        — Firehose ingestion health/cursor status
 *   POST /at/subscribe    — Subscribe to a new AT firehose source (admin)
 *
 * Security notes:
 *   - All read endpoints require authentication.
 *   - The /at/subscribe endpoint requires admin role.
 *   - Input validation is performed on all parameters.
 *   - Source URLs are validated before storage.
 *   - Content is returned as-is; sanitisation is the frontend's responsibility.
 */

import Elysia, { t } from 'elysia'
import { db } from '../db/client'
import { atPosts, atIdentities, atFirehoseCursors, unifiedFeedView, atRecords } from '../db/atBridgeSchema'
import { desc, eq, and, sql, ilike, or, gt } from 'drizzle-orm'
import setupPlugin from './setup'

type UnifiedFeedRow = {
  id: number
  content: string
  createdAt: Date | null
  isPublic: boolean
  authorId: number | null
  authorName: string
  authorWebId: string
  authorProviderEndpoint: string
  source: 'activitypods' | 'atproto'
  atUri: string | null
  objectUri: string | null
}

type TimelineMode = 'chronological' | 'balanced'

type LexiconFamily = 'bsky' | 'standard.site' | 'other'

type AtRecordSummary = {
  title: string | null
  text: string | null
  subjectUri: string | null
  replyParentUri: string | null
  replyRootUri: string | null
  tags: string[]
  languages: string[]
  hasMedia: boolean
}

type AtRecordResponseItem = {
  id: number
  authorDid: string
  collection: string
  lexiconFamily: LexiconFamily
  recordType: string
  rkey: string
  atUri: string
  cid: string | null
  operation: string
  isActive: boolean
  createdAt: Date | null
  ingestedAt: Date | null
  sourceRelay: string | null
  firehoseSeq: number | null
  summary: AtRecordSummary
  record?: Record<string, unknown> | null
}

function getLexiconFamily(collection: string): LexiconFamily {
  if (collection.startsWith('app.bsky.')) return 'bsky'
  if (collection.startsWith('standard.site.')) return 'standard.site'
  return 'other'
}

function getRecordType(collection: string): string {
  switch (collection) {
    case 'app.bsky.feed.post':
      return 'post'
    case 'app.bsky.feed.like':
      return 'like'
    case 'app.bsky.feed.repost':
      return 'repost'
    case 'app.bsky.graph.follow':
      return 'follow'
    case 'app.bsky.graph.block':
      return 'block'
    case 'app.bsky.actor.profile':
      return 'profile'
    default: {
      const parts = collection.split('.')
      return parts[parts.length - 1] || collection
    }
  }
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function extractTagsFromFacets(facets: unknown): string[] {
  if (!Array.isArray(facets)) return []
  const tags: string[] = []
  for (const facet of facets) {
    if (!facet || typeof facet !== 'object') continue
    const features = (facet as Record<string, unknown>).features
    if (!Array.isArray(features)) continue
    for (const feature of features) {
      if (!feature || typeof feature !== 'object') continue
      const tag = (feature as Record<string, unknown>).tag
      if (typeof tag === 'string' && tag.trim().length > 0) tags.push(tag)
    }
  }
  return [...new Set(tags)]
}

function hasMediaEmbed(embed: unknown): boolean {
  if (!embed || typeof embed !== 'object') return false
  const record = embed as Record<string, unknown>
  if (Array.isArray(record.images) && record.images.length > 0) return true
  if (record.external && typeof record.external === 'object') return true
  if (record.media && typeof record.media === 'object') return true
  if (record.video && typeof record.video === 'object') return true
  if (record.type === 'Image' || record.type === 'Video') return true
  return false
}

function summarizeRecord(record: unknown): AtRecordSummary {
  const source = record && typeof record === 'object' ? (record as Record<string, unknown>) : {}
  const canonicalContent = source.content && typeof source.content === 'object'
    ? (source.content as Record<string, unknown>)
    : null
  const title =
    normalizeString(source.title) ||
    normalizeString(canonicalContent?.title) ||
    normalizeString(source.name) ||
    normalizeString(source.headline)
  const text =
    normalizeString(source.text) ||
    normalizeString(canonicalContent?.plaintext) ||
    normalizeString(canonicalContent?.summary) ||
    normalizeString(source.content) ||
    normalizeString(source.body) ||
    normalizeString(source.description)
  const subject = source.subject && typeof source.subject === 'object'
    ? (source.subject as Record<string, unknown>)
    : null
  const reply = source.reply && typeof source.reply === 'object'
    ? (source.reply as Record<string, unknown>)
    : null
  const replyParent = reply?.parent && typeof reply.parent === 'object'
    ? (reply.parent as Record<string, unknown>)
    : null
  const replyRoot = reply?.root && typeof reply.root === 'object'
    ? (reply.root as Record<string, unknown>)
    : null
  const tags = [
    ...normalizeStringArray(source.tags),
    ...extractTagsFromFacets(source.facets)
  ]

  return {
    title,
    text,
    subjectUri:
      normalizeString(subject?.uri) ||
      normalizeString(subject?.atUri) ||
      normalizeString(subject?.id),
    replyParentUri:
      normalizeString(replyParent?.uri) ||
      normalizeString(replyParent?.atUri) ||
      null,
    replyRootUri:
      normalizeString(replyRoot?.uri) ||
      normalizeString(replyRoot?.atUri) ||
      null,
    tags: [...new Set(tags)],
    languages: normalizeStringArray(source.langs),
    hasMedia: hasMediaEmbed(source.embed) || hasMediaEmbed(source.embeds),
  }
}

function mapRecordForResponse(row: typeof atRecords.$inferSelect, includeRaw: boolean): AtRecordResponseItem {
  const summary = summarizeRecord(row.record)
  const mapped: AtRecordResponseItem = {
    id: row.id,
    authorDid: row.authorDid,
    collection: row.collection,
    lexiconFamily: getLexiconFamily(row.collection),
    recordType: getRecordType(row.collection),
    rkey: row.rkey,
    atUri: row.atUri,
    cid: row.cid,
    operation: row.operation,
    isActive: row.isActive,
    createdAt: row.createdAt,
    ingestedAt: row.ingestedAt,
    sourceRelay: row.sourceRelay,
    firehoseSeq: row.firehoseSeq,
    summary,
  }
  if (includeRaw) {
    mapped.record = (row.record as Record<string, unknown> | null) ?? null
  }
  return mapped
}

function toTimestamp(value: Date | null): number {
  if (!value) return 0
  return value.getTime()
}

function preferDifferentAuthor(
  items: UnifiedFeedRow[],
  lastAuthor: string | null,
): UnifiedFeedRow | undefined {
  if (items.length === 0) return undefined
  if (!lastAuthor) return items.shift()

  const nextIndex = items.findIndex(item => item.authorWebId !== lastAuthor)
  if (nextIndex === -1) {
    return items.shift()
  }
  return items.splice(nextIndex, 1)[0]
}

function buildBalancedFeed(
  items: UnifiedFeedRow[],
  limit: number,
  offset: number,
  apWeight: number,
  atWeight: number,
): UnifiedFeedRow[] {
  const sorted = [...items].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
  const apQueue = sorted.filter(item => item.source === 'activitypods')
  const atQueue = sorted.filter(item => item.source === 'atproto')
  const result: UnifiedFeedRow[] = []

  const totalWeight = Math.max(1, apWeight + atWeight)
  const apTargetRatio = apWeight / totalWeight
  const atTargetRatio = atWeight / totalWeight

  let apCount = 0
  let atCount = 0
  let lastAuthor: string | null = null
  let sameAuthorRun = 0

  while (apQueue.length > 0 || atQueue.length > 0) {
    // Keep source representation balanced using user-selected protocol weights.
    const currentSize = result.length
    const apTargetCount = currentSize * apTargetRatio
    const atTargetCount = currentSize * atTargetRatio
    const apDeficit = apTargetCount - apCount
    const atDeficit = atTargetCount - atCount

    const apPreferred = apDeficit >= atDeficit
    const primary = apPreferred ? apQueue : atQueue
    const secondary = apPreferred ? atQueue : apQueue

    let picked = preferDifferentAuthor(primary, lastAuthor)
    if (!picked) {
      picked = preferDifferentAuthor(secondary, lastAuthor)
    }
    if (!picked) break

    // Prevent long consecutive runs from a single author where possible.
    if (lastAuthor && picked.authorWebId === lastAuthor && sameAuthorRun >= 2) {
      const alternate = preferDifferentAuthor(secondary, lastAuthor)
      if (alternate) {
        if (picked.source === 'activitypods') apQueue.unshift(picked)
        else atQueue.unshift(picked)
        picked = alternate
      }
    }

    result.push(picked)

    if (picked.source === 'activitypods') apCount += 1
    else atCount += 1

    if (picked.authorWebId === lastAuthor) {
      sameAuthorRun += 1
    } else {
      lastAuthor = picked.authorWebId
      sameAuthorRun = 1
    }

    // Build enough ranked candidates for the requested page window.
    if (result.length >= offset + limit) {
      break
    }
  }

  return result.slice(offset, offset + limit)
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const paginationQuery = t.Object({
  limit: t.Integer({ default: 20, maximum: 50, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
  hashtag: t.Optional(t.String({ minLength: 2, maxLength: 65 })),
})

const recordsQuery = t.Object({
  limit: t.Integer({ default: 20, maximum: 100, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
  collection: t.Optional(t.String({ minLength: 3, maxLength: 512 })),
  did: t.Optional(t.String({ minLength: 3, maxLength: 2048 })),
  family: t.Optional(t.Union([t.Literal('all'), t.Literal('bsky'), t.Literal('standard.site')])),
  recordType: t.Optional(t.String({ minLength: 2, maxLength: 128 })),
  search: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
  includeRaw: t.Optional(t.Boolean({ default: false })),
})

const feedQuery = t.Object({
  limit: t.Integer({ default: 20, maximum: 50, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 }),
  source: t.Optional(t.Union([t.Literal('activitypods'), t.Literal('atproto'), t.Literal('all')])),
  hashtag: t.Optional(t.String({ minLength: 2, maxLength: 65 })),
  mode: t.Optional(t.Union([t.Literal('chronological'), t.Literal('balanced')])),
  apWeight: t.Optional(t.Integer({ default: 50, minimum: 1, maximum: 99 })),
  atWeight: t.Optional(t.Integer({ default: 50, minimum: 1, maximum: 99 })),
  /** ISO-8601 timestamp — return only posts created after this value (delta sync cursor). */
  since: t.Optional(t.String({ minLength: 10, maxLength: 64 })),
})

const subscribeBody = t.Object({
  sourceId: t.String({ minLength: 1, maxLength: 512 }),
  url: t.String({ minLength: 7, maxLength: 512 }),
  sourceType: t.Union([t.Literal('relay'), t.Literal('pds')]),
})

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

const atBridgePlugin = new Elysia({ name: 'at-bridge', prefix: '/at' })
  .use(setupPlugin)
  .guard({ as: 'scoped', isSignedIn: true })

  // -------------------------------------------------------------------------
  // GET /at/feed — Unified feed (AT + ActivityPods)
  // -------------------------------------------------------------------------
  .get(
    '/feed',
    async ({ query: { limit, offset, source, hashtag, mode, apWeight, atWeight, since } }) => {
      try {
        const timelineMode: TimelineMode = mode ?? 'balanced'
        const normalizedApWeight = apWeight ?? 50
        const normalizedAtWeight = atWeight ?? 50
        const fetchLimit = Math.min(500, Math.max(80, offset + limit * 6))

        let query = db
          .select()
          .from(unifiedFeedView)
          .orderBy(desc(unifiedFeedView.createdAt))
          .limit(fetchLimit)
          .offset(0)

        if (source && source !== 'all') {
          query = query.where(eq(unifiedFeedView.source, source)) as typeof query
        }

        if (hashtag && hashtag.trim().length > 0) {
          const pattern = `%${hashtag.replace(/^#/, '#')}%`
          query = query.where(ilike(unifiedFeedView.content, pattern)) as typeof query
        }

        if (since) {
          const sinceDate = new Date(since)
          if (!isNaN(sinceDate.getTime())) {
            query = query.where(gt(unifiedFeedView.createdAt, sinceDate)) as typeof query
          }
        }

        const results = (await query) as UnifiedFeedRow[]

        if (timelineMode === 'chronological' || source === 'activitypods' || source === 'atproto') {
          return results.slice(offset, offset + limit)
        }

        return buildBalancedFeed(results, limit, offset, normalizedApWeight, normalizedAtWeight)
      } catch (err) {
        console.error('[AT Bridge] Failed to fetch unified feed:', err)
        throw new Error('Failed to fetch unified feed')
      }
    },
    {
      query: feedQuery,
      detail: 'Returns a unified feed of ActivityPods and AT Protocol posts',
      isSignedIn: true,
    },
  )

  // -------------------------------------------------------------------------
  // GET /at/posts — AT Protocol posts only
  // -------------------------------------------------------------------------
  .get(
    '/posts',
    async ({ query: { limit, offset, hashtag } }) => {
      try {
        const conditions = [eq(atPosts.isPublic, true)]

        if (hashtag && hashtag.trim().length > 0) {
          const pattern = `%${hashtag.replace(/^#/, '#')}%`
          conditions.push(ilike(atPosts.content, pattern))
        }

        const query = db
          .select({
            id: atPosts.id,
            authorDid: atPosts.authorDid,
            rkey: atPosts.rkey,
            atUri: atPosts.atUri,
            cid: atPosts.cid,
            content: atPosts.content,
            isPublic: atPosts.isPublic,
            facets: atPosts.facets,
            embeds: atPosts.embeds,
            replyParentUri: atPosts.replyParentUri,
            createdAt: atPosts.createdAt,
            ingestedAt: atPosts.ingestedAt,
            sourceRelay: atPosts.sourceRelay,
            // Join author identity
            authorHandle: atIdentities.handle,
          })
          .from(atPosts)
          .leftJoin(atIdentities, eq(atPosts.authorDid, atIdentities.did))
          .where(and(...conditions))

        const results = await query.orderBy(desc(atPosts.createdAt)).limit(limit).offset(offset)

        return results
      } catch (err) {
        console.error('[AT Bridge] Failed to fetch AT posts:', err)
        throw new Error('Failed to fetch AT posts')
      }
    },
    {
      query: paginationQuery,
      detail: 'Returns AT Protocol posts from the federated firehose',
      isSignedIn: true,
    },
  )

  // -------------------------------------------------------------------------
  // GET /at/records — Supported lexicon records (raw projection)
  // -------------------------------------------------------------------------
  .get(
    '/records',
    async ({ query: { limit, offset, collection, did, family, recordType, search, includeRaw } }) => {
      try {
        const conditions = [eq(atRecords.isActive, true)]

        if (collection && collection.trim().length > 0) {
          conditions.push(eq(atRecords.collection, collection.trim()))
        }

        if (did && did.trim().length > 0) {
          conditions.push(eq(atRecords.authorDid, did.trim()))
        }

        if (family && family !== 'all') {
          if (family === 'bsky') {
            conditions.push(sql`${atRecords.collection} LIKE 'app.bsky.%'`)
          }
          if (family === 'standard.site') {
            conditions.push(sql`${atRecords.collection} LIKE 'standard.site.%'`)
          }
        }

        if (recordType && recordType.trim().length > 0) {
          conditions.push(sql`split_part(${atRecords.collection}, '.', 3) = ${recordType.trim()}`)
        }

        if (search && search.trim().length > 0) {
          const pattern = `%${search.trim()}%`
          conditions.push(
            or(
              ilike(sql`coalesce(${atRecords.record}::jsonb ->> 'text', '')`, pattern),
              ilike(sql`coalesce(${atRecords.record}::jsonb ->> 'content', '')`, pattern),
              ilike(sql`coalesce(${atRecords.record}::jsonb ->> 'name', '')`, pattern),
              ilike(sql`coalesce(${atRecords.record}::jsonb ->> 'title', '')`, pattern)
            ) as any
          )
        }

        const rows = await db
          .select()
          .from(atRecords)
          .where(and(...conditions))
          .orderBy(desc(atRecords.createdAt), desc(atRecords.id))
          .limit(limit)
          .offset(offset)

        return rows.map(row => mapRecordForResponse(row, includeRaw ?? false))
      } catch (err) {
        console.error('[AT Bridge] Failed to fetch AT records:', err)
        throw new Error('Failed to fetch AT records')
      }
    },
    {
      query: recordsQuery,
      detail: 'Returns raw records for supported Bluesky and standard.site lexicons',
      isSignedIn: true,
    },
  )

  // -------------------------------------------------------------------------
  // GET /at/identities — AT identity cache
  // -------------------------------------------------------------------------
  .get(
    '/identities',
    async ({ query: { limit, offset } }) => {
      try {
        const results = await db
          .select({
            id: atIdentities.id,
            did: atIdentities.did,
            handle: atIdentities.handle,
            isActive: atIdentities.isActive,
            resolvedAt: atIdentities.resolvedAt,
          })
          .from(atIdentities)
          .orderBy(desc(atIdentities.resolvedAt))
          .limit(limit)
          .offset(offset)

        return results
      } catch (err) {
        console.error('[AT Bridge] Failed to fetch AT identities:', err)
        throw new Error('Failed to fetch AT identities')
      }
    },
    {
      query: paginationQuery,
      detail: 'Returns cached AT Protocol identities',
      isSignedIn: true,
    },
  )

  // -------------------------------------------------------------------------
  // GET /at/status — Firehose ingestion health
  // -------------------------------------------------------------------------
  .get(
    '/status',
    async () => {
      try {
        const cursors = await db
          .select()
          .from(atFirehoseCursors)
          .orderBy(desc(atFirehoseCursors.updatedAt))

        const [postCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(atPosts)

        const [identityCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(atIdentities)

        const [recordCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(atRecords)

        return {
          sources: cursors,
          stats: {
            totalAtPosts: postCount?.count ?? 0,
            totalAtIdentities: identityCount?.count ?? 0,
            totalAtRecords: recordCount?.count ?? 0,
          },
        }
      } catch (err) {
        console.error('[AT Bridge] Failed to fetch AT status:', err)
        throw new Error('Failed to fetch AT status')
      }
    },
    {
      detail: 'Returns firehose ingestion health and cursor status',
      isSignedIn: true,
    },
  )

  // -------------------------------------------------------------------------
  // POST /at/subscribe — Subscribe to a new AT firehose source
  // -------------------------------------------------------------------------
  .post(
    '/subscribe',
    async ({ body, error }) => {
      const { sourceId, url, sourceType } = body

      // Validate URL format
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
          return error(400, 'Source URL must use ws:// or wss:// protocol')
        }
      } catch {
        return error(400, 'Invalid source URL format')
      }

      try {
        // Upsert the cursor record to register the source
        await db
          .insert(atFirehoseCursors)
          .values({
            sourceId,
            sourceType,
            isConnected: false,
          })
          .onConflictDoUpdate({
            target: atFirehoseCursors.sourceId,
            set: {
              sourceType,
              updatedAt: new Date(),
            },
          })

        return {
          success: true,
          message: `Registered AT firehose source: ${sourceId}`,
          sourceId,
        }
      } catch (err) {
        console.error('[AT Bridge] Failed to register AT source:', err)
        return error(500, 'Failed to register AT firehose source')
      }
    },
    {
      body: subscribeBody,
      detail: 'Register a new AT Protocol firehose source',
      isSignedIn: true,
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
          sourceId: t.String(),
        }),
        400: t.String(),
        500: t.String(),
      },
    },
  )

export default atBridgePlugin
