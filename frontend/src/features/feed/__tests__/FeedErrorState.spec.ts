/**
 * FeedErrorState Component Tests
 * 
 * Comprehensive tests for error state with:
 * - Edge cases
 * - Accessibility
 * - Error message handling
 * - Retry functionality
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FeedErrorState from '../FeedErrorState.vue'

describe('FeedErrorState', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with error message', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error message' }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.feed-error-state').exists()).toBe(true)
      expect(wrapper.text()).toContain('Test error message')
    })

    it('should have role="alert" for accessibility', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      expect(wrapper.attributes('role')).toBe('alert')
    })

    it('should have aria-live="assertive" for accessibility', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      expect(wrapper.attributes('aria-live')).toBe('assertive')
    })
  })

  describe('error display', () => {
    it('should display short error messages', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Error' }
      })
      expect(wrapper.text()).toContain('Error')
    })

    it('should display long error messages', () => {
      const longError = 'This is a very long error message that should be displayed properly'
      wrapper = mount(FeedErrorState, {
        props: { error: longError }
      })
      expect(wrapper.text()).toContain(longError)
    })

    it('should display error messages with special characters', () => {
      const specialError = 'Error: Network & connection failed! @user mentioned'
      wrapper = mount(FeedErrorState, {
        props: { error: specialError }
      })
      expect(wrapper.text()).toContain(specialError)
    })

    it('should safely handle HTML in error messages', () => {
      const htmlError = '<script>alert("xss")</script>Error message'
      wrapper = mount(FeedErrorState, {
        props: { error: htmlError }
      })
      // Should not execute script, just display text
      expect(wrapper.text()).toContain('Error message')
    })
  })

  describe('retry button', () => {
    it('should show retry button when showRetry is true', () => {
      wrapper = mount(FeedErrorState, {
        props: { 
          error: 'Test error',
          showRetry: true,
          onRetry: vi.fn()
        }
      })
      expect(wrapper.find('.feed-error-retry-button').exists()).toBe(true)
    })

    it('should not show retry button when showRetry is false', () => {
      wrapper = mount(FeedErrorState, {
        props: { 
          error: 'Test error',
          showRetry: false
        }
      })
      expect(wrapper.find('.feed-error-retry-button').exists()).toBe(false)
    })

    it('should not show retry button when onRetry is not provided', () => {
      wrapper = mount(FeedErrorState, {
        props: { 
          error: 'Test error',
          showRetry: true
        }
      })
      expect(wrapper.find('.feed-error-retry-button').exists()).toBe(false)
    })

    it('should emit retry event when button clicked', async () => {
      const onRetry = vi.fn()
      wrapper = mount(FeedErrorState, {
        props: { 
          error: 'Test error',
          showRetry: true,
          onRetry
        }
      })
      
      await wrapper.find('.feed-error-retry-button').trigger('click')
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('error icon', () => {
    it('should render error icon', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      expect(wrapper.find('.feed-error-icon').exists()).toBe(true)
    })

    it('should have icon with correct styling', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      const icon = wrapper.find('.feed-error-icon-wrapper')
      expect(icon.exists()).toBe(true)
      const computedStyle = window.getComputedStyle(icon.element)
      expect(computedStyle.borderRadius).toBe('50%')
    })
  })

  describe('styling', () => {
    it('should have correct background color', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      const computedStyle = window.getComputedStyle(wrapper.find('.feed-error-state').element)
      expect(computedStyle.backgroundColor).not.toBe('')
    })

    it('should have border', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      const computedStyle = window.getComputedStyle(wrapper.find('.feed-error-state').element)
      expect(computedStyle.borderWidth).not.toBe('0px')
    })

    it('should have correct border color for error state', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      const computedStyle = window.getComputedStyle(wrapper.find('.feed-error-state').element)
      expect(computedStyle.borderColor).not.toBe('')
    })
  })

  describe('text styling', () => {
    it('should have correct error text color', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      const textElement = wrapper.find('.feed-error-text')
      expect(textElement.exists()).toBe(true)
      const computedStyle = window.getComputedStyle(textElement.element)
      expect(computedStyle.color).not.toBe('')
      expect(computedStyle.fontWeight).toBe('500')
    })

    it('should center text', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: 'Test error' }
      })
      const textElement = wrapper.find('.feed-error-text')
      expect(textElement.exists()).toBe(true)
      const computedStyle = window.getComputedStyle(textElement.element)
      expect(computedStyle.textAlign).toBe('center')
    })
  })

  describe('edge cases', () => {
    it('should handle empty error message', () => {
      wrapper = mount(FeedErrorState, {
        props: { error: '' }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toBe('')
    })

    it('should handle null error message', () => {
      // @ts-expect-error - Testing edge case
      wrapper = mount(FeedErrorState, {
        props: { error: null }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle undefined error message', () => {
      // @ts-expect-error - Testing edge case
      wrapper = mount(FeedErrorState, {
        props: { error: undefined }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('security', () => {
    it('should escape HTML in error messages to prevent XSS', () => {
      const maliciousError = '<img src=x onerror=alert(1)>'
      wrapper = mount(FeedErrorState, {
        props: { error: maliciousError }
      })
      // Should display the text, not execute the script
      expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
      // Verify no img element was created (which would indicate HTML was rendered)
      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('should handle script tags in error messages', () => {
      const scriptError = '<script>document.cookie</script>Error'
      wrapper = mount(FeedErrorState, {
        props: { error: scriptError }
      })
      expect(wrapper.text()).toContain('Error')
      expect(wrapper.find('script').exists()).toBe(false)
    })

    it('should handle very long error messages without breaking layout', () => {
      const veryLongError = 'A'.repeat(1000)
      wrapper = mount(FeedErrorState, {
        props: { error: veryLongError }
      })
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain(veryLongError.slice(0, 100))
    })
  })
})
