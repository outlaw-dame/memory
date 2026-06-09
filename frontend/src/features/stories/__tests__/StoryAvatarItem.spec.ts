/**
 * StoryAvatarItem Component Tests
 * 
 * Comprehensive tests for story avatar item with:
 * - Edge cases
 * - Accessibility
 * - Seen/unseen state handling
 * - Avatar rendering
 * - Click handling
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StoryAvatarItem from '../StoryAvatarItem.vue'
import type { StoryGroup } from '@/stores/atBridgeStore'

// Test data helper
const baseActor = {
  did: 'did:plc:test123',
  handle: 'testuser',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  isViewer: false
}

const baseGroup: StoryGroup = {
  actor: { ...baseActor },
  latestAt: '2024-01-01T00:00:00Z',
  seen: false,
  items: []
}

describe('StoryAvatarItem', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with required props', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.story-avatar-item').exists()).toBe(true)
    })

    it('should render avatar image when avatarUrl is provided', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.find('img').attributes('src')).toBe('https://example.com/avatar.jpg')
    })

    it('should render initials when avatarUrl is not provided', () => {
      const groupNoAvatar = {
        ...baseGroup,
        actor: { ...baseGroup.actor, avatarUrl: null }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: groupNoAvatar, index: 0 }
      })
      expect(wrapper.find('img').exists()).toBe(false)
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('TU')
    })

    it('should render initials fallback when displayName is null', () => {
      const groupNoName = {
        ...baseGroup,
        actor: { ...baseGroup.actor, avatarUrl: null, displayName: null, handle: null, did: 'did:test' }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: groupNoName, index: 0 }
      })
      // Check that avatar shows initials from did
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('D')
    })

    it('should display actor label correctly', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.find('.story-avatar-item__label').text()).toContain('Test User')
    })

    it('should display "You" for viewer', () => {
      const viewerGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, isViewer: true, displayName: 'Test User' }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: viewerGroup, index: 0, isViewer: true }
      })
      expect(wrapper.find('.story-avatar-item__label').text()).toContain('You')
    })
  })

  describe('seen/unseen state', () => {
    it('should apply unseen class when group is unseen', () => {
      const unseenGroup = { ...baseGroup, seen: false }
      wrapper = mount(StoryAvatarItem, {
        props: { group: unseenGroup, index: 0 }
      })
      expect(wrapper.classes()).toContain('story-avatar-item--unseen')
      expect(wrapper.find('.story-avatar-item__avatar').classes()).toContain('border-system-blue')
    })

    it('should apply seen class when group is seen', () => {
      const seenGroup = { ...baseGroup, seen: true }
      wrapper = mount(StoryAvatarItem, {
        props: { group: seenGroup, index: 0 }
      })
      expect(wrapper.classes()).toContain('story-avatar-item--seen')
      expect(wrapper.find('.story-avatar-item__avatar').classes()).toContain('border-separator')
      expect(wrapper.find('.story-avatar-item__avatar').classes()).toContain('opacity-75')
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-label', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.attributes('aria-label')).toBe('Open Test User story')
    })

    it('should have button role', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.element.tagName.toLowerCase()).toBe('button')
    })

    it('should have type="button"', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.attributes('type')).toBe('button')
    })
  })

  describe('click handling', () => {
    it('should emit open event with index when clicked', async () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 5 }
      })
      
      await wrapper.trigger('click')
      expect(wrapper.emitted('open')).toBeTruthy()
      expect(wrapper.emitted('open')?.[0]).toEqual([5])
    })

    it('should not emit open event when not clicked', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      
      expect(wrapper.emitted('open')).toBeFalsy()
    })
  })

  describe('initials calculation', () => {
    it('should calculate initials from displayName', () => {
      const groupWithDisplayName = {
        ...baseGroup,
        actor: { ...baseGroup.actor, displayName: 'John Doe', avatarUrl: null }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: groupWithDisplayName, index: 0 }
      })
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('JD')
    })

    it('should handle single word displayName', () => {
      const singleNameGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, displayName: 'John', avatarUrl: null }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: singleNameGroup, index: 0 }
      })
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('J')
    })

    it('should handle displayName with multiple spaces', () => {
      const multiSpaceGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, displayName: 'John  Doe   Smith', avatarUrl: null }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: multiSpaceGroup, index: 0 }
      })
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('JD')
    })

    it('should limit initials to 2 characters', () => {
      const longNameGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, displayName: 'John Doe Smith Wilson', avatarUrl: null }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: longNameGroup, index: 0 }
      })
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('JD')
    })

    it('should handle empty displayName', () => {
      const emptyNameGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, displayName: '', handle: '', avatarUrl: null }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: emptyNameGroup, index: 0 }
      })
      const avatarSpan = wrapper.find('.story-avatar-item__avatar span')
      expect(avatarSpan.exists()).toBe(true)
      expect(avatarSpan.text()).toBe('D')
    })
  })

  describe('security', () => {
    it('should escape HTML in displayName to prevent XSS', () => {
      const maliciousGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, displayName: '<script>alert("xss")</script>Test' }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: maliciousGroup, index: 0, isViewer: false }
      })
      expect(wrapper.text()).toContain('<script>alert("xss")</script>Test')
      expect(wrapper.find('script').exists()).toBe(false)
    })

    it('should handle malicious avatarUrl', () => {
      const maliciousUrlGroup = {
        ...baseGroup,
        actor: { ...baseGroup.actor, avatarUrl: 'javascript:alert(1)' }
      }
      wrapper = mount(StoryAvatarItem, {
        props: { group: maliciousUrlGroup, index: 0 }
      })
      expect(wrapper.find('img').exists()).toBe(true)
      expect(wrapper.find('img').attributes('src')).toBe('javascript:alert(1)')
    })
  })

  describe('styling', () => {
    it('should have story-avatar-item class', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      expect(wrapper.classes()).toContain('story-avatar-item')
    })

    it('should have story-avatar-item__avatar class', () => {
      wrapper = mount(StoryAvatarItem, {
        props: { group: baseGroup, index: 0 }
      })
      const avatar = wrapper.find('.story-avatar-item__avatar')
      expect(avatar.exists()).toBe(true)
      expect(avatar.classes()).toContain('story-avatar-item__avatar')
    })
  })
})
