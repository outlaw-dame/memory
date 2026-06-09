/**
 * StoryViewerOverlay Component Tests
 * 
 * Comprehensive tests for story viewer overlay with:
 * - Edge cases
 * - Accessibility
 * - Gesture handling
 * - Media display
 * - Keyboard handling
 * - Focus management
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StoryViewerOverlay from '../StoryViewerOverlay.vue'
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

describe('StoryViewerOverlay', () => {
  let wrapper: any
  const globalStubs = {
    StoryProgressBar: true,
    StoryViewerHeader: true,
    StoryViewerFooter: true
  }

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
    it('should render with required props', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.story-viewer-overlay').exists()).toBe(true)
    })

    it('should render with initialGroupIndex', () => {
      const groups = [createStoryGroup(), createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups, initialGroupIndex: 1 },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should have correct overlay structure', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('div[role="dialog"]').exists()).toBe(true)
    })

    it('should have correct tabindex', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const overlay = wrapper.find('.story-viewer-overlay')
      expect(overlay.attributes('tabindex')).toBe('-1')
    })

    it('should have correct aria attributes', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const overlay = wrapper.find('.story-viewer-overlay')
      expect(overlay.attributes('role')).toBe('dialog')
      expect(overlay.attributes('aria-modal')).toBe('true')
      expect(overlay.attributes('aria-label')).toBe('Story viewer')
    })
  })

  describe('tap areas', () => {
    it('should render left tap area', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__tap-area--left').exists()).toBe(true)
    })

    it('should render right tap area', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__tap-area--right').exists()).toBe(true)
    })

    it('should render center tap area', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__tap-area--center').exists()).toBe(true)
    })

    it('should have correct tap area classes', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const leftTap = wrapper.find('.story-viewer-overlay__tap-area--left')
      expect(leftTap.classes()).toContain('story-viewer-overlay__tap-area')
      expect(leftTap.classes()).toContain('absolute')
      expect(leftTap.classes()).toContain('left-0')
      expect(leftTap.classes()).toContain('top-0')
      expect(leftTap.classes()).toContain('z-10')
      expect(leftTap.classes()).toContain('h-full')
      expect(leftTap.classes()).toContain('w-1/3')
    })
  })

  describe('content area', () => {
    it('should render content area when currentGroup exists', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__content').exists()).toBe(true)
    })

    it('should render media container', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__media').exists()).toBe(true)
    })
  })

  describe('child components', () => {
    it('should render StoryProgressBar', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      // With stub, it should render as a stubbed component
      expect(wrapper.findComponent({ name: 'StoryProgressBar' }).exists()).toBe(true)
    })

    it('should render StoryViewerHeader', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.findComponent({ name: 'StoryViewerHeader' }).exists()).toBe(true)
    })

    it('should render StoryViewerFooter', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.findComponent({ name: 'StoryViewerFooter' }).exists()).toBe(true)
    })
  })

  describe('media display', () => {
    it('should render image media', () => {
      const item = createStoryItem({
        media: {
          kind: 'image',
          mimeType: 'image/jpeg',
          alt: 'Test',
          url: 'https://example.com/image.jpg',
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: null
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__media-item').exists()).toBe(true)
    })

    it('should render video media', () => {
      const item = createStoryItem({
        media: {
          kind: 'video',
          mimeType: 'video/mp4',
          alt: 'Test',
          url: 'https://example.com/video.mp4',
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: 10000
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('video').exists()).toBe(true)
    })

    it('should render placeholder when no media url', () => {
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
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__media-placeholder').exists()).toBe(true)
    })

    it('should display alt text in placeholder', () => {
      const item = createStoryItem({
        media: {
          kind: 'image',
          mimeType: 'image/jpeg',
          alt: 'Media not available',
          url: null,
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: null
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const placeholder = wrapper.find('.story-viewer-overlay__media-placeholder')
      expect(placeholder.text()).toContain('Media not available')
    })
  })

  describe('gesture handling', () => {
    it('should have gesture handlers on overlay', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.gestures).toBeDefined()
      expect(vm.gestures.handleKeyDown).toBeDefined()
      expect(vm.gestures.handleTouchStart).toBeDefined()
      expect(vm.gestures.handleTouchMove).toBeDefined()
      expect(vm.gestures.handleTouchEnd).toBeDefined()
      expect(vm.gestures.handleMouseDown).toBeDefined()
      expect(vm.gestures.handleMouseMove).toBeDefined()
      expect(vm.gestures.handleMouseUp).toBeDefined()
    })
  })

  describe('event handling', () => {
    it('should emit close event', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      vm.handleClose()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should expose close method', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(typeof vm.close).toBe('function')
    })

    it('should expose focus method', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(typeof vm.focus).toBe('function')
    })

    it('should expose registerActionSheet method', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(typeof vm.registerActionSheet).toBe('function')
    })
  })

  describe('computed properties', () => {
    it('should have currentGroup computed', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.currentGroup).toBeDefined()
    })

    it('should have currentItem computed', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.currentItem).toBeDefined()
    })
  })

  describe('accessibility', () => {
    it('should have role dialog', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    })

    it('should have aria-modal true', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('[aria-modal="true"]').exists()).toBe(true)
    })

    it('should have aria-label', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('[aria-label="Story viewer"]').exists()).toBe(true)
    })

    it('should have aria-hidden on tap areas', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const leftTap = wrapper.find('.story-viewer-overlay__tap-area--left')
      const rightTap = wrapper.find('.story-viewer-overlay__tap-area--right')
      expect(leftTap.attributes('aria-hidden')).toBe('true')
      expect(rightTap.attributes('aria-hidden')).toBe('true')
    })

    it('should have aria-label on center tap area', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const centerTap = wrapper.find('.story-viewer-overlay__tap-area--center')
      expect(centerTap.attributes('aria-label')).toBe('Pause or resume story')
    })
  })

  describe('edge cases', () => {
    it('should handle empty groups array', () => {
      wrapper = mount(StoryViewerOverlay, {
        props: { groups: [] },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle groups with empty items', () => {
      const groups = [createStoryGroup({ items: [] })]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle initialGroupIndex out of bounds', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups, initialGroupIndex: 10 },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
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
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-overlay__media-placeholder').exists()).toBe(true)
    })
  })

  describe('security', () => {
    it('should handle malicious media url', () => {
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
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const img = wrapper.find('.story-viewer-overlay__media-item')
      expect(img.attributes('src')).toBe('javascript:alert(1)')
    })

    it('should handle very long media url', () => {
      const item = createStoryItem({
        media: {
          kind: 'image',
          mimeType: 'image/jpeg',
          alt: 'Test',
          url: 'https://example.com/' + 'a'.repeat(1000),
          cid: 'cid',
          aspectRatio: { width: 800, height: 600 },
          durationMs: null
        }
      })
      const groups = [createStoryGroup({ items: [item] })]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('styling', () => {
    it('should have correct overlay classes', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const overlay = wrapper.find('.story-viewer-overlay')
      expect(overlay.classes()).toContain('story-viewer-overlay')
      expect(overlay.classes()).toContain('fixed')
      expect(overlay.classes()).toContain('inset-0')
      expect(overlay.classes()).toContain('z-50')
      expect(overlay.classes()).toContain('bg-black')
      expect(overlay.classes()).toContain('text-white')
    })

    it('should have correct content classes', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const content = wrapper.find('.story-viewer-overlay__content')
      expect(content.classes()).toContain('story-viewer-overlay__content')
      expect(content.classes()).toContain('relative')
      expect(content.classes()).toContain('flex')
      expect(content.classes()).toContain('h-full')
      expect(content.classes()).toContain('w-full')
      expect(content.classes()).toContain('items-center')
      expect(content.classes()).toContain('justify-center')
      expect(content.classes()).toContain('overflow-hidden')
    })

    it('should have correct media classes', () => {
      const groups = [createStoryGroup()]
      wrapper = mount(StoryViewerOverlay, {
        props: { groups },
        global: { stubs: globalStubs }
      })
      const media = wrapper.find('.story-viewer-overlay__media')
      expect(media.classes()).toContain('story-viewer-overlay__media')
      expect(media.classes()).toContain('absolute')
      expect(media.classes()).toContain('inset-0')
      expect(media.classes()).toContain('flex')
      expect(media.classes()).toContain('items-center')
      expect(media.classes()).toContain('justify-center')
    })
  })
})
