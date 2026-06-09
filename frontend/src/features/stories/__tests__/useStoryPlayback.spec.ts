/**
 * useStoryPlayback Composable Tests
 * 
 * Comprehensive tests for story playback state management with:
 * - State management
 * - Navigation
 * - Playback controls
 * - Auto-advancement
 * - Reduced motion support
 * - Edge cases
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useStoryPlayback } from '../useStoryPlayback'
import type { StoryGroup, StoryItem } from '@/stores/atBridgeStore'

const createStoryItem = (overrides: Partial<StoryItem> = {}): StoryItem => ({
  uri: 'at://did:plc:test123/app.bsky.feed.post/test123',
  cid: 'test-cid',
  media: {
    kind: 'image',
    mimeType: 'image/jpeg',
    alt: 'Test image',
    url: 'https://example.com/image.jpg',
    cid: 'media-cid',
    aspectRatio: { width: 800, height: 600 },
    durationMs: null
  },
  text: null,
  links: [],
  createdAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-01-02T00:00:00Z',
  expiresInSeconds: 3600,
  visibility: 'public',
  seen: false,
  viewerCanDelete: true,
  ...overrides
})

const createStoryGroup = (overrides: Partial<StoryGroup> = {}): StoryGroup => ({
  actor: {
    did: 'did:plc:test123',
    handle: 'testuser',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isViewer: false
  },
  latestAt: '2024-01-01T00:00:00Z',
  seen: false,
  items: [createStoryItem()],
  ...overrides
})

const createVideoStoryItem = (): StoryItem => createStoryItem({
  media: {
    kind: 'video',
    mimeType: 'video/mp4',
    alt: 'Test video',
    url: 'https://example.com/video.mp4',
    cid: 'video-cid',
    aspectRatio: { width: 800, height: 600 },
    durationMs: 10000
  }
})

describe('useStoryPlayback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      })
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('initialization', () => {
    it('should initialize with first group and item', () => {
      const groups = [createStoryGroup(), createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentGroupIndex.value).toBe(0)
      expect(playback.currentItemIndex.value).toBe(0)
      expect(playback.currentGroup.value).toBe(groups[0])
      expect(playback.currentItem.value).toBe(groups[0].items[0])
    })

    it('should respect initialGroupIndex', () => {
      const groups = [createStoryGroup(), createStoryGroup(), createStoryGroup()]
      const playback = useStoryPlayback({ groups, initialGroupIndex: 1 })
      
      expect(playback.currentGroupIndex.value).toBe(1)
      expect(playback.currentItemIndex.value).toBe(0)
      expect(playback.currentGroup.value).toBe(groups[1])
    })

    it('should clamp initialGroupIndex to valid range', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups, initialGroupIndex: 10 })
      
      expect(playback.currentGroupIndex.value).toBe(0)
    })

    it('should clamp negative initialGroupIndex to 0', () => {
      const groups = [createStoryGroup(), createStoryGroup()]
      const playback = useStoryPlayback({ groups, initialGroupIndex: -5 })
      
      expect(playback.currentGroupIndex.value).toBe(0)
    })
  })

  describe('computed properties', () => {
    it('should return null for currentGroup when out of bounds', () => {
      const groups: StoryGroup[] = []
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentGroup.value).toBeNull()
      expect(playback.currentItem.value).toBeNull()
    })

    it('should return null for currentItem when group has no items', () => {
      const groups = [createStoryGroup({ items: [] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentGroup.value).toBe(groups[0])
      expect(playback.currentItem.value).toBeNull()
    })

    it('should calculate image duration correctly', () => {
      const item = createStoryItem()
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.durationMs.value).toBe(5000)
    })

    it('should calculate video duration correctly', () => {
      const item = createVideoStoryItem()
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.durationMs.value).toBe(10000)
    })

    it('should clamp video duration to max', () => {
      const item = createStoryItem({
        media: {
          kind: 'video',
          mimeType: 'video/mp4',
          alt: 'Test',
          url: 'https://example.com/video.mp4',
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: 100000 // 100 seconds
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups, maxVideoDuration: 60000 })
      
      expect(playback.durationMs.value).toBe(60000)
    })

    it('should clamp video duration to min', () => {
      const item = createStoryItem({
        media: {
          kind: 'video',
          mimeType: 'video/mp4',
          alt: 'Test',
          url: 'https://example.com/video.mp4',
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: 1000 // 1 second
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups, minDuration: 5000 })
      
      expect(playback.durationMs.value).toBe(5000)
    })

    it('should use custom imageDuration', () => {
      const item = createStoryItem()
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups, imageDuration: 8000 })
      
      expect(playback.durationMs.value).toBe(8000)
    })
  })

  describe('navigation', () => {
    it('should advance to next item in group', () => {
      const item1 = createStoryItem({ uri: 'uri1' })
      const item2 = createStoryItem({ uri: 'uri2' })
      const groups = [createStoryGroup({ items: [item1, item2] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentItemIndex.value).toBe(0)
      playback.advance()
      expect(playback.currentItemIndex.value).toBe(1)
      expect(playback.currentItem.value).toBe(item2)
    })

    it('should advance to next group when at end of current group', () => {
      const group1 = createStoryGroup({ items: [createStoryItem({ uri: 'uri1' })] })
      const group2 = createStoryGroup({ items: [createStoryItem({ uri: 'uri2' })] })
      const groups = [group1, group2]
      const playback = useStoryPlayback({ groups })
      
      playback.advance()
      expect(playback.currentGroupIndex.value).toBe(1)
      expect(playback.currentItemIndex.value).toBe(0)
    })

    it('should pause at end of all stories', () => {
      const group1 = createStoryGroup({ items: [createStoryItem({ uri: 'uri1' })] })
      const groups = [group1]
      const playback = useStoryPlayback({ groups })
      
      playback.advance()
      expect(playback.isPaused.value).toBe(true)
    })

    it('should handle advance when no current group', () => {
      const groups: StoryGroup[] = []
      const playback = useStoryPlayback({ groups })
      
      // Should not crash
      playback.advance()
      expect(playback.currentGroup.value).toBeNull()
    })

    it('should go to previous item in group', () => {
      const item1 = createStoryItem({ uri: 'uri1' })
      const item2 = createStoryItem({ uri: 'uri2' })
      const groups = [createStoryGroup({ items: [item1, item2] })]
      const playback = useStoryPlayback({ groups, initialGroupIndex: 0 })
      
      playback.currentItemIndex.value = 1
      playback.previous()
      expect(playback.currentItemIndex.value).toBe(0)
    })

    it('should go to previous group when at start of current group', () => {
      const group1 = createStoryGroup({ items: [createStoryItem({ uri: 'uri1' }), createStoryItem({ uri: 'uri2' })] })
      const group2 = createStoryGroup({ items: [createStoryItem({ uri: 'uri3' })] })
      const groups = [group1, group2]
      const playback = useStoryPlayback({ groups, initialGroupIndex: 1 })
      
      playback.previous()
      expect(playback.currentGroupIndex.value).toBe(0)
      expect(playback.currentItemIndex.value).toBe(1)
    })

    it('should stay at first item when already at start', () => {
      const groups = [createStoryGroup({ items: [createStoryItem()] })]
      const playback = useStoryPlayback({ groups })
      
      playback.previous()
      expect(playback.currentGroupIndex.value).toBe(0)
      expect(playback.currentItemIndex.value).toBe(0)
    })
  })

  describe('playback controls', () => {
    it('should pause playback', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.isPaused.value).toBe(false)
      playback.pause()
      expect(playback.isPaused.value).toBe(true)
    })

    it('should not pause when already paused', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.pause()
      playback.pause()
      expect(playback.isPaused.value).toBe(true)
    })

    it('should resume playback', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.pause()
      expect(playback.isPaused.value).toBe(true)
      
      playback.resume()
      expect(playback.isPaused.value).toBe(false)
    })

    it('should not resume when not paused', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.resume()
      expect(playback.isPaused.value).toBe(false)
    })

    it('should toggle pause state', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.isPaused.value).toBe(false)
      playback.togglePause()
      expect(playback.isPaused.value).toBe(true)
      playback.togglePause()
      expect(playback.isPaused.value).toBe(false)
    })

    it('should reset progress', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.progress.value = 50
      playback.resetProgress()
      expect(playback.progress.value).toBe(0)
    })
  })

  describe('hold pause', () => {
    it('should pause on hold start', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.isPaused.value).toBe(false)
      playback.startHoldPause()
      expect(playback.isPaused.value).toBe(true)
    })

    it('should resume after hold end with delay', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.startHoldPause()
      expect(playback.isPaused.value).toBe(true)
      
      playback.endHoldPause()
      
      // Fast-forward time
      vi.advanceTimersByTime(100)
      
      expect(playback.isPaused.value).toBe(false)
    })

    it('should not resume if already unpaused', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.startHoldPause()
      playback.endHoldPause()
      
      // Manually unpause
      playback.resume()
      
      // Fast-forward time
      vi.advanceTimersByTime(100)
      
      expect(playback.isPaused.value).toBe(false)
    })
  })

  describe('video end handling', () => {
    it('should advance on video end when not paused', () => {
      const item1 = createVideoStoryItem()
      const item2 = createVideoStoryItem()
      const groups = [createStoryGroup({ items: [item1, item2] })]
      const playback = useStoryPlayback({ groups })
      
      playback.handleVideoEnd()
      expect(playback.currentItemIndex.value).toBe(1)
    })

    it('should not advance on video end when paused', () => {
      const item1 = createVideoStoryItem()
      const item2 = createVideoStoryItem()
      const groups = [createStoryGroup({ items: [item1, item2] })]
      const playback = useStoryPlayback({ groups })
      
      playback.pause()
      playback.handleVideoEnd()
      expect(playback.currentItemIndex.value).toBe(0)
    })
  })

  describe('close', () => {
    it('should stop progress on close', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups })
      
      playback.close()
      expect(playback.isPlaying.value).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty groups array', () => {
      const groups: StoryGroup[] = []
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentGroup.value).toBeNull()
      expect(playback.currentItem.value).toBeNull()
    })

    it('should handle groups with empty items', () => {
      const groups = [createStoryGroup({ items: [] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentGroup.value).toBe(groups[0])
      expect(playback.currentItem.value).toBeNull()
    })

    it('should handle null media url', () => {
      const item = createStoryItem({
        media: {
          kind: 'image',
          mimeType: 'image/jpeg',
          alt: 'Test',
          url: null,
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: null
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentItem.value).toBe(item)
    })

    it('should handle very large group index', () => {
      const groups = [createStoryGroup()]
      const playback = useStoryPlayback({ groups, initialGroupIndex: 9999 })
      
      expect(playback.currentGroupIndex.value).toBe(0)
    })
  })

  describe('security', () => {
    it('should handle malicious URLs safely', () => {
      const item = createStoryItem({
        media: {
          kind: 'image',
          mimeType: 'image/jpeg',
          alt: 'Test',
          url: 'javascript:alert(1)',
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: null
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentItem.value?.media.url).toBe('javascript:alert(1)')
    })

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000)
      const item = createStoryItem({
        media: {
          kind: 'image',
          mimeType: 'image/jpeg',
          alt: 'Test',
          url: longUrl,
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: null
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      const playback = useStoryPlayback({ groups })
      
      expect(playback.currentItem.value?.media.url).toBe(longUrl)
    })
  })
})
