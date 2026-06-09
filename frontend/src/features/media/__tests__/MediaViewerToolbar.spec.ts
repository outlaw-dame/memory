/**
 * MediaViewerToolbar Component Tests - Basic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MediaViewerToolbar from '../MediaViewerToolbar.vue'

describe('MediaViewerToolbar', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    if (typeof navigator !== 'undefined') {
      navigator.share = vi.fn()
    }
  })

  describe('basic rendering', () => {
    it('should render with required props', () => {
      wrapper = mount(MediaViewerToolbar, {
        props: { mediaUrl: 'https://example.com/media.jpg' },
        global: { stubs: { AppIcon: true } }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should have toolbar class', () => {
      wrapper = mount(MediaViewerToolbar, {
        props: { mediaUrl: 'https://example.com/media.jpg' },
        global: { stubs: { AppIcon: true } }
      })
      expect(wrapper.find('.media-viewer-toolbar').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('should accept mediaUrl', () => {
      wrapper = mount(MediaViewerToolbar, {
        props: { mediaUrl: 'https://example.com/media.jpg' },
        global: { stubs: { AppIcon: true } }
      })
      expect(wrapper.vm.mediaUrl).toBe('https://example.com/media.jpg')
    })

    it('should accept canShare', () => {
      wrapper = mount(MediaViewerToolbar, {
        props: { mediaUrl: 'https://example.com/media.jpg', canShare: true },
        global: { stubs: { AppIcon: true } }
      })
      expect(wrapper.vm.canShare).toBe(true)
    })

    it('should accept canDownload', () => {
      wrapper = mount(MediaViewerToolbar, {
        props: { mediaUrl: 'https://example.com/media.jpg', canDownload: true },
        global: { stubs: { AppIcon: true } }
      })
      expect(wrapper.vm.canDownload).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty mediaUrl', () => {
      wrapper = mount(MediaViewerToolbar, {
        props: { mediaUrl: '' },
        global: { stubs: { AppIcon: true } }
      })
      expect(wrapper.exists()).toBe(true)
    })
  })
})
