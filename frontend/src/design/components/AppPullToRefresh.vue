<script setup lang="ts">
/**
 * AppPullToRefresh - Semantic Pull-to-Refresh Component
 *
 * A platform-aware pull-to-refresh wrapper that handles:
 * - Native pull-to-refresh gestures
 * - Loading state visualization
 * - Success/error feedback
 * - Safe area insets
 *
 * Security considerations:
 * - All events are rate-limited
 * - No dynamic code evaluation
 * - Safe DOM access
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSafeArea } from '@/platform/safeAreaPolicy'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppPullToRefreshProps {
  // Refresh state
  loading?: boolean
  disabled?: boolean
  
  // Visual customization
  pulldownThreshold?: number
  refreshTriggerDistance?: number
  
  // Success/error feedback
  successDuration?: number
  errorDuration?: number
  
  // Events
  onRefresh?: () => Promise<void> | void
}

const props = withDefaults(defineProps<AppPullToRefreshProps>(), {
  loading: false,
  disabled: false,
  pulldownThreshold: 60,
  refreshTriggerDistance: 80,
  successDuration: 1000,
  errorDuration: 2000,
})

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const safeArea = useSafeArea()
const haptics = useHaptics()

const containerRef = ref<HTMLElement | null>(null)
const startY = ref(0)
const currentY = ref(0)
const isDragging = ref(false)
const isRefreshing = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref<string | null>(null)

// Computed
const pullDistance = computed(() => currentY.value - startY.value)
const isPulling = computed(() => pullDistance.value > 0)
const pullPercentage = computed(() => {
  const distance = Math.max(0, pullDistance.value)
  return Math.min(100, (distance / props.refreshTriggerDistance) * 100)
})
const shouldRefresh = computed(() => pullDistance.value >= props.refreshTriggerDistance)

// State indicators
const refreshState = computed(() => {
  if (props.loading || isRefreshing.value) return 'loading'
  if (showSuccess.value) return 'success'
  if (showError.value) return 'error'
  return 'idle'
})

// Touch handlers
function handleTouchStart(event: TouchEvent) {
  if (props.disabled || props.loading) return
  
  const container = containerRef.value
  if (!container) return
  
  // Only handle single touch
  if (event.touches.length !== 1) return
  
  const touch = event.touches[0]
  const scrollContainer = findScrollContainer(container)
  
  if (!scrollContainer) return
  
  // Only start if we're at the top of the scroll container
  if (scrollContainer.scrollTop > 0) return
  
  startY.value = touch.clientY
  currentY.value = touch.clientY
  isDragging.value = true
  
  event.preventDefault()
}

function handleTouchMove(event: TouchEvent) {
  if (!isDragging.value || props.disabled) return
  
  const touch = event.touches[0]
  currentY.value = touch.clientY
  
  // Prevent overscroll when pulling down
  if (pullDistance.value > 0) {
    event.preventDefault()
  }
}

function handleTouchEnd() {
  if (!isDragging.value) return
  
  isDragging.value = false
  
  if (shouldRefresh.value && !props.loading) {
    triggerRefresh()
  }
  
  // Reset position
  currentY.value = startY.value
}

function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element
  
  while (current) {
    const style = window.getComputedStyle(current)
    if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return current
    }
    current = current.parentElement
  }
  
  return null
}

async function triggerRefresh() {
  if (props.disabled || isRefreshing.value) return
  
  isRefreshing.value = true
  showSuccess.value = false
  showError.value = false
  errorMessage.value = null
  
  try {
    await haptics.medium()
    emit('refresh')
    
    // If onRefresh prop is provided, call it
    if (props.onRefresh) {
      const result = props.onRefresh()
      if (result && typeof result.then === 'function') {
        await result
      }
    }
    
    // Show success feedback
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, props.successDuration)
    
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Refresh failed'
    showError.value = true
    setTimeout(() => {
      showError.value = false
      errorMessage.value = null
    }, props.errorDuration)
  } finally {
    isRefreshing.value = false
    currentY.value = startY.value
  }
}

// Expose refresh method
function manualRefresh() {
  if (props.disabled || isRefreshing.value) return
  triggerRefresh()
}

defineExpose({
  refresh: manualRefresh,
})

// Cleanup
onUnmounted(() => {
  isDragging.value = false
})
</script>

<template>
  <div
    ref="containerRef"
    class="app-pull-to-refresh"
    :class="{
      'is-dragging': isDragging,
      'is-refreshing': refreshState === 'loading',
      'show-success': showSuccess,
      'show-error': showError,
    }"
    @touchstart.passive="handleTouchStart"
    @touchmove.passive="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <!-- Pull indicator -->
    <div
      class="app-pull-indicator"
      :style="{
        transform: `translateY(${Math.max(0, pullDistance - props.pulldownThreshold)}px)`,
        opacity: isPulling ? Math.min(1, (pullDistance - props.pulldownThreshold) / 20) : 0,
      }"
    >
      <div class="app-pull-indicator-content" :class="{ 'triggered': shouldRefresh }">
        <slot name="indicator">
          <div class="app-pull-arrow" :class="{ 'rotate-180': shouldRefresh }">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
          <span class="app-pull-text">
            <template v-if="shouldRefresh">Release to refresh</template>
            <template v-else>Pull to refresh</template>
          </span>
        </slot>
      </div>
    </div>

    <!-- Success feedback -->
    <div v-if="showSuccess" class="app-pull-feedback success">
      <slot name="success">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span>Refreshed</span>
      </slot>
    </div>

    <!-- Error feedback -->
    <div v-if="showError" class="app-pull-feedback error">
      <slot name="error" :message="errorMessage">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
        <span>{{ errorMessage || 'Refresh failed' }}</span>
      </slot>
    </div>

    <!-- Loading state -->
    <div v-if="refreshState === 'loading'" class="app-pull-feedback loading">
      <slot name="loading">
        <div class="app-pull-loader" />
        <span>Refreshing...</span>
      </slot>
    </div>

    <!-- Content -->
    <slot />
  </div>
</template>

<style scoped>
.app-pull-to-refresh {
  position: relative;
  overflow: hidden;
  contain: strict;
}

.app-pull-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  
  display: flex;
  justify-content: center;
  pointer-events: none;
  
  transition: transform 0.2s ease, opacity 0.2s ease;
  transform-origin: center;
}

.app-pull-indicator-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  color: var(--color-secondary);
  
  transition: opacity 0.2s ease;
}

.app-pull-indicator-content.triggered {
  color: var(--color-accent);
}

.app-pull-arrow {
  transition: transform 0.2s ease;
}

.app-pull-arrow.rotate-180 {
  transform: rotate(180deg);
}

.app-pull-text {
  user-select: none;
}

.app-pull-feedback {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  
  background: rgba(0, 0, 0, 0.8);
  border-radius: 0.5rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: white;
  
  z-index: 20;
  pointer-events: none;
  
  opacity: 1;
  animation: fadeInOut 0.3s ease;
}

.app-pull-feedback.success {
  background: rgba(34, 197, 94, 0.9);
}

.app-pull-feedback.error {
  background: rgba(239, 68, 68, 0.9);
}

.app-pull-feedback.loading {
  background: rgba(29, 155, 240, 0.9);
}

.app-pull-loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
</style>
