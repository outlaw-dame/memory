/**
 * MediaViewerGestureLayer Component Tests - Basic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MediaViewerGestureLayer from '../MediaViewerGestureLayer.vue'

describe('MediaViewerGestureLayer', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render with default props', () => {
      wrapper = mount(MediaViewerGestureLayer, {
        props: {},
        global: { stubs: { Teleport: true } }
      })
      expect(wrapper.exists()).toBe(true)
    })

    it('should have gesture layer class', () => {
      wrapper = mount(MediaViewerGestureLayer, {
        props: {},
        global: { stubs: { Teleport: true } }
      })
      expect(wrapper.find('.media-viewer-gesture-layer').exists()).toBe(true)
    })
  })

  describe('props', () => {
    it('should accept onSwipeLeft', () => {
      const onSwipeLeft = vi.fn()
      wrapper = mount(MediaViewerGestureLayer, {
        props: { onSwipeLeft },
        global: { stubs: { Teleport: true } }
      })
      expect(wrapper.vm.onSwipeLeft).toBe(onSwipeLeft)
    })

    it('should accept disableGestures', () => {
      wrapper = mount(MediaViewerGestureLayer, {
        props: { disableGestures: true },
        global: { stubs: { Teleport: true } }
      })
      expect(wrapper.vm.disableGestures).toBe(true)
    })
  })
})
