/**
 * useMediaViewerGestures Composable Tests
 * 
 * Basic tests for media viewer gesture handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useMediaViewerGestures } from '../useMediaViewerGestures'

describe('useMediaViewerGestures', () => {
  let element: HTMLElement
  let disableGestures: { value: boolean }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    element = document.createElement('div')
    element.style.width = '100px'
    element.style.height = '100px'
    document.body.appendChild(element)
    
    disableGestures = { value: false }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
    document.body.removeChild(element)
  })

  const createGestures = () => useMediaViewerGestures({
    element: ref(element),
    disableGestures: ref(disableGestures.value)
  })

  describe('initialization', () => {
    it('should return all gesture handlers', () => {
      const gestures = createGestures()
      
      expect(gestures.handleKeyDown).toBeDefined()
      expect(gestures.handleTouchStart).toBeDefined()
      expect(gestures.handleTouchMove).toBeDefined()
      expect(gestures.handleTouchEnd).toBeDefined()
      expect(gestures.handleMouseDown).toBeDefined()
      expect(gestures.handleMouseMove).toBeDefined()
      expect(gestures.handleMouseUp).toBeDefined()
      expect(gestures.handleWheel).toBeDefined()
    })
  })

  describe('handler types', () => {
    it('should have keyboard handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleKeyDown).toBe('function')
    })

    it('should have touch start handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleTouchStart).toBe('function')
    })

    it('should have touch move handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleTouchMove).toBe('function')
    })

    it('should have touch end handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleTouchEnd).toBe('function')
    })

    it('should have mouse down handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleMouseDown).toBe('function')
    })

    it('should have mouse move handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleMouseMove).toBe('function')
    })

    it('should have mouse up handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleMouseUp).toBe('function')
    })

    it('should have wheel handler as function', () => {
      const gestures = createGestures()
      expect(typeof gestures.handleWheel).toBe('function')
    })
  })

  describe('with null element', () => {
    it('should handle null element gracefully', () => {
      const gestures = useMediaViewerGestures({
        element: ref(null),
        disableGestures: ref(false)
      })
      
      expect(gestures.handleKeyDown).toBeDefined()
      expect(gestures.handleTouchStart).toBeDefined()
    })
  })
})
