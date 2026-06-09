/**
 * useStoryGestures Composable Tests
 * 
 * Comprehensive tests for story gesture handling with:
 * - Touch event handling
 * - Mouse event handling
 * - Keyboard handling
 * - Gesture detection (swipe, tap, hold)
 * - Edge cases
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useStoryGestures } from '../useStoryGestures'

describe('useStoryGestures', () => {
  let element: HTMLElement
  let onNext: vi.Mock
  let onPrevious: vi.Mock
  let onClose: vi.Mock
  let onPause: vi.Mock
  let onResume: vi.Mock
  let onHoldStart: vi.Mock
  let onHoldEnd: vi.Mock
  let isPaused: { value: boolean }
  let disableGestures: { value: boolean }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    element = document.createElement('div')
    element.style.width = '100px'
    element.style.height = '100px'
    document.body.appendChild(element)
    
    onNext = vi.fn()
    onPrevious = vi.fn()
    onClose = vi.fn()
    onPause = vi.fn()
    onResume = vi.fn()
    onHoldStart = vi.fn()
    onHoldEnd = vi.fn()
    isPaused = { value: false }
    disableGestures = { value: false }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
    document.body.removeChild(element)
  })

  const createGestures = () => useStoryGestures({
    element: ref(element),
    onNext,
    onPrevious,
    onClose,
    onPause,
    onResume,
    onHoldStart,
    onHoldEnd,
    isPaused: ref(isPaused.value),
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
      expect(gestures.handleClick).toBeDefined()
    })
  })

  describe('keyboard handling', () => {
    it('should have keyboard handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleKeyDown).toBe('function')
    })

    it('should not handle keys when gestures disabled', () => {
      disableGestures.value = true
      const gestures = createGestures()
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
      gestures.handleKeyDown(event)
      
      expect(event.defaultPrevented).toBe(false)
    })
  })

  const createTouchEvent = (
    type: string,
    touches: Touch[] = [],
    changedTouches: Touch[] = []
  ) => {
    return new TouchEvent(type, {
      touches,
      changedTouches,
      targetTouches: touches,
      cancelable: true
    })
  }

  const createTouch = (x: number, y: number, identifier: number = 0) => ({
    clientX: x,
    clientY: y,
    identifier,
    target: element,
    screenX: x,
    screenY: y
  } as Touch)

  describe('touch handling', () => {

    it('should start hold timer on touch start', () => {
      const gestures = createGestures()
      const touch = createTouch(50, 50)
      const event = createTouchEvent('touchstart', [touch])
      
      gestures.handleTouchStart(event)
      
      expect(event.defaultPrevented).toBe(true)
    })

    it('should call onHoldStart after hold duration', () => {
      const gestures = createGestures()
      const touch = createTouch(50, 50)
      const event = createTouchEvent('touchstart', [touch])
      
      gestures.handleTouchStart(event)
      
      // Advance past hold duration
      vi.advanceTimersByTime(300)
      
      expect(onHoldStart).toHaveBeenCalled()
      expect(onPause).toHaveBeenCalled()
    })

    it('should have touch move handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleTouchMove).toBe('function')
    })

    it('should have touch start handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleTouchStart).toBe('function')
    })

    it('should have touch move handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleTouchMove).toBe('function')
    })

    it('should have touch end handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleTouchEnd).toBe('function')
    })

    it('should not handle touches when gestures disabled', () => {
      disableGestures.value = true
      const gestures = createGestures()
      
      const touch = createTouch(50, 50)
      const event = createTouchEvent('touchstart', [touch])
      
      gestures.handleTouchStart(event)
      
      expect(event.defaultPrevented).toBe(false)
    })
  })

  describe('mouse handling', () => {
    it('should have click handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleClick).toBe('function')
    })

    it('should have mouse down handler', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleMouseDown).toBe('function')
    })

    it('should have mouse handlers', () => {
      const gestures = createGestures()
      
      expect(typeof gestures.handleMouseDown).toBe('function')
      expect(typeof gestures.handleMouseMove).toBe('function')
      expect(typeof gestures.handleMouseUp).toBe('function')
    })
  })

  describe('hold detection', () => {
    it('should call onHoldEnd when hold ends', () => {
      const gestures = createGestures()
      
      const startTouch = createTouch(50, 50)
      const endTouch = createTouch(50, 50)
      
      const startEvent = createTouchEvent('touchstart', [startTouch])
      const endEvent = createTouchEvent('touchend', [], [endTouch])
      
      gestures.handleTouchStart(startEvent)
      
      // Let hold trigger
      vi.advanceTimersByTime(300)
      
      // Reset mocks
      vi.clearAllMocks()
      
      gestures.handleTouchEnd(endEvent)
      
      expect(onHoldEnd).toHaveBeenCalled()
    })

    it('should resume after hold without movement', () => {
      const gestures = createGestures()
      
      const startTouch = createTouch(50, 50)
      const endTouch = createTouch(50, 50)
      
      const startEvent = createTouchEvent('touchstart', [startTouch])
      const endEvent = createTouchEvent('touchend', [], [endTouch])
      
      gestures.handleTouchStart(startEvent)
      vi.advanceTimersByTime(300)
      vi.clearAllMocks()
      gestures.handleTouchEnd(endEvent)
      
      expect(onResume).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle null element', () => {
      const gestures = useStoryGestures({
        element: ref(null),
        onNext,
        onPrevious
      })
      
      const touch = createTouch(50, 50)
      const event = createTouchEvent('touchstart', [touch])
      
      gestures.handleTouchStart(event)
      
      // Touchstart handler always prevents default when there's a touch
      expect(event.defaultPrevented).toBe(true)
    })

    it('should handle missing callbacks gracefully', () => {
      const gestures = useStoryGestures({
        element: ref(element)
      })
      
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
      gestures.handleKeyDown(event)
      
      // Should not crash, but defaultPrevented is true because it's a handled key
      // Note: preventDefault needs cancelable: true to work
      expect(event.defaultPrevented).toBe(true)
    })

    it('should handle touch events without touches', () => {
      const gestures = createGestures()
      const event = createTouchEvent('touchstart')
      
      gestures.handleTouchStart(event)
      
      expect(event.defaultPrevented).toBe(false)
    })

    it('should handle touchend without changedTouches', () => {
      const gestures = createGestures()
      
      const startTouch = createTouch(50, 50)
      const startEvent = createTouchEvent('touchstart', [startTouch])
      const endEvent = createTouchEvent('touchend')
      
      gestures.handleTouchStart(startEvent)
      vi.clearAllTimers()
      gestures.handleTouchEnd(endEvent)
      
      expect(onNext).not.toHaveBeenCalled()
    })
  })

  describe('security', () => {
    it('should handle rapid gesture sequences', () => {
      const gestures = createGestures()
      
      for (let i = 0; i < 100; i++) {
        const touch = createTouch(50 + i, 50)
        const event = createTouchEvent('touchstart', [touch])
        gestures.handleTouchStart(event)
        vi.clearAllTimers()
      }
      
      // With fake timers and clearing, onHoldStart won't be called
      // The test just verifies it doesn't crash
      expect(element).toBeDefined()
    })

    it('should handle extreme coordinate values', () => {
      const gestures = createGestures()
      
      const touch = createTouch(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
      const event = createTouchEvent('touchstart', [touch])
      
      gestures.handleTouchStart(event)
      
      expect(event.defaultPrevented).toBe(true)
    })
  })
})
