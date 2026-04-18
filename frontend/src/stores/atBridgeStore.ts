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
  }
}

export interface UnifiedFeedItem {
  id: number
  content: string
  createdAt: string | null
  isPublic: boolean
  authorId: number | null
  authorName: string
  authorWebId: string
  authorProviderEndpoint: string
  source: 'activitypods' | 'atproto'
  atUri: string | null
  objectUri: string | null
  quotedPost?: QuotedPost
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

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: getHeaders(options?.headers),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`API error ${response.status}: ${text}`)
    }

    return response.json() as Promise<T>
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

      const items = await apiFetch<UnifiedFeedItem[]>(
        `/at/feed?limit=${PAGE_SIZE}&offset=${offset}${sourceParam}${hashtagParam}${modeParam}${weightsParam}`,
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
    unifiedFeedOffset.value = 0
    atPostsOffset.value = 0
    atRecordsOffset.value = 0
  }

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

    // Computed
    hasAtContent,
    isFirehoseConnected,

    // Actions
    fetchUnifiedFeed,
    fetchAtPosts,
    fetchAtRecords,
    fetchFirehoseStatus,
    subscribeToSource,
    setFeedSource,
    setTimelineMode,
    setProtocolWeights,
    setHashtagFilter,
    clearHashtagFilter,
    reset,
  }
})
