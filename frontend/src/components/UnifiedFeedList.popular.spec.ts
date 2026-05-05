import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import UnifiedFeedList from './UnifiedFeedList.vue'
import type { UnifiedFeedItem, FeedSource, TimelineMode } from '@/stores/atBridgeStore'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockRouterPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'feed.popular.heading': 'Popular in this feed',
        'feed.popular.subtitle': 'Ranked by replies, reposts, quotes, and likes.',
      }
      return map[key] ?? key
    },
  }),
}))

const storeMock: {
  unifiedFeed: UnifiedFeedItem[]
  isLoading: boolean
  error: string | null
  feedSource: FeedSource
  timelineMode: TimelineMode
  hashtagFilter: string
  fetchUnifiedFeed: ReturnType<typeof vi.fn>
  setFeedSource: ReturnType<typeof vi.fn>
  setTimelineMode: ReturnType<typeof vi.fn>
  setHashtagFilter: ReturnType<typeof vi.fn>
  clearHashtagFilter: ReturnType<typeof vi.fn>
  toggleRepost: ReturnType<typeof vi.fn>
} = {
  unifiedFeed: [],
  isLoading: false,
  error: null,
  feedSource: 'all',
  timelineMode: 'balanced',
  hashtagFilter: '',
  fetchUnifiedFeed: vi.fn(async () => undefined),
  setFeedSource: vi.fn(),
  setTimelineMode: vi.fn(),
  setHashtagFilter: vi.fn(async () => undefined),
  clearHashtagFilter: vi.fn(async () => undefined),
  toggleRepost: vi.fn(async () => true),
}

vi.mock('@/stores/atBridgeStore', () => ({
  useAtBridgeStore: () => storeMock,
}))

function buildItem(overrides: Partial<UnifiedFeedItem>): UnifiedFeedItem {
  return {
    id: 1,
    content: 'Post content',
    postType: 'note',
    createdAt: '2026-04-20T10:00:00.000Z',
    isPublic: true,
    authorId: 1,
    authorName: 'Author',
    authorWebId: 'https://pods.example/users/author',
    authorProviderEndpoint: 'https://pods.example',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/posts/1',
    type: 'post',
    ...overrides,
  }
}

describe('UnifiedFeedList popular carousel', () => {
  beforeEach(() => {
    storeMock.unifiedFeed = []
    storeMock.isLoading = false
    storeMock.error = null
    storeMock.feedSource = 'all'
    storeMock.timelineMode = 'balanced'
    storeMock.hashtagFilter = ''
    storeMock.fetchUnifiedFeed.mockClear()
    storeMock.toggleRepost.mockClear()
    mockRouterPush.mockClear()
  })

  const mountList = () =>
    mount(UnifiedFeedList, {
      global: {
        stubs: {
          'box-icon': true,
          UnifiedFeedItem: {
            props: ['item'],
            template: '<div class="feed-item">{{ item.authorName }}</div>',
          },
        },
      },
    })

  it('ranks items using replies, reposts, quotes, and likes', async () => {
    storeMock.unifiedFeed = [
      buildItem({
        id: 10,
        authorName: 'Most Engaged',
        source: 'atproto',
        atUri: 'at://did:plc:one/app.bsky.feed.post/1',
        objectUri: null,
        threadReplyCount: 3,
        repostCount: 2,
        quoteCount: 1,
        likeCount: 10,
      }),
      buildItem({
        id: 11,
        authorName: 'Mid Engaged',
        threadReplyCount: 1,
        repostCount: 1,
        quoteCount: 1,
        likeCount: 1,
      }),
      buildItem({
        id: 12,
        authorName: 'Light Engaged',
        threadReplyCount: 0,
        repostCount: 1,
        quoteCount: 0,
        likeCount: 1,
      }),
    ]

    const wrapper = mountList()

    await vi.waitFor(() => {
      expect(storeMock.fetchUnifiedFeed).toHaveBeenCalledTimes(1)
    })

    expect(wrapper.text()).toContain('Popular in this feed')
    const cards = wrapper.findAll('article')
    expect(cards).toHaveLength(3)
    expect(cards[0]?.text()).toContain('Most Engaged')
  })

  it('applies to any currently active feed scope', async () => {
    storeMock.feedSource = 'activitypods'
    storeMock.unifiedFeed = [
      buildItem({ id: 21, authorName: 'Feed A', threadReplyCount: 2, repostCount: 0, likeCount: 0, quoteCount: 0 }),
      buildItem({ id: 22, authorName: 'Feed B', threadReplyCount: 1, repostCount: 1, likeCount: 0, quoteCount: 0 }),
      buildItem({ id: 23, authorName: 'Feed C', threadReplyCount: 0, repostCount: 1, likeCount: 1, quoteCount: 0 }),
    ]

    const wrapper = mountList()

    await vi.waitFor(() => {
      expect(storeMock.fetchUnifiedFeed).toHaveBeenCalledTimes(1)
    })

    expect(wrapper.text()).toContain('Popular in this feed')
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('navigates to the thread view when a carousel card is clicked', async () => {
    storeMock.unifiedFeed = [
      buildItem({
        id: 30,
        authorName: 'Clickable',
        source: 'atproto',
        atUri: 'at://did:plc:nav/app.bsky.feed.post/click1',
        objectUri: null,
        threadReplyCount: 5,
        repostCount: 3,
        likeCount: 2,
        quoteCount: 0,
      }),
      buildItem({ id: 31, authorName: 'Second', threadReplyCount: 1, repostCount: 0, likeCount: 1, quoteCount: 0 }),
      buildItem({ id: 32, authorName: 'Third', threadReplyCount: 1, repostCount: 0, likeCount: 1, quoteCount: 0 }),
    ]

    const wrapper = mountList()

    await vi.waitFor(() => {
      expect(storeMock.fetchUnifiedFeed).toHaveBeenCalledTimes(1)
    })

    const cards = wrapper.findAll('article')
    expect(cards.length).toBeGreaterThan(0)
    await cards[0]!.trigger('click')

    expect(mockRouterPush).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'thread',
      params: { id: 'at://did:plc:nav/app.bsky.feed.post/click1' },
    })
  })

  it('excludes items with no resolvable URI from the carousel', async () => {
    storeMock.unifiedFeed = [
      // This item has no atUri and no objectUri — must be excluded
      buildItem({ id: 40, authorName: 'No URI', atUri: null, objectUri: null, threadReplyCount: 99, likeCount: 99 }),
      // These three have valid objectUri and should appear
      buildItem({ id: 41, authorName: 'Has URI A', objectUri: 'https://p.example/1', threadReplyCount: 2, likeCount: 1 }),
      buildItem({ id: 42, authorName: 'Has URI B', objectUri: 'https://p.example/2', threadReplyCount: 1, likeCount: 1 }),
      buildItem({ id: 43, authorName: 'Has URI C', objectUri: 'https://p.example/3', threadReplyCount: 1, likeCount: 0, repostCount: 1 }),
    ]

    const wrapper = mountList()

    await vi.waitFor(() => {
      expect(storeMock.fetchUnifiedFeed).toHaveBeenCalledTimes(1)
    })

    const cards = wrapper.findAll('article')
    // Only the 3 items with valid URIs should appear in the carousel
    expect(cards).toHaveLength(3)
    const cardAuthors = cards.map(c => c.text())
    expect(cardAuthors.some(t => t.includes('No URI'))).toBe(false)
    expect(cardAuthors.some(t => t.includes('Has URI A'))).toBe(true)
  })
})
