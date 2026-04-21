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
import { atPosts, atIdentities, atFirehoseCursors, unifiedFeedView, atRecords, unifiedFeedCandidatesView } from '../db/atBridgeSchema'
import { desc, eq, and, sql, ilike, or, gt, inArray } from 'drizzle-orm'
import setupPlugin from './setup'
import { extractHashtagsFromFacets, normalizeHashtag } from '../utils/hashtags'
import { applyFollowedReplyThreadBumps, type ThreadBumpMeta } from '../utils/threadBumps'
import {
  applyViewerThreadMetrics,
  appendVisibleThreadWindow,
  buildViewerThreadMetrics,
  filterViewerModeratedRows as filterViewerModeratedRowsBase,
  finalizeVisibleThreadWindow,
  getThreadRootUri,
  isRowHiddenForViewer,
  type ViewerModerationFilter,
  type ViewerModerationState,
  type ViewerThreadMetrics,
} from './atBridgeViewerProjection'

type UnifiedFeedRow = {
  id: number
  content: string
  hashtags: string[]
  postType: 'note' | 'article'
  title: string | null
  summary: string | null
  canonicalUrl: string | null
  createdAt: Date | null
  isPublic: boolean
  authorId: number | null
  authorName: string
  authorWebId: string
  authorProviderEndpoint: string
  source: 'activitypods' | 'atproto'
  atUri: string | null
  objectUri: string | null
  replyParentUri: string | null
  replyRootUri: string | null
  candidateUri?: string | null
  threadParentAuthorId?: string | null
  threadRootAuthorId?: string | null
  threadReplyCount?: number | null
  threadParticipantCount?: number | null
  threadLastActivityAt?: Date | null
}

type FeedItemType = 'post' | 'thread_summary'

type UnifiedFeedResponseItem = UnifiedFeedRow & {
  type: FeedItemType
}

type ThreadContextResponse = {
  rootUri: string
  root: UnifiedFeedResponseItem | null
  items: UnifiedFeedResponseItem[]
  nextCursor: string | null
  hasMore: boolean
  replyCount: number
  participantCount: number
  lastActivityAt: Date | null
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

type ViewershipResolveResponse = {
  viewedObjectIds?: string[]
}

type ViewerModerationAction = 'block' | 'mute'

type DashboardListResponse = {
  data?: Array<Record<string, unknown>>
}

const activityPodsBaseUrl = (process.env.ACTIVITYPODS_URL || '').replace(/\/$/, '')
const activityPodsToken = process.env.ACTIVITYPODS_TOKEN || process.env.INTERNAL_API_TOKEN || ''

function isViewershipIntegrationEnabled(): boolean {
  return activityPodsBaseUrl.length > 0 && activityPodsToken.length > 0
}

const NETWORK_TIMEOUT_MS = 3500
const NETWORK_MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 200

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithBackoff(url: string, init: RequestInit, timeoutMs = NETWORK_TIMEOUT_MS): Promise<Response> {
  let lastError: unknown = null

  for (let attempt = 0; attempt <= NETWORK_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timeout)

      // Retry transient upstream failures; preserve immediate failure for client errors.
      if (response.status >= 500 && attempt < NETWORK_MAX_RETRIES) {
        const jitter = Math.floor(Math.random() * 75)
        await delay(RETRY_BASE_DELAY_MS * (2 ** attempt) + jitter)
        continue
      }

      return response
    } catch (error) {
      clearTimeout(timeout)
      lastError = error
      if (attempt >= NETWORK_MAX_RETRIES) {
        throw error
      }
      const jitter = Math.floor(Math.random() * 75)
      await delay(RETRY_BASE_DELAY_MS * (2 ** attempt) + jitter)
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Network request failed'))
}

function normalizeThreadUri(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 3072) return null
  if (/\s/.test(trimmed)) return null
  return trimmed
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const parsed = Number.parseInt(decoded, 10)
    if (!Number.isFinite(parsed) || parsed < 0) return 0
    return parsed
  } catch {
    return 0
  }
}

function mapFeedItemType(row: UnifiedFeedRow): FeedItemType {
  if (row.replyParentUri || row.replyRootUri) {
    return 'post'
  }

  const replyCount = typeof row.threadReplyCount === 'number' ? row.threadReplyCount : 0
  return replyCount >= 6 ? 'thread_summary' : 'post'
}

function mapFeedItemForResponse(row: UnifiedFeedRow): UnifiedFeedResponseItem {
  return {
    ...row,
    type: mapFeedItemType(row),
  }
}

function getUserDashboardBaseUrl(user: { endpoint?: string | null }): string | null {
  const endpoint = normalizeString(user.endpoint)
  if (!endpoint) return null
  return endpoint.replace(/\/$/, '')
}

async function fetchViewerDashboardList(
  user: { endpoint?: string | null; token?: string | null },
  container: 'blocks' | 'mutes' | 'filters',
): Promise<Array<Record<string, unknown>>> {
  const baseUrl = getUserDashboardBaseUrl(user)
  const accessToken = normalizeString(user.token)
  if (!baseUrl || !accessToken) {
    return []
  }

  const response = await fetchWithBackoff(`${baseUrl}/api/dashboard/settings/${container}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Viewer moderation lookup failed (${container}): ${response.status}`)
  }

  const payload = (await response.json()) as DashboardListResponse
  return Array.isArray(payload.data)
    ? payload.data.filter((value): value is Record<string, unknown> => !!value && typeof value === 'object')
    : []
}

function normalizeModerationSubjectKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null
}

function normalizeViewerFilter(value: Record<string, unknown>): ViewerModerationFilter | null {
  const action = normalizeString(value.action)?.toLowerCase()
  if (action !== 'hide' && action !== 'warn' && action !== 'filter') {
    return null
  }

  const rawTerms = Array.isArray(value.terms)
    ? value.terms.filter((term): term is string => typeof term === 'string' && term.trim().length > 0)
    : []
  const fallbackPattern = normalizeString(value.pattern)
  const terms = rawTerms.length > 0 ? rawTerms : (fallbackPattern ? [fallbackPattern] : [])
  if (terms.length === 0) return null

  const matchType = normalizeString(value.matchType)?.toLowerCase() === 'phrase' ? 'phrase' : 'word'

  return {
    action,
    matchType,
    terms: terms.map(term => term.trim().toLowerCase()),
    includeHashtagVariants: value.includeHashtagVariants !== false,
  }
}

async function resolveViewerModerationState(
  user: { endpoint?: string | null; token?: string | null },
): Promise<ViewerModerationState | null> {
  const baseUrl = getUserDashboardBaseUrl(user)
  const accessToken = normalizeString(user.token)
  if (!baseUrl || !accessToken) {
    return null
  }

  const [blocks, mutes, filters] = await Promise.all([
    fetchViewerDashboardList(user, 'blocks'),
    fetchViewerDashboardList(user, 'mutes'),
    fetchViewerDashboardList(user, 'filters'),
  ])

  const hiddenSubjectKeys = new Set<string>()
  for (const item of [...blocks, ...mutes]) {
    const key = normalizeModerationSubjectKey(item.subjectCanonicalId)
    if (key) hiddenSubjectKeys.add(key)
  }

  return {
    hiddenSubjectKeys,
    filters: filters
      .map(normalizeViewerFilter)
      .filter((value): value is ViewerModerationFilter => value !== null),
  }
}

function filterViewerModeratedRows(
  rows: UnifiedFeedRow[],
  state: ViewerModerationState | null,
): { visible: UnifiedFeedRow[]; hiddenCount: number } {
  return filterViewerModeratedRowsBase(rows, state)
}

async function loadViewerThreadMetricsByRootUri(
  rootUris: string[],
  moderationState: ViewerModerationState | null,
): Promise<Map<string, ViewerThreadMetrics>> {
  const uniqueRootUris = [...new Set(rootUris.map(uri => uri.trim()).filter(uri => uri.length > 0))]
  const metricsByRootUri = new Map<string, ViewerThreadMetrics>()

  if (uniqueRootUris.length === 0) {
    return metricsByRootUri
  }

  const replyRows = (await db
    .select()
    .from(unifiedFeedCandidatesView)
    .where(
      and(
        or(
          inArray(unifiedFeedCandidatesView.replyRootUri, uniqueRootUris),
          inArray(unifiedFeedCandidatesView.replyParentUri, uniqueRootUris),
        ),
        eq(unifiedFeedCandidatesView.isPublic, true),
      ),
    )
    .orderBy(desc(unifiedFeedCandidatesView.createdAt), desc(unifiedFeedCandidatesView.id))) as UnifiedFeedRow[]

  const visibleRowsByRootUri = new Map<string, UnifiedFeedRow[]>()

  for (const row of replyRows) {
    const rootUri = normalizeString(row.replyRootUri) ?? normalizeString(row.replyParentUri)
    if (!rootUri) continue
    if (moderationState && isRowHiddenForViewer(row, moderationState)) continue

    const existing = visibleRowsByRootUri.get(rootUri)
    if (existing) {
      existing.push(row)
    } else {
      visibleRowsByRootUri.set(rootUri, [row])
    }
  }

  for (const rootUri of uniqueRootUris) {
    metricsByRootUri.set(rootUri, buildViewerThreadMetrics(visibleRowsByRootUri.get(rootUri) ?? []))
  }

  return metricsByRootUri
}

async function applyViewerModerationProjection(
  rows: UnifiedFeedRow[],
  user: { endpoint?: string | null; token?: string | null },
): Promise<{ visible: UnifiedFeedRow[]; hiddenCount: number }> {
  if (rows.length === 0) return { visible: rows, hiddenCount: 0 }

  try {
    const state = await resolveViewerModerationState(user)
    return filterViewerModeratedRows(rows, state)
  } catch (error) {
    console.warn('[AT Bridge] Viewer moderation projection unavailable:', error)
    return { visible: rows, hiddenCount: 0 }
  }
}

async function safeResolveViewerModerationState(
  user: { endpoint?: string | null; token?: string | null },
  contextLabel: 'feed' | 'thread',
): Promise<ViewerModerationState | null> {
  try {
    return await resolveViewerModerationState(user)
  } catch (error) {
    console.warn(`[AT Bridge] ${contextLabel} moderation projection unavailable:`, error)
    return null
  }
}

function deriveModerationSubject(body: {
  source: 'activitypods' | 'atproto'
  authorWebId: string
  atUri?: string | null
}): { subjectCanonicalId: string; subjectProtocol: string } | null {
  if (body.source === 'atproto') {
    const did = body.atUri ? parseAtUri(body.atUri)?.did : null
    const canonical = normalizeString(did) ?? normalizeString(body.authorWebId)
    if (!canonical) return null
    return {
      subjectCanonicalId: canonical,
      subjectProtocol: 'atproto',
    }
  }

  const canonical = normalizeString(body.authorWebId)
  if (!canonical) return null
  return {
    subjectCanonicalId: canonical,
    subjectProtocol: 'activitypub',
  }
}

async function createViewerModerationDecision(
  user: { endpoint?: string | null; token?: string | null },
  action: ViewerModerationAction,
  subject: { subjectCanonicalId: string; subjectProtocol: string },
): Promise<void> {
  const baseUrl = getUserDashboardBaseUrl(user)
  const accessToken = normalizeString(user.token)
  if (!baseUrl || !accessToken) {
    throw new Error('Viewer moderation is unavailable for the current session')
  }

  const container = action === 'block' ? 'blocks' : 'mutes'
  const response = await fetchWithBackoff(`${baseUrl}/api/dashboard/settings/${container}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ data: subject }),
  })

  if (!response.ok) {
    throw new Error(`Viewer moderation create failed (${action}): ${response.status}`)
  }
}

async function resolveViewedObjectIds(actorId: string, objectIds: string[]): Promise<Set<string>> {
  if (!isViewershipIntegrationEnabled() || objectIds.length === 0) {
    return new Set<string>()
  }

  const response = await fetchWithBackoff(`${activityPodsBaseUrl}/api/internal/viewership-history/resolve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activityPodsToken}`,
      'X-API-Key': activityPodsToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ actorId, objectIds })
  })

  if (!response.ok) {
    throw new Error(`Viewership resolve failed: ${response.status}`)
  }

  const payload = (await response.json()) as ViewershipResolveResponse
  const values = Array.isArray(payload.viewedObjectIds)
    ? payload.viewedObjectIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []
  return new Set(values)
}

async function recordViewedObjectIds(actorId: string, objectIds: string[], viewedAt?: string): Promise<void> {
  if (!isViewershipIntegrationEnabled() || objectIds.length === 0) {
    return
  }

  const body: Record<string, unknown> = { actorId, objectIds }
  if (typeof viewedAt === 'string' && viewedAt.trim().length > 0) {
    body.viewedAt = viewedAt
  }

  const response = await fetchWithBackoff(`${activityPodsBaseUrl}/api/internal/viewership-history/record`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activityPodsToken}`,
      'X-API-Key': activityPodsToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    throw new Error(`Viewership record failed: ${response.status}`)
  }
}

function feedItemObjectId(row: UnifiedFeedRow): string | null {
  if (typeof row.objectUri === 'string' && row.objectUri.length > 0) {
    return row.objectUri
  }
  if (typeof row.atUri === 'string' && row.atUri.length > 0) {
    return row.atUri
  }
  return null
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
    ...extractHashtagsFromFacets(source.facets)
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

function parseAtUri(value: string): { did: string; collection?: string; rkey?: string } | null {
  if (!value.startsWith('at://')) return null
  const parts = value.replace('at://', '').split('/').filter(Boolean)
  if (parts.length < 1) return null
  return {
    did: parts[0],
    collection: parts[1],
    rkey: parts[2],
  }
}

function collectActorIds(value: unknown): string[] {
  const ids = new Set<string>()

  if (typeof value === 'string') {
    const normalized = normalizeString(value)
    if (normalized) ids.add(normalized)
    if (normalized?.startsWith('at://')) {
      const did = parseAtUri(normalized)?.did
      if (did) ids.add(did)
    }
    return [...ids]
  }

  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  const directFields = [
    record.canonicalAccountId,
    record.did,
    record.webId,
    record.activityPubActorUri,
    record.handle,
    record.uri,
    record.atUri,
    record.id,
  ]

  for (const field of directFields) {
    const normalized = normalizeString(field)
    if (!normalized) continue
    ids.add(normalized)
    if (normalized.startsWith('at://')) {
      const did = parseAtUri(normalized)?.did
      if (did) ids.add(did)
    }
  }

  return [...ids]
}

function extractFollowSubjectIds(record: unknown): string[] {
  if (!record || typeof record !== 'object') return []
  return collectActorIds((record as Record<string, unknown>).subject)
}

function extractFollowAuthorIds(record: unknown): string[] {
  if (!record || typeof record !== 'object') return []
  return collectActorIds((record as Record<string, unknown>).sourceAccountRef)
}

function extractCurrentUserIds(user: { atprotoDid?: string | null; getWebId?: (() => string) | undefined }): Set<string> {
  const ids = new Set<string>()

  const did = normalizeString(user.atprotoDid)
  if (did) ids.add(did)

  const webId = typeof user.getWebId === 'function' ? normalizeString(user.getWebId()) : null
  if (webId) ids.add(webId)

  return ids
}

async function resolveFollowedAuthorIds(user: { atprotoDid?: string | null; getWebId?: (() => string) | undefined }): Promise<Set<string>> {
  const currentUserIds = extractCurrentUserIds(user)
  if (currentUserIds.size === 0) return new Set<string>()

  const followRecords = await db
    .select({
      authorDid: atRecords.authorDid,
      collection: atRecords.collection,
      record: atRecords.record,
    })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.isActive, true),
        or(
          eq(atRecords.collection, 'app.bsky.graph.follow'),
          eq(atRecords.collection, 'canonical.follow'),
        ),
      ),
    )
    .limit(5000)

  const followed = new Set<string>()
  for (const row of followRecords) {
    const authorIds = new Set<string>([row.authorDid, ...extractFollowAuthorIds(row.record)])
    const isCurrentUsersFollow = [...authorIds].some(id => currentUserIds.has(id))
    if (!isCurrentUsersFollow) continue

    for (const followedId of extractFollowSubjectIds(row.record)) {
      followed.add(followedId)
    }
  }

  return followed
}

function loadReplyThreadMeta(items: UnifiedFeedRow[]): Map<number, ThreadBumpMeta> {
  return new Map(items
    .filter(item => item.replyParentUri || item.replyRootUri)
    .map(item => [item.id, {
      replyParentUri: item.replyParentUri,
      replyRootUri: item.replyRootUri,
    }]))
}

async function loadThreadAnchorRows(items: UnifiedFeedRow[], metaById: ReadonlyMap<number, ThreadBumpMeta>): Promise<Map<string, UnifiedFeedRow>> {
  const anchors = new Map<string, UnifiedFeedRow>()

  for (const item of items) {
    if (item.atUri) anchors.set(item.atUri, item)
    if (item.objectUri) anchors.set(item.objectUri, item)
  }

  const missingUris = new Set<string>()
  for (const item of items) {
    const meta = metaById.get(item.id)
    const anchorUri = meta?.replyRootUri ?? meta?.replyParentUri
    if (anchorUri && !anchors.has(anchorUri)) missingUris.add(anchorUri)
  }

  if (missingUris.size === 0) return anchors

  const atUris = [...missingUris].filter(uri => uri.startsWith('at://'))
  const objectUris = [...missingUris].filter(uri => !uri.startsWith('at://'))
  const conditions = []

  if (atUris.length > 0) conditions.push(inArray(unifiedFeedView.atUri, atUris))
  if (objectUris.length > 0) conditions.push(inArray(unifiedFeedView.objectUri, objectUris))
  if (conditions.length === 0) return anchors

  const fetched = await db
    .select()
    .from(unifiedFeedView)
    .where(conditions.length === 1 ? conditions[0] : or(...conditions))

  for (const row of fetched as UnifiedFeedRow[]) {
    if (row.atUri) anchors.set(row.atUri, row)
    if (row.objectUri) anchors.set(row.objectUri, row)
  }

  return anchors
}

async function applyReplyThreadBumps(items: UnifiedFeedRow[], user: { atprotoDid?: string | null; getWebId?: (() => string) | undefined }): Promise<UnifiedFeedRow[]> {
  if (items.length === 0) return items

  const followedAuthors = await resolveFollowedAuthorIds(user)
  if (followedAuthors.size === 0) return items

  const metaById = loadReplyThreadMeta(items)
  if (metaById.size === 0) return items

  const anchorByUri = await loadThreadAnchorRows(items, metaById)
  return applyFollowedReplyThreadBumps(items, followedAuthors, metaById, anchorByUri)
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
  excludeViewed: t.Optional(t.Boolean({ default: false })),
  /** ISO-8601 timestamp — return only posts created after this value (delta sync cursor). */
  since: t.Optional(t.String({ minLength: 10, maxLength: 64 })),
})

const threadQuery = t.Object({
  rootUri: t.String({ minLength: 3, maxLength: 3072 }),
  limit: t.Integer({ default: 20, maximum: 50, minimum: 1 }),
  cursor: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
})

const feedViewedBody = t.Object({
  objectId: t.Optional(t.String({ minLength: 1, maxLength: 2048 })),
  objectIds: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 2048 }), { minItems: 1, maxItems: 100 })),
  viewedAt: t.Optional(t.String({ minLength: 1, maxLength: 64 }))
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
    async ({ query: { limit, offset, source, hashtag, mode, apWeight, atWeight, excludeViewed, since }, user }) => {
      try {
        const moderationState = await safeResolveViewerModerationState(user, 'feed')
        const timelineMode: TimelineMode = mode ?? 'balanced'
        const normalizedApWeight = apWeight ?? 50
        const normalizedAtWeight = atWeight ?? 50
        const fetchLimit = Math.min(500, Math.max(80, offset + limit * 6))

        let query = db
          .select()
          .from(unifiedFeedCandidatesView)
          .orderBy(desc(unifiedFeedCandidatesView.createdAt))
          .limit(fetchLimit)
          .offset(0)

        if (source && source !== 'all') {
          query = query.where(eq(unifiedFeedCandidatesView.source, source)) as typeof query
        }

        if (hashtag && hashtag.trim().length > 0) {
          const normalizedHashtag = normalizeHashtag(hashtag)
          if (normalizedHashtag) {
            const pattern = `%${normalizedHashtag}%`
            query = query.where(
              or(
                ilike(unifiedFeedCandidatesView.content, pattern),
                sql`${unifiedFeedCandidatesView.hashtags} @> ARRAY[${normalizedHashtag}]::text[]`
              )
            ) as typeof query
          }
        }

        if (since) {
          const sinceDate = new Date(since)
          if (!isNaN(sinceDate.getTime())) {
            query = query.where(gt(unifiedFeedCandidatesView.createdAt, sinceDate)) as typeof query
          }
        }

        const bumpedResults = await applyReplyThreadBumps((await query) as UnifiedFeedRow[], user)
        const { visible: results } = filterViewerModeratedRows(bumpedResults, moderationState)

        let output = timelineMode === 'chronological' || source === 'activitypods' || source === 'atproto'
          ? results.slice(offset, offset + limit)
          : buildBalancedFeed(results, limit, offset, normalizedApWeight, normalizedAtWeight)

        if (excludeViewed && isViewershipIntegrationEnabled()) {
          const objectIds = [...new Set(output.map(feedItemObjectId).filter((value): value is string => !!value))]
          if (objectIds.length > 0) {
            try {
              const viewed = await resolveViewedObjectIds(user.getWebId(), objectIds)
              output = output.filter(item => {
                const objectId = feedItemObjectId(item)
                return !objectId || !viewed.has(objectId)
              })
            } catch (error) {
              console.warn('[AT Bridge] Viewership filtering unavailable:', error)
            }
          }
        }

        const metricsByRootUri = await loadViewerThreadMetricsByRootUri(
          output
            .map(getThreadRootUri)
            .filter((value): value is string => !!value),
          moderationState,
        )

        return applyViewerThreadMetrics(output, metricsByRootUri).map(mapFeedItemForResponse)
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

  .get(
    '/thread',
    async ({ query: { rootUri, limit, cursor }, error, user }) => {
      const normalizedRootUri = normalizeThreadUri(rootUri)
      if (!normalizedRootUri) {
        return error(400, 'Invalid rootUri')
      }

      const offset = decodeCursor(cursor)

      try {
        const [rootRow] = await db
          .select()
          .from(unifiedFeedCandidatesView)
          .where(
            or(
              eq(unifiedFeedCandidatesView.atUri, normalizedRootUri),
              eq(unifiedFeedCandidatesView.objectUri, normalizedRootUri),
            ),
          )
          .limit(1)

        const moderationState = await safeResolveViewerModerationState(user, 'thread')

        let window = { page: [] as UnifiedFeedRow[], nextOffset: offset }
        let hasMore = false
        let exhausted = false
        const batchSize = Math.min(100, Math.max(limit * 3, 25))
        const maxScannedRows = Math.min(500, Math.max(limit * 12, 100))

        while (window.page.length < limit + 1 && window.nextOffset - offset < maxScannedRows) {
          const batch = (await db
            .select()
            .from(unifiedFeedCandidatesView)
            .where(
              and(
                or(
                  eq(unifiedFeedCandidatesView.replyRootUri, normalizedRootUri),
                  eq(unifiedFeedCandidatesView.replyParentUri, normalizedRootUri),
                ),
                eq(unifiedFeedCandidatesView.isPublic, true),
              ),
            )
            .orderBy(desc(unifiedFeedCandidatesView.createdAt), desc(unifiedFeedCandidatesView.id))
            .limit(batchSize)
            .offset(window.nextOffset)) as UnifiedFeedRow[]

          if (batch.length === 0) {
            exhausted = true
            break
          }

          window = appendVisibleThreadWindow(window, batch, limit, moderationState)

          if (batch.length < batchSize) {
            exhausted = true
            break
          }
        }

        const finalizedWindow = finalizeVisibleThreadWindow(window.page, window.nextOffset, limit, exhausted)
        hasMore = finalizedWindow.hasMore
        const visiblePage = finalizedWindow.visiblePage
        const nextCursor = finalizedWindow.nextCursorOffset !== null ? encodeCursor(finalizedWindow.nextCursorOffset) : null

        const visibleRoot = rootRow && !isRowHiddenForViewer(rootRow as UnifiedFeedRow, moderationState)
          ? mapFeedItemForResponse(rootRow as UnifiedFeedRow)
          : null

        const metricsByRootUri = await loadViewerThreadMetricsByRootUri([normalizedRootUri], moderationState)
        const threadMetrics = metricsByRootUri.get(normalizedRootUri) ?? buildViewerThreadMetrics([])

        const response: ThreadContextResponse = {
          rootUri: normalizedRootUri,
          root: visibleRoot,
          items: applyViewerThreadMetrics(visiblePage, metricsByRootUri).map(mapFeedItemForResponse),
          nextCursor,
          hasMore,
          replyCount: threadMetrics.replyCount,
          participantCount: threadMetrics.participantCount,
          lastActivityAt: threadMetrics.lastActivityAt,
        }

        return response
      } catch (err) {
        console.error('[AT Bridge] Failed to fetch thread context:', err)
        return error(500, 'Failed to fetch thread context')
      }
    },
    {
      query: threadQuery,
      detail: 'Returns paginated thread context for a root URI',
      isSignedIn: true,
      response: {
        200: t.Object({
          rootUri: t.String(),
          root: t.Union([
            t.Null(),
            t.Object({
              id: t.Number(),
              content: t.String(),
              hashtags: t.Array(t.String()),
              postType: t.String(),
              title: t.Union([t.String(), t.Null()]),
              summary: t.Union([t.String(), t.Null()]),
              canonicalUrl: t.Union([t.String(), t.Null()]),
              createdAt: t.Union([t.Date(), t.Null()]),
              isPublic: t.Boolean(),
              authorId: t.Union([t.Number(), t.Null()]),
              authorName: t.String(),
              authorWebId: t.String(),
              authorProviderEndpoint: t.String(),
              source: t.Union([t.Literal('activitypods'), t.Literal('atproto')]),
              atUri: t.Union([t.String(), t.Null()]),
              objectUri: t.Union([t.String(), t.Null()]),
              replyParentUri: t.Union([t.String(), t.Null()]),
              replyRootUri: t.Union([t.String(), t.Null()]),
              type: t.Union([t.Literal('post'), t.Literal('thread_summary')]),
            }),
          ]),
          items: t.Array(t.Object({
            id: t.Number(),
            content: t.String(),
            hashtags: t.Array(t.String()),
            postType: t.String(),
            title: t.Union([t.String(), t.Null()]),
            summary: t.Union([t.String(), t.Null()]),
            canonicalUrl: t.Union([t.String(), t.Null()]),
            createdAt: t.Union([t.Date(), t.Null()]),
            isPublic: t.Boolean(),
            authorId: t.Union([t.Number(), t.Null()]),
            authorName: t.String(),
            authorWebId: t.String(),
            authorProviderEndpoint: t.String(),
            source: t.Union([t.Literal('activitypods'), t.Literal('atproto')]),
            atUri: t.Union([t.String(), t.Null()]),
            objectUri: t.Union([t.String(), t.Null()]),
            replyParentUri: t.Union([t.String(), t.Null()]),
            replyRootUri: t.Union([t.String(), t.Null()]),
            type: t.Union([t.Literal('post'), t.Literal('thread_summary')]),
          })),
          nextCursor: t.Union([t.String(), t.Null()]),
          hasMore: t.Boolean(),
          replyCount: t.Number(),
          participantCount: t.Number(),
          lastActivityAt: t.Union([t.Date(), t.Null()]),
        }),
        400: t.String(),
        500: t.String(),
      },
    },
  )

  .post(
    '/moderation/author',
    async ({ body, user, error }) => {
      const subject = deriveModerationSubject(body)
      if (!subject) {
        return error(400, 'Unable to determine moderation subject')
      }

      try {
        await createViewerModerationDecision(user, body.action, subject)
        return {
          ok: true,
          action: body.action,
          subjectCanonicalId: subject.subjectCanonicalId,
          subjectProtocol: subject.subjectProtocol,
        }
      } catch (err) {
        console.error('[AT Bridge] Failed to create viewer moderation decision:', err)
        return error(502, 'Failed to create viewer moderation decision')
      }
    },
    {
      body: t.Object({
        action: t.Union([t.Literal('block'), t.Literal('mute')]),
        source: t.Union([t.Literal('activitypods'), t.Literal('atproto')]),
        authorWebId: t.String({ minLength: 1, maxLength: 2048 }),
        atUri: t.Optional(t.Union([t.String({ minLength: 1, maxLength: 3072 }), t.Null()])),
      }),
      detail: 'Create a viewer-specific block or mute for a feed author',
      isSignedIn: true,
      response: {
        200: t.Object({
          ok: t.Boolean(),
          action: t.Union([t.Literal('block'), t.Literal('mute')]),
          subjectCanonicalId: t.String(),
          subjectProtocol: t.String(),
        }),
        400: t.String(),
        502: t.String(),
      },
    },
  )

  .post(
    '/feed/viewed',
    async ({ body, user, error }) => {
      const objectIds = [...new Set([body.objectId, ...(body.objectIds ?? [])].filter((value): value is string => !!value && value.trim().length > 0))]
      if (objectIds.length === 0) {
        return error(400, 'objectId or objectIds is required')
      }

      try {
        await recordViewedObjectIds(user.getWebId(), objectIds, body.viewedAt)
        return { ok: true, recorded: objectIds.length }
      } catch (err) {
        console.error('[AT Bridge] Failed to record viewed feed objects:', err)
        return error(502, 'Failed to record viewed feed objects')
      }
    },
    {
      body: feedViewedBody,
      detail: 'Record viewed objects for the signed-in user',
      isSignedIn: true,
      response: {
        200: t.Object({
          ok: t.Boolean(),
          recorded: t.Number(),
        }),
        400: t.String(),
        502: t.String(),
      },
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
          const normalizedHashtag = normalizeHashtag(hashtag)
          if (normalizedHashtag) {
            const pattern = `%${normalizedHashtag}%`
            conditions.push(
              or(
                ilike(atPosts.content, pattern),
                sql`EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(COALESCE(${atPosts.facets}, '[]'::jsonb)) facet,
                       jsonb_array_elements(COALESCE(facet->'features', '[]'::jsonb)) feature
                  WHERE feature ? 'tag' AND '#' || lower(trim(feature->>'tag')) = ${normalizedHashtag}
                )`
              ) as any
            )
          }
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
