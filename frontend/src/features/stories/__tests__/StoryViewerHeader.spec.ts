/**
 * StoryViewerHeader Component Tests
 * 
 * Comprehensive tests for story viewer header with:
 * - Edge cases
 * - Accessibility
 * - Actor information display
 * - Expiry timer
 * - Delete/close buttons
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StoryViewerHeader from '../StoryViewerHeader.vue'
import type { StoryGroup, StoryItem } from '@/stores/atBridgeStore'

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
  expiresInSeconds: 3661,
  visibility: 'public',
  seen: false,
  viewerCanDelete: true
}

const baseStoryGroup: StoryGroup = {
  actor: {
    did: 'did:plc:test123',
    handle: 'testuser',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    isViewer: false
  },
  latestAt: '2024-01-01T00:00:00Z',
  seen: false,
  items: []
}

describe('StoryViewerHeader', () => {
  let wrapper: any
  const globalStubs = {
    AppIcon: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with required props', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.story-viewer-header').exists()).toBe(true)
    })

    it('should have correct header structure', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('header').exists()).toBe(true)
    })

    it('should render author section', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-header__author').exists()).toBe(true)
    })

    it('should render actions section', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-header__actions').exists()).toBe(true)
    })
  })

  describe('actor information', () => {
    it('should display actor avatar', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-header__avatar').exists()).toBe(true)
    })

    it('should display avatar image when avatarUrl is provided', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const avatar = wrapper.find('.story-viewer-header__avatar')
      expect(avatar.find('img').exists()).toBe(true)
      expect(avatar.find('img').attributes('src')).toBe('https://example.com/avatar.jpg')
    })

    it('should display avatar initials when avatarUrl is not provided', () => {
      const groupNoAvatar = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, avatarUrl: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoAvatar, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const avatar = wrapper.find('.story-viewer-header__avatar')
      expect(avatar.find('img').exists()).toBe(false)
      expect(avatar.find('span').exists()).toBe(true)
    })

    it('should display displayName', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const name = wrapper.find('.story-viewer-header__name')
      expect(name.exists()).toBe(true)
      expect(name.text()).toContain('Test User')
    })

    it('should display "You" for viewer', () => {
      const viewerGroup = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, isViewer: true }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: viewerGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const name = wrapper.find('.story-viewer-header__name')
      expect(name.text()).toContain('You')
    })

    it('should fall back to handle when displayName is null', () => {
      const groupNoDisplayName = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoDisplayName, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const name = wrapper.find('.story-viewer-header__name')
      expect(name.text()).toContain('testuser')
    })

    it('should fall back to did when handle is null', () => {
      const groupNoHandle = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: null, handle: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoHandle, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const name = wrapper.find('.story-viewer-header__name')
      expect(name.text()).toContain('did:plc:test123')
    })
  })

  describe('expiry timer', () => {
    it('should display expiry label', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const expiry = wrapper.find('.story-viewer-header__expiry')
      expect(expiry.exists()).toBe(true)
      expect(expiry.text()).toContain('1h')
      expect(expiry.text()).toContain('1m')
    })

    it('should display hours and minutes for long expiry', () => {
      const itemLongExpiry = {
        ...baseStoryItem,
        expiresInSeconds: 7322 // 2 hours and 2 minutes
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: itemLongExpiry },
        global: { stubs: globalStubs }
      })
      const expiry = wrapper.find('.story-viewer-header__expiry')
      expect(expiry.text()).toContain('2h')
      expect(expiry.text()).toContain('2m')
    })

    it('should display only minutes for short expiry', () => {
      const itemShortExpiry = {
        ...baseStoryItem,
        expiresInSeconds: 120 // 2 minutes
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: itemShortExpiry },
        global: { stubs: globalStubs }
      })
      const expiry = wrapper.find('.story-viewer-header__expiry')
      expect(expiry.text()).toContain('2m')
      expect(expiry.text()).not.toContain('h')
    })

    it('should display minimum 1 minute', () => {
      const itemShortExpiry = {
        ...baseStoryItem,
        expiresInSeconds: 30 // 30 seconds
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: itemShortExpiry },
        global: { stubs: globalStubs }
      })
      const expiry = wrapper.find('.story-viewer-header__expiry')
      expect(expiry.text()).toContain('1m')
    })
  })

  describe('actions', () => {
    it('should render delete button when viewerCanDelete is true', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const deleteButton = wrapper.find('.story-viewer-header__action')
      expect(deleteButton.exists()).toBe(true)
    })

    it('should not render delete button when viewerCanDelete is false', () => {
      const itemNoDelete = {
        ...baseStoryItem,
        viewerCanDelete: false
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: itemNoDelete },
        global: { stubs: globalStubs }
      })
      const actions = wrapper.findAll('.story-viewer-header__action')
      // Should only have close button
      expect(actions.length).toBe(1)
    })

    it('should render close button', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const closeButton = wrapper.findAll('.story-viewer-header__action').at(-1)
      expect(closeButton.exists()).toBe(true)
      expect(closeButton.attributes('aria-label')).toBe('Close story viewer')
    })

    it('should disable delete button when isDeleting is true', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem, isDeleting: true },
        global: { stubs: globalStubs }
      })
      const deleteButton = wrapper.find('.story-viewer-header__action')
      // disabled attribute might be boolean or string
      expect(deleteButton.attributes('disabled')).toBeDefined()
      expect(deleteButton.element.disabled).toBe(true)
    })
  })

  describe('event handling', () => {
    it('should emit close event when close button is clicked', async () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const closeButton = wrapper.findAll('.story-viewer-header__action').at(-1)
      await closeButton.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call onClose callback when close button is clicked', async () => {
      const onClose = vi.fn()
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem, onClose },
        global: { stubs: globalStubs }
      })
      const closeButton = wrapper.findAll('.story-viewer-header__action').at(-1)
      await closeButton.trigger('click')
      expect(onClose).toHaveBeenCalled()
    })

    it('should emit delete event when delete button is clicked', async () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const deleteButton = wrapper.find('.story-viewer-header__action')
      await deleteButton.trigger('click')
      expect(wrapper.emitted('delete')).toBeTruthy()
    })

    it('should call onDelete callback when delete button is clicked', async () => {
      const onDelete = vi.fn()
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem, onDelete },
        global: { stubs: globalStubs }
      })
      const deleteButton = wrapper.find('.story-viewer-header__action')
      await deleteButton.trigger('click')
      expect(onDelete).toHaveBeenCalled()
    })
  })

  describe('computed properties', () => {
    it('should compute displayName correctly', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.displayName).toBe('Test User')
    })

    it('should compute displayName with fallback to handle', () => {
      const groupNoDisplayName = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoDisplayName, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.displayName).toBe('testuser')
    })

    it('should compute avatarInitials correctly', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.avatarInitials).toBe('TU')
    })

    it('should compute avatarInitials with fallback', () => {
      const groupNoDisplayName = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: null, handle: null, avatarUrl: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoDisplayName, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      // did:plc:test123 -> D (first char of first part)
      expect(vm.avatarInitials).toBe('D')
    })

    it('should compute expiryLabel correctly', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.expiryLabel).toBe('1h 1m')
    })

    it('should compute viewerCanDelete correctly', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.viewerCanDelete).toBe(true)
    })

    it('should compute viewerCanDelete as false when not allowed', () => {
      const itemNoDelete = {
        ...baseStoryItem,
        viewerCanDelete: false
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: itemNoDelete },
        global: { stubs: globalStubs }
      })
      const vm = wrapper.vm as any
      expect(vm.viewerCanDelete).toBe(false)
    })
  })

  describe('accessibility', () => {
    it('should have correct role on header', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-header').attributes('role')).toBe('banner')
    })

    it('should have correct aria-label on delete button', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const deleteButton = wrapper.find('.story-viewer-header__action')
      expect(deleteButton.attributes('aria-label')).toBe('Delete story')
    })

    it('should have correct aria-label on close button', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const closeButton = wrapper.findAll('.story-viewer-header__action').at(-1)
      expect(closeButton.attributes('aria-label')).toBe('Close story viewer')
    })
  })

  describe('edge cases', () => {
    it('should handle null displayName', () => {
      const groupNoDisplayName = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoDisplayName, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-header__name').text()).toContain('testuser')
    })

    it('should handle null handle', () => {
      const groupNoHandle = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: null, handle: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupNoHandle, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      expect(wrapper.find('.story-viewer-header__name').text()).toContain('did:plc:test123')
    })

    it('should handle zero expiresInSeconds', () => {
      const itemZeroExpiry = {
        ...baseStoryItem,
        expiresInSeconds: 0
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: itemZeroExpiry },
        global: { stubs: globalStubs }
      })
      const expiry = wrapper.find('.story-viewer-header__expiry')
      expect(expiry.text()).toContain('1m')
    })

    it('should handle very long displayName', () => {
      const groupLongName = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: 'A'.repeat(100) }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupLongName, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const name = wrapper.find('.story-viewer-header__name')
      expect(name.text()).toHaveLength(100)
    })
  })

  describe('security', () => {
    it('should escape HTML in displayName', () => {
      const groupMalicious = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: '<script>alert("xss")</script>' }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupMalicious, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const name = wrapper.find('.story-viewer-header__name')
      expect(name.find('script').exists()).toBe(false)
      expect(name.text()).toContain('<script>alert("xss")</script>')
    })

    it('should escape HTML in avatarInitials', () => {
      const groupMalicious = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, displayName: '<script>alert("xss")</script>', avatarUrl: null }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupMalicious, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const avatar = wrapper.find('.story-viewer-header__avatar')
      expect(avatar.find('script').exists()).toBe(false)
    })

    it('should handle malicious avatarUrl', () => {
      const groupMalicious = {
        ...baseStoryGroup,
        actor: { ...baseStoryGroup.actor, avatarUrl: 'javascript:alert(1)' }
      }
      wrapper = mount(StoryViewerHeader, {
        props: { group: groupMalicious, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const avatar = wrapper.find('.story-viewer-header__avatar')
      const img = avatar.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('javascript:alert(1)')
    })
  })

  describe('styling', () => {
    it('should have correct header classes', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const header = wrapper.find('.story-viewer-header')
      expect(header.classes()).toContain('story-viewer-header')
      expect(header.classes()).toContain('absolute')
      expect(header.classes()).toContain('left-3')
      expect(header.classes()).toContain('right-3')
      expect(header.classes()).toContain('top-7')
      expect(header.classes()).toContain('z-20')
      expect(header.classes()).toContain('flex')
      expect(header.classes()).toContain('items-center')
      expect(header.classes()).toContain('justify-between')
    })

    it('should have correct avatar classes', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const avatar = wrapper.find('.story-viewer-header__avatar')
      expect(avatar.classes()).toContain('story-viewer-header__avatar')
      expect(avatar.classes()).toContain('grid')
      expect(avatar.classes()).toContain('h-9')
      expect(avatar.classes()).toContain('w-9')
      expect(avatar.classes()).toContain('rounded-full')
      expect(avatar.classes()).toContain('bg-white/15')
    })

    it('should have correct action button classes', () => {
      wrapper = mount(StoryViewerHeader, {
        props: { group: baseStoryGroup, item: baseStoryItem },
        global: { stubs: globalStubs }
      })
      const action = wrapper.find('.story-viewer-header__action')
      expect(action.classes()).toContain('story-viewer-header__action')
      expect(action.classes()).toContain('grid')
      expect(action.classes()).toContain('h-9')
      expect(action.classes()).toContain('w-9')
      expect(action.classes()).toContain('rounded-full')
      expect(action.classes()).toContain('bg-white/15')
    })
  })
})
