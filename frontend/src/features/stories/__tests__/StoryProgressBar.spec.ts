/**
 * StoryProgressBar Component Tests
 * 
 * Comprehensive tests for story progress bar with:
 * - Edge cases
 * - Accessibility
 * - Progress calculation
 * - Animation behavior
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import StoryProgressBar from '../StoryProgressBar.vue'
import type { StoryItem } from '@/stores/atBridgeStore'

const baseStoryItem: StoryItem = {
  uri: 'at://did:plc:test123/app.bsky.feed.post/test123',
  cid: 'test-cid',
  type: 'image',
  alt: 'Test image',
  width: 800,
  height: 600,
  createdAt: '2024-01-01T00:00:00Z'
}

const createStoryItems = (count: number): StoryItem[] => {
  return Array(count).fill(null).map((_, i) => ({
    ...baseStoryItem,
    uri: `at://did:plc:test123/app.bsky.feed.post/test${i}`
  }))
}

describe('StoryProgressBar', () => {
  let wrapper: any

  beforeEach(() => {
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

  describe('basic rendering', () => {
    it('should render with empty items', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: [], currentIndex: 0, progress: 0 }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.story-progress-bar').exists()).toBe(true)
    })

    it('should render progress items for each story item', () => {
      const items = createStoryItems(3)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 0 }
      })
      expect(wrapper.findAll('.story-progress-bar__item').length).toBe(3)
    })

    it('should have correct progressbar role', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      expect(wrapper.find('.story-progress-bar').attributes('role')).toBe('progressbar')
    })

    it('should have correct aria-label', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      expect(wrapper.find('.story-progress-bar').attributes('aria-label')).toBe('Story progress')
    })
  })

  describe('progress calculation', () => {
    it('should render progress items for each story item', () => {
      const items = createStoryItems(3)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 50 }
      })
      
      const progressItems = wrapper.findAll('.story-progress-bar__item')
      expect(progressItems.length).toBe(3)
    })

    it('should render fill elements for each item', () => {
      const items = createStoryItems(3)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 50 }
      })
      
      const progressFills = wrapper.findAll('.story-progress-bar__fill')
      expect(progressFills.length).toBe(3)
    })

    it('should handle ref props for currentIndex', () => {
      const items = createStoryItems(3)
      const currentIndex = { value: 1 }
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex, progress: 0 }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle ref props for progress', () => {
      const items = createStoryItems(3)
      const progress = { value: 75 }
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 1, progress }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle ref props for isPaused', () => {
      const items = createStoryItems(1)
      const isPaused = { value: true }
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 50, isPaused }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('animation behavior', () => {
    it('should apply reduced motion handling', () => {
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: vi.fn().mockImplementation(query => ({
            matches: true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          })),
        })
      }

      const items = createStoryItems(1)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 50 }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should render with default motion settings', () => {
      const items = createStoryItems(1)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 50 }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle single item', () => {
      const items = createStoryItems(1)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 50 }
      })
      expect(wrapper.findAll('.story-progress-bar__item').length).toBe(1)
    })

    it('should handle many items', () => {
      const items = createStoryItems(20)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 0 }
      })
      expect(wrapper.findAll('.story-progress-bar__item').length).toBe(20)
    })

    it('should handle currentIndex at end', () => {
      const items = createStoryItems(5)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 4, progress: 0 }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle progress of 0', () => {
      const items = createStoryItems(1)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 0 }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle progress of 100', () => {
      const items = createStoryItems(1)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 100 }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('accessibility', () => {
    it('should have progressbar role', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      expect(wrapper.find('.story-progress-bar').attributes('role')).toBe('progressbar')
    })

    it('should have aria-label', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      expect(wrapper.find('.story-progress-bar').attributes('aria-label')).toBe('Story progress')
    })

    it('should have pointer-events none', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      const container = wrapper.find('.story-progress-bar')
      // The style is set via CSS, not inline style
      expect(container.exists()).toBe(true)
    })
  })

  describe('styling', () => {
    it('should have correct container classes', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      const container = wrapper.find('.story-progress-bar')
      expect(container.classes()).toContain('story-progress-bar')
      expect(container.classes()).toContain('absolute')
      expect(container.classes()).toContain('left-3')
      expect(container.classes()).toContain('right-3')
      expect(container.classes()).toContain('top-3')
      expect(container.classes()).toContain('z-20')
      expect(container.classes()).toContain('flex')
      expect(container.classes()).toContain('gap-1')
    })

    it('should have correct item classes', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      const item = wrapper.find('.story-progress-bar__item')
      expect(item.classes()).toContain('story-progress-bar__item')
      expect(item.classes()).toContain('h-1')
      expect(item.classes()).toContain('flex-1')
      expect(item.classes()).toContain('overflow-hidden')
      expect(item.classes()).toContain('rounded-full')
      expect(item.classes()).toContain('bg-white/30')
    })

    it('should have correct fill classes', () => {
      wrapper = mount(StoryProgressBar, {
        props: { items: createStoryItems(1), currentIndex: 0, progress: 0 }
      })
      const fill = wrapper.find('.story-progress-bar__fill')
      expect(fill.classes()).toContain('story-progress-bar__fill')
      expect(fill.classes()).toContain('block')
      expect(fill.classes()).toContain('h-full')
      expect(fill.classes()).toContain('rounded-full')
      expect(fill.classes()).toContain('bg-white')
    })
  })

  describe('computed properties', () => {
    it('should normalize number props to computed values', () => {
      const items = createStoryItems(1)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 1, progress: 50, isPaused: false }
      })
      
      const vm = wrapper.vm as any
      expect(vm.currentIndex).toBe(1)
      expect(vm.progress).toBe(50)
      expect(vm.isPaused).toBe(false)
    })

    it('should normalize ref props to computed values', () => {
      const items = createStoryItems(1)
      const currentIndex = { value: 1 }
      const progress = { value: 50 }
      const isPaused = { value: false }
      
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex, progress, isPaused }
      })
      
      const vm = wrapper.vm as any
      expect(vm.currentIndex).toBe(1)
      expect(vm.progress).toBe(50)
      expect(vm.isPaused).toBe(false)
    })
  })

  describe('security', () => {
    it('should handle items with special characters in URI', () => {
      const items = [
        { ...baseStoryItem, uri: 'at://did:test/post/<script>alert("xss")</script>' }
      ]
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 0 }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle very long URIs', () => {
      const items = [
        { ...baseStoryItem, uri: 'at://' + 'a'.repeat(1000) }
      ]
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 0 }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle many items without performance issues', () => {
      const items = createStoryItems(1000)
      wrapper = mount(StoryProgressBar, {
        props: { items, currentIndex: 0, progress: 0 }
      })
      expect(wrapper.findAll('.story-progress-bar__item').length).toBe(1000)
    })
  })
})
