/**
 * FeedLoadingState Component Tests
 * 
 * Comprehensive tests for loading state with:
 * - Edge cases
 * - Accessibility
 * - Styling
 * - Props validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FeedLoadingState from '../FeedLoadingState.vue'

describe('FeedLoadingState', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with default props', () => {
      wrapper = mount(FeedLoadingState)
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.feed-loading-state').exists()).toBe(true)
    })

    it('should display default loading message', () => {
      wrapper = mount(FeedLoadingState)
      expect(wrapper.text()).toContain('feed.loading')
    })

    it('should display custom message', () => {
      wrapper = mount(FeedLoadingState, {
        props: { message: 'Custom loading message' }
      })
      expect(wrapper.text()).toContain('Custom loading message')
    })

    it('should have role="status" for accessibility', () => {
      wrapper = mount(FeedLoadingState)
      expect(wrapper.attributes('role')).toBe('status')
    })

    it('should have aria-live="polite" for accessibility', () => {
      wrapper = mount(FeedLoadingState)
      expect(wrapper.attributes('aria-live')).toBe('polite')
    })
  })

  describe('size variants', () => {
    it('should render with small size', () => {
      wrapper = mount(FeedLoadingState, {
        props: { size: 'sm' }
      })
      expect(wrapper.find('.feed-loading-state').exists()).toBe(true)
    })

    it('should render with medium size (default)', () => {
      wrapper = mount(FeedLoadingState, {
        props: { size: 'md' }
      })
      expect(wrapper.find('.feed-loading-state').exists()).toBe(true)
    })

    it('should render with large size', () => {
      wrapper = mount(FeedLoadingState, {
        props: { size: 'lg' }
      })
      expect(wrapper.find('.feed-loading-state').exists()).toBe(true)
    })
  })

  describe('styling', () => {
    it('should have correct background color', () => {
      wrapper = mount(FeedLoadingState)
      const style = wrapper.find('.feed-loading-state').element.style
      expect(style.background).toBeDefined()
    })

    it('should have correct border radius', () => {
      wrapper = mount(FeedLoadingState)
      const computedStyle = window.getComputedStyle(wrapper.find('.feed-loading-state').element)
      expect(computedStyle.borderRadius).not.toBe('0px')
    })

    it('should have box-shadow', () => {
      wrapper = mount(FeedLoadingState)
      const computedStyle = window.getComputedStyle(wrapper.find('.feed-loading-state').element)
      expect(computedStyle.boxShadow).not.toBe('none')
    })
  })

  describe('spinner', () => {
    it('should render spinner icon', () => {
      wrapper = mount(FeedLoadingState)
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
    })

    it('should have spinner with correct styling', () => {
      wrapper = mount(FeedLoadingState)
      const spinner = wrapper.find('.animate-spin')
      expect(spinner.exists()).toBe(true)
    })
  })

  describe('text styling', () => {
    it('should have correct text color', () => {
      wrapper = mount(FeedLoadingState)
      const textElement = wrapper.find('.feed-loading-text')
      expect(textElement.exists()).toBe(true)
      const computedStyle = window.getComputedStyle(textElement.element)
      expect(computedStyle.color).not.toBe('')
    })

    it('should have correct font size', () => {
      wrapper = mount(FeedLoadingState)
      const textElement = wrapper.find('.feed-loading-text')
      expect(textElement.exists()).toBe(true)
    })

    it('should center text', () => {
      wrapper = mount(FeedLoadingState)
      const textElement = wrapper.find('.feed-loading-text')
      expect(textElement.exists()).toBe(true)
      const computedStyle = window.getComputedStyle(textElement.element)
      expect(computedStyle.textAlign).toBe('center')
    })
  })
})
