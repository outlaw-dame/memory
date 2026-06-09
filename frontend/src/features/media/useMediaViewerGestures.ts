/**
 * useMediaViewerGestures - Composable for media viewer gesture handling
 *
 * Gesture requirements:
 * - swipe left/right -> next/previous media
 * - swipe down -> dismiss
 * - tap -> toggle chrome
 * - double-tap -> zoom
 * - pinch -> zoom
 * - drag when zoomed -> pan
 *
 * Constraints:
 * - Respect safe areas
 * - Respect reduced motion
 * - Support both touch and mouse
 */

import { onBeforeUnmount, ref, type Ref } from 'vue'

// Thresholds
const SWIPE_THRESHOLD = 50
const SWIPE_VELOCITY_THRESHOLD = 0.5
const DOUBLE_TAP_THRESHOLD = 300 // ms
const TAP_MOVEMENT_THRESHOLD = 10 // px
const HOLD_DURATION = 300 // ms for long press

export interface MediaViewerConfig {
  element: Ref<HTMLElement | null>
  onNext?: () => void
  onPrevious?: () => void
  onClose?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onPinchStart?: () => void
  onPinch?: (scale: number) => void
  onPinchEnd?: () => void
  onDragStart?: () => void
  onDrag?: (dx: number, dy: number) => void
  onDragEnd?: () => void
  isZoomed?: Ref<boolean>
  disableGestures?: Ref<boolean>
}

export interface MediaViewerGestureHandlers {
  handleKeyDown: (event: KeyboardEvent) => void
  handleTouchStart: (event: TouchEvent) => void
  handleTouchMove: (event: TouchEvent) => void
  handleTouchEnd: (event: TouchEvent) => void
  handleMouseDown: (event: MouseEvent) => void
  handleMouseMove: (event: MouseEvent) => void
  handleMouseUp: (event: MouseEvent) => void
  handleWheel: (event: WheelEvent) => void
}

interface TouchState {
  x: number
  y: number
  time: number
  isPinching: boolean
  hasMoved: boolean
}

interface DragState {
  startX: number
  startY: number
  active: boolean
}

export function useMediaViewerGestures(config: MediaViewerConfig): MediaViewerGestureHandlers {
  const {
    element,
    onNext,
    onPrevious,
    onClose,
    onTap,
    onDoubleTap,
    onPinchStart,
    onPinch,
    onPinchEnd,
    onDragStart,
    onDrag,
    onDragEnd,
    isZoomed,
    disableGestures = ref(false)
  } = config

  const touchState = ref<TouchState | null>(null)
  const dragState = ref<DragState>({ startX: 0, startY: 0, active: false })
  const pinchStartDistance = ref(0)
  const lastTapTime = ref(0)
  const holdTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  onBeforeUnmount(() => {
    if (holdTimer.value !== null) {
      clearTimeout(holdTimer.value)
    }
  })

  // Helper to calculate swipe
  function calculateSwipe(
    start: TouchState,
    end: { x: number; y: number; time: number }
  ) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const dt = end.time - start.time
    
    if (dt === 0) return { distanceX: 0, distanceY: 0, velocityX: 0, velocityY: 0, dx, dy }
    
    return {
      distanceX: Math.abs(dx),
      distanceY: Math.abs(dy),
      velocityX: Math.abs(dx) / dt,
      velocityY: Math.abs(dy) / dt,
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
        break
      case 'ArrowRight':
        onNext?.()
        break
      case 'ArrowLeft':
        onPrevious?.()
        break
      case ' ':
      case 'Space':
        onTap?.()
        event.preventDefault()
        break
    }
  }

  // Touch start handler
  function handleTouchStart(event: TouchEvent) {
    if (disableGestures.value) return
    
    const touch = event.touches[0]
    if (!touch) return
    
    // Check for pinch
    if (event.touches.length === 2) {
      const t1 = event.touches[0]
      const t2 = event.touches[1]
      pinchStartDistance.value = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      touchState.value = {
        x: 0,
        y: 0,
        time: Date.now(),
        isPinching: true,
        hasMoved: false
      }
      onPinchStart?.()
      event.preventDefault()
      return
    }
    
    touchState.value = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      isPinching: false,
      hasMoved: false
    }
    
    // Start hold timer for long press
    holdTimer.value = setTimeout(() => {
      if (touchState.value && !touchState.value.hasMoved) {
        // Long press action could be used for additional controls
      }
    }, HOLD_DURATION)
  }

  // Touch move handler
  function handleTouchMove(event: TouchEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const start = touchState.value
    
    // Handle pinch
    if (start.isPinching && event.touches.length === 2) {
      const t1 = event.touches[0]
      const t2 = event.touches[1]
      const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const scale = currentDistance / pinchStartDistance.value
      onPinch?.(Math.max(1, Math.min(4, scale)))
      event.preventDefault()
      return
    }
    
    const touch = event.touches[0]
    if (!touch) return
    
    const end = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    const swipe = calculateSwipe(start, end)
    
    // Mark as moved
    if (!start.hasMoved && (swipe.distanceX > 5 || swipe.distanceY > 5)) {
      start.hasMoved = true
      if (holdTimer.value !== null) {
        clearTimeout(holdTimer.value)
        holdTimer.value = null
      }
    }
    
    // If zoomed, handle drag
    if (isZoomed?.value && start.hasMoved) {
      const dx = end.x - start.x
      const dy = end.y - start.y
      onDrag?.(dx, dy)
      event.preventDefault()
      return
    }
    
    // Prevent default for potential swipe
    if (Math.abs(swipe.dy) > Math.abs(swipe.dx) * 1.5) {
      event.preventDefault()
    }
  }

  // Touch end handler
  function handleTouchEnd(event: TouchEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const start = touchState.value
    const touch = event.changedTouches[0]
    
    if (!touch) {
      touchState.value = null
      return
    }
    
    const end = { x: touch.clientX, y: touch.clientY, time: Date.now() }
    const swipe = calculateSwipe(start, end)
    
    // Clear timers
    if (holdTimer.value !== null) {
      clearTimeout(holdTimer.value)
      holdTimer.value = null
    }
    
    // Handle pinch end
    if (start.isPinching) {
      onPinchEnd?.()
      touchState.value = null
      event.preventDefault()
      return
    }
    
    // Check for double tap
    const now = Date.now()
    const isDoubleTap = now - lastTapTime.value < DOUBLE_TAP_THRESHOLD && 
                       swipe.distanceX < TAP_MOVEMENT_THRESHOLD && 
                       swipe.distanceY < TAP_MOVEMENT_THRESHOLD
    
    if (isDoubleTap) {
      lastTapTime.value = 0
      onDoubleTap?.()
      event.preventDefault()
      touchState.value = null
      return
    }
    
    // Check for tap
    if (!start.hasMoved && swipe.distanceX < TAP_MOVEMENT_THRESHOLD && swipe.distanceY < TAP_MOVEMENT_THRESHOLD) {
      lastTapTime.value = now
      onTap?.()
      event.preventDefault()
      touchState.value = null
      return
    }
    
    // Check for horizontal swipe
    if (swipe.distanceX > SWIPE_THRESHOLD && swipe.velocityX > SWIPE_VELOCITY_THRESHOLD) {
      if (swipe.dx > 0) {
        onPrevious?.()
      } else {
        onNext?.()
      }
      event.preventDefault()
      touchState.value = null
      return
    }
    
    // Check for vertical swipe (dismiss)
    if (swipe.distanceY > SWIPE_THRESHOLD && swipe.velocityY > SWIPE_VELOCITY_THRESHOLD && swipe.dy > 0) {
      onClose?.()
      event.preventDefault()
    }
    
    // Handle drag end
    if (isZoomed?.value) {
      onDragEnd?.()
    }
    
    touchState.value = null
  }

  // Mouse down handler
  function handleMouseDown(event: MouseEvent) {
    if (disableGestures.value) return
    
    touchState.value = {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      isPinching: false,
      hasMoved: false
    }
    
    if (isZoomed?.value) {
      dragState.value = { startX: event.clientX, startY: event.clientY, active: true }
      onDragStart?.()
    }
  }

  // Mouse move handler
  function handleMouseMove(event: MouseEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const start = touchState.value
    const end = { x: event.clientX, y: event.clientY, time: Date.now() }
    const swipe = calculateSwipe(start, end)
    
    // Mark as moved
    if (!start.hasMoved && (swipe.distanceX > 5 || swipe.distanceY > 5)) {
      start.hasMoved = true
    }
    
    // Handle drag when zoomed
    if (dragState.value.active && isZoomed?.value) {
      const dx = event.clientX - dragState.value.startX
      const dy = event.clientY - dragState.value.startY
      onDrag?.(dx, dy)
    }
  }

  // Mouse up handler
  function handleMouseUp(event: MouseEvent) {
    if (disableGestures.value || !touchState.value) return
    
    const start = touchState.value
    const end = { x: event.clientX, y: event.clientY, time: Date.now() }
    const swipe = calculateSwipe(start, end)
    
    // Check for double click
    const now = Date.now()
    const isDoubleClick = now - lastTapTime.value < DOUBLE_TAP_THRESHOLD && 
                        swipe.distanceX < TAP_MOVEMENT_THRESHOLD && 
                        swipe.distanceY < TAP_MOVEMENT_THRESHOLD
    
    if (isDoubleClick) {
      lastTapTime.value = 0
      onDoubleTap?.()
      event.preventDefault()
      dragState.value.active = false
      touchState.value = null
      return
    }
    
    // Check for click
    if (!start.hasMoved && swipe.distanceX < TAP_MOVEMENT_THRESHOLD && swipe.distanceY < TAP_MOVEMENT_THRESHOLD) {
      lastTapTime.value = now
      onTap?.()
      event.preventDefault()
    }
    
    // Handle drag end
    if (dragState.value.active && isZoomed?.value) {
      onDragEnd?.()
      dragState.value.active = false
    }
    
    touchState.value = null
  }

  // Wheel handler for zoom
  function handleWheel(event: WheelEvent) {
    if (disableGestures.value) return
    if (!event.ctrlKey && !event.metaKey) return
    
    event.preventDefault()
    // Could implement wheel-based zoom here
  }

  return {
    handleKeyDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  }
}


