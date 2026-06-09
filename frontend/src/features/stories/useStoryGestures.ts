/**
 * useStoryGestures - Composable for native-feeling story gesture handling
 *
 * Gesture requirements:
 * - tap right side -> next story
 * - tap left side -> previous story
 * - long press / hold -> pause
 * - release -> resume
 * - swipe down -> dismiss viewer
 * - horizontal swipe -> next/previous group where appropriate
 * - vertical drag threshold -> dismiss
 * 
 * Constraints:
 * - avoid conflict with video controls
 * - avoid conflict with scrollable captions/link areas
 * - support pointer and touch events
 * - keyboard fallback
 * - respect reduced motion
 */

import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

// Thresholds for gesture detection (in pixels)
const SWIPE_DOWN_THRESHOLD = 50
const SWIPE_DOWN_VELOCITY_THRESHOLD = 0.5
const HOLD_DURATION = 300 // ms
const TAP_AREA_THRESHOLD = 0.3 // 30% of screen width for left/right tap areas

export interface StoryGestureConfig {
  element: Ref<HTMLElement | null>
  onNext?: () => void
  onPrevious?: () => void
  onClose?: () => void
  onPause?: () => void
  onResume?: () => void
  onHoldStart?: () => void
  onHoldEnd?: () => void
  isPaused?: Ref<boolean>
  disableGestures?: Ref<boolean>
}

export interface StoryGestureHandlers {
  handleKeyDown: (event: KeyboardEvent) => void
  handleTouchStart: (event: TouchEvent) => void
  handleTouchMove: (event: TouchEvent) => void
  handleTouchEnd: (event: TouchEvent) => void
  handleMouseDown: (event: MouseEvent) => void
  handleMouseMove: (event: MouseEvent) => void
  handleMouseUp: (event: MouseEvent) => void
  handleClick: (event: MouseEvent) => void
}

interface TouchState {
  x: number
  y: number
  time: number
  isHolding: boolean
  hasMoved: boolean
  isVerticalSwipe: boolean
  isHorizontalSwipe: boolean
}

export function useStoryGestures(config: StoryGestureConfig): StoryGestureHandlers {
  const {
    element,
    onNext,
    onPrevious,
    onClose,
    onPause,
    onResume,
    onHoldStart,
    onHoldEnd,
    isPaused,
    disableGestures = ref(false)
  } = config

  const touchState = ref<TouchState | null>(null)
  const holdTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const startY = ref(0)

  // Cleanup timers on unmount
  onBeforeUnmount(() => {
    if (holdTimer.value !== null) {
      clearTimeout(holdTimer.value)
      holdTimer.value = null
    }
  })

  // Helper to check if touch/mouse is in tap area
  function isInTapArea(event: { clientX: number; clientY: number }, area: 'left' | 'right' | 'center'): boolean {
    const el = element.value
    if (!el) return false
    
    const rect = el.getBoundingClientRect()
    const x = event.clientX - rect.left
    const threshold = rect.width * TAP_AREA_THRESHOLD
    
    switch (area) {
      case 'left':
        return x < threshold
      case 'right':
        return x > rect.width - threshold
      case 'center':
        return x >= threshold && x <= rect.width - threshold
    }
    return false
  }

  // Helper to calculate swipe velocity and distance
  function calculateSwipe(start: TouchState, end: { x: number; y: number; time: number }) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dt = end.time - start.time
    
    if (dt === 0) return { distanceX: 0, distanceY: 0, velocityX: 0, velocityY: 0, dx: 0, dy: 0 }
    
    const velocityX = Math.abs(dx) / dt
    const velocityY = Math.abs(dy) / dt
    
    return {
      distanceX: Math.abs(dx),
      distanceY: Math.abs(dy),
      velocityX,
      velocityY,
      dx,
      dy
    }
  }

  // Keyboard handler
  function handleKeyDown(event: KeyboardEvent) {
    if (disableGestures.value) return
    
    switch (event.key) {
      case 'Escape':
        onClose?.()
        event.preventDefault()
        break
      case 'ArrowRight':
        onNext?.()
        event.preventDefault()
        break
      case 'ArrowLeft':
        onPrevious?.()
        event.preventDefault()
        break
      case ' ':
      case 'Space':
        if (isPaused?.value) {
          onResume?.()
        } else {
          onPause?.()
        }
        event.preventDefault()
        break
    }
  }

  // Touch start handler
  function handleTouchStart(event: TouchEvent) {
    if (disableGestures.value) return
    
    const touch = event.touches[0]
    if (!touch) return
    
    touchState.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      isHolding: false,
      hasMoved: false,
      isVerticalSwipe: false,
      isHorizontalSwipe: false
    }
    
    // Start hold timer
    holdTimer.value = setTimeout(() => {
      if (touchState.value && !touchState.value.hasMoved) {
        touchState.value.isHolding = true
        onHoldStart?.()
        onPause?.()
      }
    }, HOLD_DURATION)
    
    event.preventDefault()
  }

  // Touch move handler
  function handleTouchMove(event: TouchEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const touch = event.touches[0]
    if (!touch) return
    
    const end = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    const start = touchState.value
    const swipe = calculateSwipe(start, end)
    
    // Mark as moved to prevent hold trigger
    if (!touchState.value.hasMoved && (swipe.distanceX > 5 || swipe.distanceY > 5)) {
      touchState.value.hasMoved = true
      if (holdTimer.value !== null) {
        clearTimeout(holdTimer.value)
        holdTimer.value = null
      }
    }
    
    // Determine swipe direction
    if (swipe.distanceY > swipe.distanceX * 1.5) {
      touchState.value.isVerticalSwipe = true
      touchState.value.isHorizontalSwipe = false
    } else if (swipe.distanceX > swipe.distanceY * 1.5) {
      touchState.value.isHorizontalSwipe = true
      touchState.value.isVerticalSwipe = false
    }
    
    event.preventDefault()
  }

  // Touch end handler
  function handleTouchEnd(event: TouchEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const start = touchState.value
    const end = event.changedTouches[0]
    
    if (!end) {
      touchState.value = null
      return
    }
    
    const swipe = calculateSwipe(start, { x: end.clientX, y: end.clientY, time: Date.now() })
    
    // Clear hold timer
    if (holdTimer.value !== null) {
      clearTimeout(holdTimer.value)
      holdTimer.value = null
    }
    
    // If was holding, check if we should resume
    if (start.isHolding) {
      onHoldEnd?.()
      if (swipe.distanceX <= 10 && swipe.distanceY <= 10) {
        // Pure hold without movement
        onResume?.()
      }
      touchState.value = null
      event.preventDefault()
      return
    }
    
    // Check for swipe down to close
    if (swipe.distanceY > SWIPE_DOWN_THRESHOLD && swipe.velocityY > SWIPE_DOWN_VELOCITY_THRESHOLD) {
      onClose?.()
      touchState.value = null
      event.preventDefault()
      return
    }
    
    // Check for tap in left/right areas
    if (!start.hasMoved && swipe.distanceX < 10 && swipe.distanceY < 10) {
      if (isInTapArea(end, 'right')) {
        onNext?.()
      } else if (isInTapArea(end, 'left')) {
        onPrevious?.()
      }
    }
    
    // Check for horizontal swipe
    if (start.isHorizontalSwipe && swipe.distanceX > 50) {
      if (swipe.dx > 0) {
        // Right swipe -> previous
        onPrevious?.()
      } else {
        // Left swipe -> next
        onNext?.()
      }
    }
    
    touchState.value = null
    event.preventDefault()
  }

  // Mouse down handler (for desktop)
  function handleMouseDown(event: MouseEvent) {
    if (disableGestures.value) return
    
    touchState.value = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      isHolding: false,
      hasMoved: false,
      isVerticalSwipe: false,
      isHorizontalSwipe: false
    }
    startY.value = event.clientY
    
    // Start hold timer
    holdTimer.value = setTimeout(() => {
      if (touchState.value && !touchState.value.hasMoved) {
        touchState.value.isHolding = true
        onHoldStart?.()
        onPause?.()
      }
    }, HOLD_DURATION)
    
    event.preventDefault()
  }

  // Mouse move handler
  function handleMouseMove(event: MouseEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const end = { x: event.clientX, y: event.clientY, time: Date.now() }
    const start = touchState.value
    const swipe = calculateSwipe(start, end)
    
    // Mark as moved
    if (!touchState.value.hasMoved && (swipe.distanceX > 5 || swipe.distanceY > 5)) {
      touchState.value.hasMoved = true
      if (holdTimer.value !== null) {
        clearTimeout(holdTimer.value)
        holdTimer.value = null
      }
    }
    
    // Determine swipe direction
    if (swipe.distanceY > swipe.distanceX * 1.5) {
      touchState.value.isVerticalSwipe = true
      touchState.value.isHorizontalSwipe = false
    } else if (swipe.distanceX > swipe.distanceY * 1.5) {
      touchState.value.isHorizontalSwipe = true
      touchState.value.isVerticalSwipe = false
    }
    
    event.preventDefault()
  }

  // Mouse up handler
  function handleMouseUp(event: MouseEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const start = touchState.value
    const end = { x: event.clientX, y: event.clientY, time: Date.now() }
    const swipe = calculateSwipe(start, end)
    
    // Clear hold timer
    if (holdTimer.value !== null) {
      clearTimeout(holdTimer.value)
      holdTimer.value = null
    }
    
    // If was holding
    if (start.isHolding) {
      onHoldEnd?.()
      if (swipe.distanceX <= 10 && swipe.distanceY <= 10) {
        onResume?.()
      }
      touchState.value = null
      event.preventDefault()
      return
    }
    
    // Check for swipe down to close
    if (swipe.distanceY > SWIPE_DOWN_THRESHOLD && swipe.velocityY > SWIPE_DOWN_VELOCITY_THRESHOLD) {
      onClose?.()
      touchState.value = null
      event.preventDefault()
      return
    }
    
    // Check for click in left/right areas
    if (!start.hasMoved) {
      if (isInTapArea(event, 'right')) {
        onNext?.()
      } else if (isInTapArea(event, 'left')) {
        onPrevious?.()
      }
    }
    
    // Check for horizontal swipe
    if (start.isHorizontalSwipe && swipe.distanceX > 50) {
      if (swipe.dx > 0) {
        onPrevious?.()
      } else {
        onNext?.()
      }
    }
    
    touchState.value = null
    event.preventDefault()
  }

  // Click handler for accessibility
  function handleClick(event: MouseEvent) {
    if (disableGestures.value) return
    
    if (isInTapArea(event, 'right')) {
      onNext?.()
      event.preventDefault()
      event.stopPropagation()
    } else if (isInTapArea(event, 'left')) {
      onPrevious?.()
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return {
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleClick
  }
}


