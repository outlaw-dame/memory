/**
 * useFeedInteractions Composable Tests
 * 
 * Comprehensive tests for feed interaction state management with:
 * - Edge cases
 * - Error handling
 * - State validation
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'
import { useFeedInteractions } from '../useFeedInteractions'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'

// Mock i18n
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) => {
      // Return a string that includes the key and params for testing
      if (params) {
        return `${key} ${Object.values(params).join(' ')}`
      }
      return key
    },
    locale: ref('en')
  })
}))

// Mock composables
vi.mock('@/composables/useFollow', () => ({
  useFollow: () => ({
    follow: vi.fn().mockResolvedValue(true),
    isFollowing: vi.fn().mockReturnValue(false)
  })
}))

vi.mock('@/composables/useReply', () => ({
  useReply: () => ({
    resolvePolicy: vi.fn().mockResolvedValue({ mayReply: true, policyLabel: 'Test Policy' }),
    submitReply: vi.fn().mockResolvedValue({ success: true }),
    replyError: ref<string | null>(null),
    isResolving: ref(false),
    isSubmitting: ref(false)
  })
}))

// Mock store
const mockItem: UnifiedFeedItem = {
  id: 1,
  content: 'Test content',
  postType: 'note',
  isPublic: true,
  authorId: 1,
  authorName: 'Test Author',
  authorWebId: 'test-webid',
  authorProviderEndpoint: 'https://test.com',
  source: 'activitypods',
  atUri: null,
  objectUri: 'test-uri',
  createdAt: '2024-01-01T00:00:00Z',
  type: 'post',
  viewerHasReposted: false,
  repostCount: 0
}

// Helper to create config
function createConfig(item: UnifiedFeedItem = mockItem) {
  return {
    item,
    emit: {
      hashtagClick: vi.fn(),
      repostToggle: vi.fn()
    }
  }
}

describe('useFeedInteractions', () => {
  let config: { item: UnifiedFeedItem; emit: { hashtagClick: (hashtag: string) => void; repostToggle: (item: UnifiedFeedItem) => void } }

  beforeEach(() => {
    config = {
      item: mockItem,
      emit: {
        hashtagClick: vi.fn(),
        repostToggle: vi.fn()
      }
    }
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const result = useFeedInteractions(config)
      
      expect(result.isReplying.value).toBe(false)
      expect(result.isMoreActionsOpen.value).toBe(false)
      expect(result.isRepostProcessing.value).toBe(false)
      expect(result.replyPolicy.value).toBeNull()
      expect(result.replyError.value).toBeNull()
    })

    it('should handle item with repostGroup', () => {
      const itemWithRepost = {
        ...mockItem,
        repostCount: null, // Ensure repostGroup is used
        repostGroup: {
          count: 3,
          actors: [
            { displayName: 'User1', actorId: '1', sourceProtocol: 'activitypub', boostedAt: '2024-01-01', repostUri: 'uri1' },
            { displayName: 'User2', actorId: '2', sourceProtocol: 'activitypub', boostedAt: '2024-01-02', repostUri: 'uri2' },
            { displayName: 'User3', actorId: '3', sourceProtocol: 'activitypub', boostedAt: '2024-01-03', repostUri: 'uri3' }
          ],
          viewerHasReposted: false
        }
      }
      
      const result = useFeedInteractions(createConfig(itemWithRepost))
      expect(result.repostCount.value).toBe(3)
      expect(result.viewerHasReposted.value).toBe(false)
    })

    it('should handle viewerHasReposted from item', () => {
      const itemWithViewersRepost = {
        ...mockItem,
        viewerHasReposted: true
      }
      
      const result = useFeedInteractions(createConfig(itemWithViewersRepost))
      expect(result.viewerHasReposted.value).toBe(true)
    })
  })

  describe('repostSummary computation', () => {
    it('should return null when no repostGroup', () => {
      const result = useFeedInteractions(config)
      expect(result.repostSummary.value).toBeNull()
    })

    it('should return one-person summary', () => {
      const itemWithOneRepost = {
        ...mockItem,
        repostGroup: {
          count: 1,
          actors: [{ displayName: 'SingleUser', actorId: '1', sourceProtocol: 'activitypub', boostedAt: '2024-01-01', repostUri: 'uri1' }],
          viewerHasReposted: false
        }
      }
      
      const result = useFeedInteractions(createConfig(itemWithOneRepost))
      expect(result.repostSummary.value).toContain('SingleUser')
    })

    it('should return two-person summary', () => {
      const itemWithTwoReposts = {
        ...mockItem,
        repostGroup: {
          count: 2,
          actors: [
            { displayName: 'User1', actorId: '1', sourceProtocol: 'activitypub', boostedAt: '2024-01-01', repostUri: 'uri1' },
            { displayName: 'User2', actorId: '2', sourceProtocol: 'activitypub', boostedAt: '2024-01-02', repostUri: 'uri2' }
          ],
          viewerHasReposted: false
        }
      }
      
      const result = useFeedInteractions(createConfig(itemWithTwoReposts))
      expect(result.repostSummary.value).toContain('User1')
      expect(result.repostSummary.value).toContain('User2')
    })

    it('should return many-person summary with truncation', () => {
      const manyActors = Array.from({ length: 10 }, (_, i) => ({
        displayName: `User${i}`,
        actorId: String(i),
        sourceProtocol: 'activitypub' as const,
        boostedAt: '2024-01-01',
        repostUri: `uri${i}`
      }))
      
      const itemWithManyReposts = {
        ...mockItem,
        repostGroup: {
          count: 10,
          actors: manyActors,
          viewerHasReposted: false
        }
      }
      
      const result = useFeedInteractions(createConfig(itemWithManyReposts))
      expect(result.repostSummary.value).toContain('User0, User1')
      expect(result.repostSummary.value).toContain('8')
    })
  })

  describe('action handlers', () => {
    it('should handle onRepostClick with debounce', async () => {
      const result = useFeedInteractions(config)
      
      // First call should work
      await result.onRepostClick()
      expect(config.emit.repostToggle).toHaveBeenCalledWith(mockItem)
      expect(result.isRepostProcessing.value).toBe(true)
      
      // Second call should be blocked
      await result.onRepostClick()
      expect(config.emit.repostToggle).toHaveBeenCalledTimes(1)
      
      // Wait for debounce to reset
      await new Promise(resolve => setTimeout(resolve, 400))
      expect(result.isRepostProcessing.value).toBe(false)
    })

    it('should handle openReplyComposer when objectUri exists', async () => {
      const result = useFeedInteractions(config)
      await result.openReplyComposer()
      expect(result.isReplying.value).toBe(true)
      expect(result.replyPolicy.value).toEqual({ mayReply: true, policyLabel: 'Test Policy' })
    })

    it('should not open reply composer when objectUri is missing', async () => {
      const result = useFeedInteractions(createConfig({ ...mockItem, objectUri: null }))
      await result.openReplyComposer()
      expect(result.isReplying.value).toBe(false)
    })

    it('should handle closeReplyComposer', () => {
      const result = useFeedInteractions(config)
      result.isReplying.value = true
      result.replyPolicy.value = { mayReply: true, policyLabel: 'Test' }
      
      result.closeReplyComposer()
      expect(result.isReplying.value).toBe(false)
      expect(result.replyPolicy.value).toBeNull()
      expect(result.replyError.value).toBeNull()
    })

    it('should handle toggleMoreActions', () => {
      const result = useFeedInteractions(config)
      expect(result.isMoreActionsOpen.value).toBe(false)
      
      result.toggleMoreActions()
      expect(result.isMoreActionsOpen.value).toBe(true)
      
      result.toggleMoreActions()
      expect(result.isMoreActionsOpen.value).toBe(false)
    })

    it('should handle closeMoreActions', () => {
      const result = useFeedInteractions(config)
      result.isMoreActionsOpen.value = true
      
      result.closeMoreActions()
      expect(result.isMoreActionsOpen.value).toBe(false)
    })
  })

  describe('follow utilities', () => {
    it('should expose isFollowing from useFollow', () => {
      const result = useFeedInteractions(config)
      expect(result.isFollowing).toBeDefined()
      expect(typeof result.isFollowing).toBe('function')
    })

    it('should expose follow from useFollow', () => {
      const result = useFeedInteractions(config)
      expect(result.follow).toBeDefined()
      expect(typeof result.follow).toBe('function')
    })
  })

  describe('repostLabel computation', () => {
    it('should return "Repost" when viewer has not reposted', () => {
      const result = useFeedInteractions(config)
      expect(result.repostLabel.value).toBe('feed.reposts.action')
    })

    it('should return "Reposted" when viewer has reposted', () => {
      const itemWithReposted = {
        ...mockItem,
        viewerHasReposted: true
      }
      
      const result = useFeedInteractions(createConfig(itemWithReposted))
      expect(result.repostLabel.value).toBe('feed.reposts.reposted')
    })
  })
})

describe('useFeedInteractions edge cases', () => {
  it('should handle null item gracefully', () => {
    // @ts-expect-error - Testing edge case
    const result = useFeedInteractions({ item: null, emit: { hashtagClick: vi.fn(), repostToggle: vi.fn() } })
    expect(result).toBeDefined()
  })

  it('should handle item with missing properties', () => {
    const minimalItem = {
      id: 1,
      content: '',
      postType: 'note',
      isPublic: true,
      authorId: null,
      authorName: '',
      authorWebId: '',
      authorProviderEndpoint: '',
      source: 'activitypods',
      atUri: null,
      objectUri: null,
      createdAt: null,
      type: 'post'
    } as unknown as UnifiedFeedItem
    
    const result = useFeedInteractions(createConfig(minimalItem))
    expect(result).toBeDefined()
    expect(result.repostCount.value).toBe(0)
  })

  it('should handle repostGroup with zero count', () => {
    const itemWithZeroRepost = {
      ...mockItem,
      repostGroup: {
        count: 0,
        actors: [],
        viewerHasReposted: false
      }
    }
    
    const result = useFeedInteractions(createConfig(itemWithZeroRepost))
    expect(result.repostSummary.value).toBeNull()
  })

  it('should handle repostGroup with empty actors array', () => {
    const itemWithEmptyActors = {
      ...mockItem,
      repostGroup: {
        count: 5,
        actors: [],
        viewerHasReposted: false
      }
    }
    
    const result = useFeedInteractions(createConfig(itemWithEmptyActors))
    expect(result.repostSummary.value).toBeNull()
  })
})
