/**
 * AT Protocol Bridge — Frontend Pinia Store
 *
 * Manages AT Protocol federated content state in the memory UI.
 *
 * State:
 *   - atPosts: AT Protocol posts from the federated firehose
 *   - unifiedFeed: Combined AT + ActivityPods posts
 *   - firehoseStatus: Ingestion health per source relay
 *   - feedSource: Active filter ('all' | 'activitypods' | 'atproto')
 *
 * Design principles:
 *   - Mirrors the postsStore API for drop-in composability.
 *   - Errors are handled gracefully and surfaced to the UI.
 *   - Pagination is supported for all feed types.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from './authStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AtPost {
  id: number
  authorDid: string
  rkey: string
  atUri: string
  cid: string | null
  content: string
  isPublic: boolean
  facets: unknown | null
  embeds: unknown | null
  replyParentUri: string | null
  createdAt: string | null
  ingestedAt: string | null
  sourceRelay: string | null
  authorHandle: string | null
}

export interface QuotedPost {
  id: number
  authorName: string
  authorWebId: string
  authorProviderEndpoint: string
  content: string
  createdAt: string | null
  source: 'activitypods' | 'atproto'
  media?: Array<{
    type?: 'image' | 'gif' | 'video' | 'audio' | string
    url: string
    alt?: string
    attribution?: string
    poster?: string
    filename?: string
    duration?: number
  }>
  linkPreview?: {
    url: string
    title: string
    description?: string
    image?: string
    domain?: string
    authorName?: string
    authorUrl?: string
    authors?: Array<{
      name: string
      url: string
      handle?: string
      verified?: boolean
      verificationState?: 'verified' | 'claimed'
      verificationReason?: string
      account?: {
        acct: string
        uri?: string
        url?: string
        displayName?: string
        avatarUrl?: string
        attributionDomains?: string[]
      } | null
    }>
  }
}

/** FEP-9967: poll option as returned by the API. */
export interface FeedPollOption {
  name: string
  voteCount: number
}

/** FEP-9967: poll data attached to a Question item in the unified feed. */
export interface FeedPoll {
  /** 'oneOf' = single choice, 'anyOf' = multiple choice. */
  mode: 'oneOf' | 'anyOf'
  options: FeedPollOption[]
  /** ISO 8601 end time; absent = no expiry. */
  endTime?: string | null
  /** Total unique voters (Mastodon extension). */
  votersCount?: number | null
  /** Whether the current user has already voted. */
  voted?: boolean
  /** Option name(s) the current user voted for (if voted). */
  votedOptions?: string[]
}

export interface RepostActor {
  actorId: string
  displayName: string
  sourceProtocol: 'activitypub' | 'atproto' | 'canonical'
  boostedAt: string
  repostUri: string
}

export interface RepostGroup {
  subjectUri: string
  count: number
  boostedAt: string
  actors: RepostActor[]
  actorLimitExceeded: boolean
  viewerHasReposted: boolean
}

export interface UnifiedFeedItem {
  id: number
  content: string
  postType: 'note' | 'article'
  title?: string | null
  summary?: string | null
  canonicalUrl?: string | null
  createdAt: string | null
  isPublic: boolean
  authorId: number | null
  authorName: string
  authorWebId: string
  authorProviderEndpoint: string
  source: 'activitypods' | 'atproto'
  atUri: string | null
  objectUri: string | null
  replyParentUri?: string | null
  replyRootUri?: string | null
  type?: 'post' | 'thread_summary'
  threadReplyCount?: number | null
  threadParticipantCount?: number | null
  threadLastActivityAt?: string | null
  threadParentAuthorId?: string | null
  threadRootAuthorId?: string | null
  repostGroup?: RepostGroup | null
  repostCount?: number | null
  viewerHasReposted?: boolean
  likeCount?: number | null
  quoteCount?: number | null
  quotedPost?: QuotedPost
  linkPreview?: QuotedPost['linkPreview']
  /** Present when this feed item is a poll (FEP-9967 Question object). */
  poll?: FeedPoll | null
}

export interface ThreadContextResponse {
  rootUri: string
  root: UnifiedFeedItem | null
  items: UnifiedFeedItem[]
  nextCursor: string | null
  hasMore: boolean
  replyCount: number
  participantCount: number
  lastActivityAt: string | null
}

type ViewerModerationAction = 'block' | 'mute'

interface ViewerModerationResponse {
  ok: boolean
  action: ViewerModerationAction
  subjectCanonicalId: string
  subjectProtocol: string
}

interface RepostResponse {
  ok: boolean
  subjectUri: string
  repostUri: string
  reposted: boolean
  nativeAnnounced?: boolean
}

export interface FirehoseStatus {
  sourceId: string
  sourceType: string
  committedSeq: number | null
  hotSeq: number | null
  isConnected: boolean
  lastEventAt: string | null
}

export type FeedSource = 'all' | 'activitypods' | 'atproto'
export type TimelineMode = 'balanced' | 'chronological'

export interface AtRecordSummary {
  title: string | null
  text: string | null
  subjectUri: string | null
  replyParentUri: string | null
  replyRootUri: string | null
  tags: string[]
  languages: string[]
  hasMedia: boolean
}

export interface AtRecord {
  id: number
  authorDid: string
  collection: string
  lexiconFamily: 'bsky' | 'standard.site' | 'other'
  recordType: string
  rkey: string
  atUri: string
  cid: string | null
  operation: string
  isActive: boolean
  createdAt: string | null
  ingestedAt: string | null
  sourceRelay: string | null
  firehoseSeq: number | null
  summary: AtRecordSummary
  record?: Record<string, unknown> | null
}

interface ProtocolWeights {
  activitypods: number
  atproto: number
}

interface ThreadCacheEntry {
  value: ThreadContextResponse
  cachedAt: number
}

const API_TIMEOUT_MS = 30000
const API_MAX_RETRIES = 2
const API_RETRY_BASE_MS = 180
const THREAD_CACHE_TTL_MS = 60_000
const THREAD_CACHE_STORAGE_KEY = 'memory.threadContextCache.v1'

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAtBridgeStore = defineStore('atBridge', () => {
  const authStore = useAuthStore()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const atPosts = ref<AtPost[]>([])
  const atRecords = ref<AtRecord[]>([])
  const unifiedFeed = ref<UnifiedFeedItem[]>([])
  const firehoseStatus = ref<{
    sources: FirehoseStatus[]
    stats: { totalAtPosts: number; totalAtIdentities: number; totalAtRecords: number }
  }>({ sources: [], stats: { totalAtPosts: 0, totalAtIdentities: 0, totalAtRecords: 0 } })

  const feedSource = ref<FeedSource>('all')
  const timelineMode = ref<TimelineMode>('balanced')
  const protocolWeights = ref<ProtocolWeights>({ activitypods: 50, atproto: 50 })
  const hashtagFilter = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const threadContextCache = ref<Record<string, ThreadCacheEntry>>({})
  const moderationRevision = ref(0)

  // Pagination
  const unifiedFeedOffset = ref(0)
  const atPostsOffset = ref(0)
  const atRecordsOffset = ref(0)
  const PAGE_SIZE = 20

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------

  const hasAtContent = computed(() => atPosts.value.length > 0)
  const isFirehoseConnected = computed(() =>
    firehoseStatus.value.sources.some(s => s.isConnected),
  )

  // -------------------------------------------------------------------------
  // API helpers
  // -------------------------------------------------------------------------

  function getApiBase(): string {
    return getApiBaseUrl()
  }

  function getHeaders(headers?: HeadersInit): HeadersInit {
    return buildApiHeaders({
      authToken: authStore.token || undefined,
      includeJsonContentType: true,
      headers
    })
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  function getThreadCacheKey(rootUri: string, limit: number, cursor?: string): string {
    return `${rootUri}::${limit}::${cursor ?? 'first'}`
  }

  function writeThreadCacheToStorage(): void {
    try {
      sessionStorage.setItem(THREAD_CACHE_STORAGE_KEY, JSON.stringify(threadContextCache.value))
    } catch {
      // Ignore storage failures and keep runtime cache only.
    }
  }

  function loadThreadCacheFromStorage(): void {
    try {
      const raw = sessionStorage.getItem(THREAD_CACHE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, ThreadCacheEntry>
      if (parsed && typeof parsed === 'object') {
        threadContextCache.value = parsed
      }
    } catch {
      // Ignore invalid or unavailable storage data.
    }
  }

  function getCachedThreadContext(rootUri: string, limit: number, cursor?: string): ThreadContextResponse | null {
    const key = getThreadCacheKey(rootUri, limit, cursor)
    const entry = threadContextCache.value[key]
    if (!entry) return null
    if (Date.now() - entry.cachedAt > THREAD_CACHE_TTL_MS) {
      delete threadContextCache.value[key]
      writeThreadCacheToStorage()
      return null
    }
    return entry.value
  }

  function setCachedThreadContext(rootUri: string, limit: number, cursor: string | undefined, value: ThreadContextResponse): void {
    const key = getThreadCacheKey(rootUri, limit, cursor)
    threadContextCache.value[key] = { value, cachedAt: Date.now() }
    writeThreadCacheToStorage()
  }

  function clearThreadCache(): void {
    threadContextCache.value = {}
    try {
      sessionStorage.removeItem(THREAD_CACHE_STORAGE_KEY)
    } catch {
      // Ignore storage failures.
    }
  }

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    let lastError: unknown = null

    for (let attempt = 0; attempt <= API_MAX_RETRIES; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

      try {
        const response = await fetch(`${getApiBase()}${path}`, {
          ...options,
          signal: controller.signal,
          headers: getHeaders(options?.headers),
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const text = await response.text().catch(() => 'Unknown error')
          const shouldRetry = response.status >= 500 && attempt < API_MAX_RETRIES
          if (shouldRetry) {
            const jitter = Math.floor(Math.random() * 60)
            await sleep(API_RETRY_BASE_MS * (2 ** attempt) + jitter)
            continue
          }
          throw new Error(`API error ${response.status}: ${text}`)
        }

        return response.json() as Promise<T>
      } catch (err) {
        clearTimeout(timeout)
        lastError = err
        if (attempt >= API_MAX_RETRIES) {
          break
        }
        const jitter = Math.floor(Math.random() * 60)
        await sleep(API_RETRY_BASE_MS * (2 ** attempt) + jitter)
      }
    }

    throw (lastError instanceof Error ? lastError : new Error('Request failed'))
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Fetch the unified feed (AT + ActivityPods).
   * Appends to existing items for infinite scroll.
   */
  async function fetchUnifiedFeed(append = false): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const offset = append ? unifiedFeedOffset.value : 0
      const sourceParam = feedSource.value !== 'all' ? `&source=${feedSource.value}` : ''
      const hashtagParam = hashtagFilter.value ? `&hashtag=${encodeURIComponent(hashtagFilter.value)}` : ''
      const modeParam = `&mode=${timelineMode.value}`
      const weightsParam = `&apWeight=${protocolWeights.value.activitypods}&atWeight=${protocolWeights.value.atproto}`
      const viewershipParam = '&excludeViewed=true'

      const items = await apiFetch<UnifiedFeedItem[]>(
        `/at/feed?limit=${PAGE_SIZE}&offset=${offset}${sourceParam}${hashtagParam}${modeParam}${weightsParam}${viewershipParam}`,
      )

      if (append) {
        unifiedFeed.value.push(...items)
      } else {
        unifiedFeed.value = items
        unifiedFeedOffset.value = 0
      }

      unifiedFeedOffset.value = offset + items.length
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch unified feed'
      console.error('[AtBridgeStore] fetchUnifiedFeed error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch AT Protocol posts only.
   */
  async function fetchAtPosts(append = false): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const offset = append ? atPostsOffset.value : 0
      const posts = await apiFetch<AtPost[]>(
        `/at/posts?limit=${PAGE_SIZE}&offset=${offset}`,
      )

      if (append) {
        atPosts.value.push(...posts)
      } else {
        atPosts.value = posts
        atPostsOffset.value = 0
      }

      atPostsOffset.value = offset + posts.length
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch AT posts'
      console.error('[AtBridgeStore] fetchAtPosts error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch supported lexicon records (Bluesky + standard.site).
   */
  async function fetchAtRecords(
    append = false,
    params?: {
      collection?: string
      did?: string
      family?: 'all' | 'bsky' | 'standard.site'
      recordType?: string
      search?: string
      includeRaw?: boolean
    },
  ): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const offset = append ? atRecordsOffset.value : 0
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      if (params?.collection) query.set('collection', params.collection)
      if (params?.did) query.set('did', params.did)
      if (params?.family) query.set('family', params.family)
      if (params?.recordType) query.set('recordType', params.recordType)
      if (params?.search) query.set('search', params.search)
      if (typeof params?.includeRaw === 'boolean') query.set('includeRaw', String(params.includeRaw))

      const records = await apiFetch<AtRecord[]>(`/at/records?${query.toString()}`)

      if (append) {
        atRecords.value.push(...records)
      } else {
        atRecords.value = records
        atRecordsOffset.value = 0
      }

      atRecordsOffset.value = offset + records.length
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch AT records'
      console.error('[AtBridgeStore] fetchAtRecords error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch firehose ingestion health status.
   */
  async function fetchFirehoseStatus(): Promise<void> {
    try {
      const status = await apiFetch<typeof firehoseStatus.value>('/at/status')
      firehoseStatus.value = status
    } catch (err) {
      console.error('[AtBridgeStore] fetchFirehoseStatus error:', err)
    }
  }

  /**
   * Fetch paginated thread context using cache-first semantics.
   */
  async function fetchThreadContext(
    rootUri: string,
    options?: { limit?: number; cursor?: string; forceRefresh?: boolean },
  ): Promise<ThreadContextResponse | null> {
    const normalizedRootUri = rootUri.trim()
    if (!normalizedRootUri) return null

    const limit = Math.min(50, Math.max(1, options?.limit ?? PAGE_SIZE))
    const cursor = options?.cursor
    const forceRefresh = options?.forceRefresh === true

    if (!forceRefresh) {
      const cached = getCachedThreadContext(normalizedRootUri, limit, cursor)
      if (cached) return cached
    }

    try {
      const query = new URLSearchParams({
        rootUri: normalizedRootUri,
        limit: String(limit),
      })
      if (cursor) query.set('cursor', cursor)

      const payload = await apiFetch<ThreadContextResponse>(`/at/thread?${query.toString()}`)
      setCachedThreadContext(normalizedRootUri, limit, cursor, payload)
      return payload
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch thread context'
      console.error('[AtBridgeStore] fetchThreadContext error:', err)
      const cached = getCachedThreadContext(normalizedRootUri, limit, cursor)
      return cached
    }
  }

  async function moderateAuthor(item: UnifiedFeedItem, action: ViewerModerationAction): Promise<boolean> {
    try {
      await apiFetch<ViewerModerationResponse>('/at/moderation/author', {
        method: 'POST',
        body: JSON.stringify({
          action,
          source: item.source,
          authorWebId: item.authorWebId,
          atUri: item.atUri,
        }),
      })

      clearThreadCache()
      moderationRevision.value += 1
      await fetchUnifiedFeed(false)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : `Failed to ${action} author`
      console.error(`[AtBridgeStore] moderateAuthor(${action}) error:`, err)
      return false
    }
  }

  function getRepostTarget(item: UnifiedFeedItem): { atUri?: string; objectUri?: string } | null {
    if (item.atUri) return { atUri: item.atUri }
    if (item.objectUri) return { objectUri: item.objectUri }
    return null
  }

  function viewerDisplayName(): string {
    const currentUser = authStore.user
    return currentUser?.name || currentUser?.webId || 'You'
  }

  function viewerActorId(): string {
    const currentUser = authStore.user
    return currentUser?.atprotoDid || currentUser?.webId || 'viewer'
  }

  function applyLocalRepostState(item: UnifiedFeedItem, response: RepostResponse): void {
    const index = unifiedFeed.value.findIndex(candidate =>
      (item.atUri && candidate.atUri === item.atUri)
      || (item.objectUri && candidate.objectUri === item.objectUri)
      || candidate.id === item.id,
    )
    if (index < 0) return

    const current = unifiedFeed.value[index]
    const currentGroup = current.repostGroup
    const existingActors = currentGroup?.actors ?? []
    const actorId = viewerActorId()

    if (!response.reposted) {
      const actors = existingActors.filter(actor => actor.actorId !== actorId)
      const nextCount = Math.max(0, (currentGroup?.count ?? current.repostCount ?? 1) - 1)
      unifiedFeed.value[index] = {
        ...current,
        repostGroup: currentGroup
          ? {
              ...currentGroup,
              count: nextCount,
              actors,
              viewerHasReposted: false,
              actorLimitExceeded: nextCount > actors.length,
            }
          : null,
        repostCount: nextCount,
        viewerHasReposted: false,
      }
      return
    }

    const viewerActor: RepostActor = {
      actorId,
      displayName: viewerDisplayName(),
      sourceProtocol: current.source === 'atproto' ? 'atproto' : 'activitypub',
      boostedAt: new Date().toISOString(),
      repostUri: response.repostUri,
    }
    const actors = [viewerActor, ...existingActors.filter(actor => actor.actorId !== actorId)].slice(0, 3)
    const nextCount = currentGroup?.viewerHasReposted
      ? currentGroup.count
      : (currentGroup?.count ?? current.repostCount ?? 0) + 1

    unifiedFeed.value[index] = {
      ...current,
      repostGroup: {
        subjectUri: response.subjectUri,
        count: nextCount,
        boostedAt: viewerActor.boostedAt,
        actors,
        actorLimitExceeded: nextCount > actors.length,
        viewerHasReposted: true,
      },
      repostCount: nextCount,
      viewerHasReposted: true,
    }
  }

  async function toggleRepost(item: UnifiedFeedItem): Promise<boolean> {
    const target = getRepostTarget(item)
    if (!target) {
      error.value = 'This item cannot be reposted yet'
      return false
    }

    const isReposted = item.viewerHasReposted || item.repostGroup?.viewerHasReposted
    const path = isReposted ? '/at/reposts/remove' : '/at/reposts'

    try {
      const response = await apiFetch<RepostResponse>(path, {
        method: 'POST',
        body: JSON.stringify(target),
      })
      applyLocalRepostState(item, response)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to update repost'
      console.error('[AtBridgeStore] toggleRepost error:', err)
      return false
    }
  }

  /**
   * Subscribe to a new AT firehose source.
   */
  async function subscribeToSource(
    sourceId: string,
    url: string,
    sourceType: 'relay' | 'pds' = 'relay',
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await apiFetch<{ success: boolean; message: string; sourceId: string }>(
        '/at/subscribe',
        {
          method: 'POST',
          body: JSON.stringify({ sourceId, url, sourceType }),
        },
      )
      await fetchFirehoseStatus()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe to source'
      console.error('[AtBridgeStore] subscribeToSource error:', err)
      return { success: false, message }
    }
  }

  /**
   * Set the active feed source filter and refresh the unified feed.
   */
  async function setFeedSource(source: FeedSource): Promise<void> {
    feedSource.value = source
    await fetchUnifiedFeed(false)
  }

  async function setTimelineMode(mode: TimelineMode): Promise<void> {
    timelineMode.value = mode
    await fetchUnifiedFeed(false)
  }

  async function setProtocolWeights(activitypods: number, atproto: number): Promise<void> {
    const ap = Math.min(99, Math.max(1, Math.round(activitypods)))
    const at = Math.min(99, Math.max(1, Math.round(atproto)))
    protocolWeights.value = { activitypods: ap, atproto: at }
    await fetchUnifiedFeed(false)
  }

  async function setHashtagFilter(hashtag: string): Promise<void> {
    hashtagFilter.value = hashtag
    await fetchUnifiedFeed(false)
  }

  async function clearHashtagFilter(): Promise<void> {
    if (!hashtagFilter.value) return
    hashtagFilter.value = ''
    await fetchUnifiedFeed(false)
  }

  /**
   * Reset all state (e.g. on logout).
   */
  function reset(): void {
    atPosts.value = []
    atRecords.value = []
    unifiedFeed.value = []
    firehoseStatus.value = { sources: [], stats: { totalAtPosts: 0, totalAtIdentities: 0, totalAtRecords: 0 } }
    feedSource.value = 'all'
    timelineMode.value = 'balanced'
    protocolWeights.value = { activitypods: 50, atproto: 50 }
    hashtagFilter.value = ''
    error.value = null
    clearThreadCache()
    moderationRevision.value = 0
    unifiedFeedOffset.value = 0
    atPostsOffset.value = 0
    atRecordsOffset.value = 0
  }

  loadThreadCacheFromStorage()

  return {
    // State
    atPosts,
    atRecords,
    unifiedFeed,
    firehoseStatus,
    feedSource,
    timelineMode,
    protocolWeights,
    hashtagFilter,
    isLoading,
    error,
    threadContextCache,
    moderationRevision,

    // Computed
    hasAtContent,
    isFirehoseConnected,

    // Actions
    fetchUnifiedFeed,
    fetchAtPosts,
    fetchAtRecords,
    fetchFirehoseStatus,
    fetchThreadContext,
    moderateAuthor,
    toggleRepost,
    subscribeToSource,
    setFeedSource,
    setTimelineMode,
    setProtocolWeights,
    setHashtagFilter,
    clearHashtagFilter,
    reset,
  }
})
