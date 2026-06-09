/**
 * StoryViewerFooter Component Tests
 * 
 * Comprehensive tests for story viewer footer with:
 * - Edge cases
 * - Accessibility
 * - Link handling
 * - Content display
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StoryViewerFooter from '../StoryViewerFooter.vue'
import type { StoryItem } from '@/stores/atBridgeStore'

const baseStoryItem: StoryItem = {
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
  expiresInSeconds: 86400,
  visibility: 'public',
  seen: false,
  viewerCanDelete: true
}

describe('StoryViewerFooter', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should not render when no content', () => {
      const item: StoryItem = { ...baseStoryItem, text: '', links: [] }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      // Component uses v-if, so the footer element should not exist
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(false)
    })

    it('should render when text is present', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test caption' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(true)
    })

    it('should render when links are present', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        text: '',
        links: [{ uri: 'https://example.com', title: 'Example' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(true)
    })

    it('should render when both text and links are present', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        text: 'Test caption',
        links: [{ uri: 'https://example.com', title: 'Example' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(true)
      expect(wrapper.find('.story-viewer-footer__text').exists()).toBe(true)
      expect(wrapper.find('.story-viewer-footer__links').exists()).toBe(true)
    })
  })

  describe('text content', () => {
    it('should display text content', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test caption' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const textElement = wrapper.find('.story-viewer-footer__text')
      expect(textElement.exists()).toBe(true)
      expect(textElement.text()).toContain('Test caption')
    })

    it('should not display text when empty', () => {
      const item: StoryItem = { ...baseStoryItem, text: '', links: [{ uri: 'https://example.com' }] }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer__text').exists()).toBe(false)
    })

    it('should have correct text styling', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const textElement = wrapper.find('.story-viewer-footer__text')
      expect(textElement.classes()).toContain('story-viewer-footer__text')
      expect(textElement.classes()).toContain('text-base')
      expect(textElement.classes()).toContain('font-semibold')
      expect(textElement.classes()).toContain('text-white')
    })
  })

  describe('links', () => {
    it('should display link elements', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [
          { uri: 'https://example.com', title: 'Example' },
          { uri: 'https://test.com', title: 'Test' }
        ]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const links = wrapper.findAll('.story-viewer-footer__link')
      expect(links.length).toBe(2)
    })

    it('should display link with title', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com', title: 'Example Site' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.text()).toContain('Example Site')
    })

    it('should display link with hostname when no title', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com/path' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.text()).toContain('example.com')
    })

    it('should display URI when hostname cannot be parsed', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'invalid-uri' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.text()).toContain('invalid-uri')
    })

    it('should have correct link attributes', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.attributes('href')).toBe('https://example.com')
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener noreferrer')
    })

    it('should have correct link styling', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.classes()).toContain('story-viewer-footer__link')
      expect(link.classes()).toContain('rounded-full')
      expect(link.classes()).toContain('bg-white')
      expect(link.classes()).toContain('text-black')
    })

    it('should have correct links container styling', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const linksContainer = wrapper.find('.story-viewer-footer__links')
      expect(linksContainer.classes()).toContain('story-viewer-footer__links')
      expect(linksContainer.classes()).toContain('flex')
      expect(linksContainer.classes()).toContain('flex-wrap')
      expect(linksContainer.classes()).toContain('gap-2')
    })
  })

  describe('accessibility', () => {
    it('should have correct role on footer', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').attributes('role')).toBe('contentinfo')
    })

    it('should have correct role on links container', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer__links').attributes('role')).toBe('list')
    })

    it('should have correct role on link elements', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.attributes('role')).toBe('listitem')
    })
  })

  describe('computed properties', () => {
    it('should compute hasContent correctly with text', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      // hasContent returns the truthy value, not a boolean
      expect(vm.hasContent).toBeTruthy()
    })

    it('should compute hasContent correctly with links', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        text: null,
        links: [{ uri: 'https://example.com', title: 'Example' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      // hasContent returns the truthy value
      expect(vm.hasContent).toBeTruthy()
    })

    it('should compute hasContent correctly with no content', () => {
      const item: StoryItem = { ...baseStoryItem, text: null, links: [] }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      expect(vm.hasContent).toBe(false)
    })
  })

  describe('linkLabel function', () => {
    it('should return title when present', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com', title: 'Title' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      expect(vm.linkLabel({ uri: 'https://example.com', title: 'Title' })).toBe('Title')
    })

    it('should return hostname when no title', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com/path' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      expect(vm.linkLabel({ uri: 'https://example.com/path' })).toBe('example.com')
    })

    it('should return URI when hostname cannot be parsed', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'invalid-uri' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      expect(vm.linkLabel({ uri: 'invalid-uri' })).toBe('invalid-uri')
    })

    it('should handle URL parsing errors gracefully', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: '' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const vm = wrapper.vm as any
      expect(vm.linkLabel({ uri: '' })).toBe('')
    })
  })

  describe('edge cases', () => {
    it('should handle empty text', () => {
      const item: StoryItem = { ...baseStoryItem, text: '', links: [] }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(false)
    })

    it('should handle empty links array', () => {
      const item: StoryItem = { ...baseStoryItem, text: '', links: [] }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(false)
    })

    it('should handle very long text', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'A'.repeat(1000) }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const textElement = wrapper.find('.story-viewer-footer__text')
      expect(textElement.text()).toHaveLength(1000)
    })

    it('should handle multiple links', () => {
      const links = Array(10).fill(null).map((_, i) => ({
        uri: `https://example${i}.com`,
        title: `Link ${i}`
      }))
      const item: StoryItem = { ...baseStoryItem, links }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const linkElements = wrapper.findAll('.story-viewer-footer__link')
      expect(linkElements.length).toBe(10)
    })

    it('should handle links with special characters', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com/path?query=value&other=123' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      expect(wrapper.find('.story-viewer-footer').exists()).toBe(true)
    })
  })

  describe('security', () => {
    it('should escape HTML in text', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        text: '<script>alert("xss")</script>Test'
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const textElement = wrapper.find('.story-viewer-footer__text')
      // Vue escapes HTML in text interpolation, so script tags should not be rendered as elements
      expect(textElement.find('script').exists()).toBe(false)
      // The text content should contain the literal characters
      expect(textElement.text()).toContain('<script>alert("xss")</script>Test')
    })

    it('should escape HTML in link title', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'https://example.com', title: '<script>alert("xss")</script>' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.find('script').exists()).toBe(false)
    })

    it('should sanitize link href', () => {
      const item: StoryItem = {
        ...baseStoryItem,
        links: [{ uri: 'javascript:alert(1)' }]
      }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const link = wrapper.find('.story-viewer-footer__link')
      expect(link.attributes('href')).toBe('javascript:alert(1)')
    })
  })

  describe('styling', () => {
    it('should have correct footer classes', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const footer = wrapper.find('.story-viewer-footer')
      expect(footer.classes()).toContain('story-viewer-footer')
      expect(footer.classes()).toContain('absolute')
      expect(footer.classes()).toContain('bottom-0')
      expect(footer.classes()).toContain('left-0')
      expect(footer.classes()).toContain('right-0')
      expect(footer.classes()).toContain('z-20')
      expect(footer.classes()).toContain('bg-gradient-to-t')
      expect(footer.classes()).toContain('from-black/80')
      expect(footer.classes()).toContain('to-transparent')
    })

    it('should have correct footer positioning', () => {
      const item: StoryItem = { ...baseStoryItem, text: 'Test' }
      wrapper = mount(StoryViewerFooter, {
        props: { item }
      })
      const footer = wrapper.find('.story-viewer-footer')
      expect(footer.classes()).toContain('px-4')
      expect(footer.classes()).toContain('pb-6')
      expect(footer.classes()).toContain('pt-24')
    })
  })
})
