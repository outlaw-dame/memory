/**
 * MediaViewerGestureLayer - Gesture handling layer for media viewer
 *
 * Responsibilities:
 * - Handle swipe gestures for navigation
 * - Handle tap gestures for controls
 * - Handle double-tap for zoom
 * - Handle pinch for zoom
 * - Respect safe areas
 * - Respect reduced motion
 */

<script setup lang="ts">
import { ref, type Ref } from 'vue'

export interface MediaViewerGestureLayerProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onPinchStart?: () => void
  onPinch?: (scale: number) => void
  onPinchEnd?: () => void
  disableGestures?: boolean
}

const props = defineProps<MediaViewerGestureLayerProps>()

const emit = defineEmits<{
  (e: 'swipe-left'): void
  (e: 'swipe-right'): void
  (e: 'swipe-down'): void
  (e: 'tap'): void
  (e: 'double-tap'): void
}>()

// Gesture state
const touchStart = ref<{ x: number; y: number; time: number } | null>(null)
const lastTapTime = ref(0)
const isPinching = ref(false)
const pinchScale = ref(1)
const pinchStartDistance = ref(0)

// Thresholds
const SWIPE_THRESHOLD = 50
const SWIPE_VELOCITY_THRESHOLD = 0.5
const DOUBLE_TAP_THRESHOLD = 300 // ms
const TAP_MOVEMENT_THRESHOLD = 10 // px

// Touch start handler
function handleTouchStart(event: TouchEvent) {
  if (props.disableGestures) return
  
  if (event.touches.length === 2) {
    // Pinch gesture start
    isPinching.value = true
    const t1 = event.touches[0]
    const t2 = event.touches[1]
    pinchStartDistance.value = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    pinchScale.value = 1
    props.onPinchStart?.()
    event.preventDefault()
    return
  }
  
  const touch = event.touches[0]
  touchStart.value = {
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now()
  }
}

// Touch move handler
function handleTouchMove(event: TouchEvent) {
  if (props.disableGestures) return
  
  if (isPinching.value && event.touches.length === 2) {
    const t1 = event.touches[0]
    const t2 = event.touches[1]
    const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
    const scale = currentDistance / pinchStartDistance.value
    pinchScale.value = Math.max(1, Math.min(4, scale))
    props.onPinch?.(pinchScale.value)
    event.preventDefault()
    return
  }
  
  if (!touchStart.value) return
  
  const touch = event.touches[0]
  const dx = touch.clientX - touchStart.value.x
  const dy = touch.clientY - touchStart.value.y
  
  // Check if this is a vertical swipe (for dismiss)
  if (Math.abs(dy) > Math.abs(dx) * 1.5) {
    event.preventDefault()
  }
}

// Touch end handler
function handleTouchEnd(event: TouchEvent) {
  if (props.disableGestures) return
  
  if (isPinching.value) {
    isPinching.value = false
    props.onPinchEnd?.()
    event.preventDefault()
    return
  }
  
  const start = touchStart.value
  if (!start) return
  
  const touch = event.changedTouches[0]
  const end = { x: touch.clientX, y: touch.clientY, time: Date.now() }
  
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dt = end.time - start.time
  
  const distanceX = Math.abs(dx)
  const distanceY = Math.abs(dy)
  const velocityX = dt > 0 ? distanceX / dt : 0
  const velocityY = dt > 0 ? distanceY / dt : 0
  
  // Check for double tap
  const now = Date.now()
  const isDoubleTap = now - lastTapTime.value < DOUBLE_TAP_THRESHOLD && distanceX < TAP_MOVEMENT_THRESHOLD && distanceY < TAP_MOVEMENT_THRESHOLD
  
  if (isDoubleTap) {
    lastTapTime.value = 0
    emit('double-tap')
    props.onDoubleTap?.()
    event.preventDefault()
    return
  }
  
  // Check for tap (no significant movement)
  if (distanceX < TAP_MOVEMENT_THRESHOLD && distanceY < TAP_MOVEMENT_THRESHOLD) {
    lastTapTime.value = now
    emit('tap')
    props.onTap?.()
    event.preventDefault()
    return
  }
  
  // Check for horizontal swipe
  if (distanceX > SWIPE_THRESHOLD && velocityX > SWIPE_VELOCITY_THRESHOLD) {
    if (dx > 0) {
      emit('swipe-right')
      props.onSwipeRight?.()
    } else {
      emit('swipe-left')
      props.onSwipeLeft?.()
    }
    event.preventDefault()
    return
  }
  
  // Check for vertical swipe (dismiss)
  if (distanceY > SWIPE_THRESHOLD && velocityY > SWIPE_VELOCITY_THRESHOLD) {
    if (dy > 0) {
      emit('swipe-down')
      props.onSwipeDown?.()
    }
    event.preventDefault()
  }
  
  touchStart.value = null
}

// Mouse handlers for desktop
function handleMouseDown(event: MouseEvent) {
  if (props.disableGestures) return
  touchStart.value = { x: event.clientX, y: event.clientY, time: Date.now() }
}

function handleMouseMove(event: MouseEvent) {
  if (props.disableGestures) return
  // Track movement for potential swipe
}

function handleMouseUp(event: MouseEvent) {
  if (props.disableGestures) return
  
  const start = touchStart.value
  if (!start) return
  
  const end = { x: event.clientX, y: event.clientY, time: Date.now() }
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distanceX = Math.abs(dx)
  const distanceY = Math.abs(dy)
  
  // Check for double click
  const now = Date.now()
  const isDoubleClick = now - lastTapTime.value < DOUBLE_TAP_THRESHOLD && distanceX < TAP_MOVEMENT_THRESHOLD && distanceY < TAP_MOVEMENT_THRESHOLD
  
  if (isDoubleClick) {
    lastTapTime.value = 0
    emit('double-tap')
    props.onDoubleTap?.()
    event.preventDefault()
    return
  }
  
  // Check for click (no significant movement)
  if (distanceX < TAP_MOVEMENT_THRESHOLD && distanceY < TAP_MOVEMENT_THRESHOLD) {
    lastTapTime.value = now
    emit('tap')
    props.onTap?.()
  }
  
  touchStart.value = null
}

// Wheel handler for zoom (optional)
function handleWheel(event: WheelEvent) {
  if (props.disableGestures) return
  if (!event.ctrlKey && !event.metaKey) return
  
  event.preventDefault()
  // Handle pinch-like zoom with scroll wheel
}
</script>

<template>
  <div
    class="media-viewer-gesture-layer absolute inset-0"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @wheel="handleWheel"
  >
    <slot />
  </div>
</template>

<style scoped>
.media-viewer-gesture-layer {
  /* Ensure gestures work */
  touch-action: pan-x pan-y pinch-zoom;
  /* Prevent selection during gestures */
  user-select: none;
  -webkit-user-select: none;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .media-viewer-gesture-layer {
    touch-action: manipulation;
  }
}
</style>
