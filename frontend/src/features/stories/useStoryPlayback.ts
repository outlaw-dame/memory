/**
 * useStoryPlayback - Composable for story playback state management
 *
 * Responsibilities:
 * - Track current group and item indices
 * - Manage playback progress and state
 * - Handle auto-advancement
 * - Respect reduced motion preferences
 * - Pause during user interactions
 */

import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { StoryGroup, StoryItem } from '@/stores/atBridgeStore'

export interface StoryPlaybackConfig {
  groups: StoryGroup[]
  initialGroupIndex?: number
  autoAdvanceDuration?: number
  imageDuration?: number
  maxVideoDuration?: number
  minDuration?: number
}

export interface StoryPlaybackState {
  currentGroupIndex: Ref<number>
  currentItemIndex: Ref<number>
  progress: Ref<number>
  isPaused: Ref<boolean>
  isPlaying: Ref<boolean>
  durationMs: ComputedRef<number>
  currentGroup: ComputedRef<StoryGroup | null>
  currentItem: ComputedRef<StoryItem | null>
}

export interface StoryPlaybackHandlers {
  advance: () => void
  previous: () => void
  pause: () => void
  resume: () => void
  resetProgress: () => void
  markSeenIfNeeded: () => Promise<void>
  togglePause: () => void
  close: () => void
  startHoldPause: () => void
  endHoldPause: () => void
  handleVideoEnd: () => void
}

const DEFAULT_IMAGE_DURATION = 5000
const DEFAULT_MIN_DURATION = 5000
const DEFAULT_MAX_VIDEO_DURATION = 60000
const PROGRESS_UPDATE_INTERVAL = 90

export function useStoryPlayback(config: StoryPlaybackConfig): StoryPlaybackState & StoryPlaybackHandlers {
  const {
    groups,
    initialGroupIndex = 0,
    imageDuration = DEFAULT_IMAGE_DURATION,
    minDuration = DEFAULT_MIN_DURATION,
    maxVideoDuration = DEFAULT_MAX_VIDEO_DURATION
  } = config

  // State
  const currentGroupIndex = ref(Math.max(0, Math.min(initialGroupIndex, groups.length - 1)))
  const currentItemIndex = ref(0)
  const progress = ref(0)
  const isPaused = ref(false)
  const isPlaying = ref(false)
  
  // Timer reference
  let progressTimer: ReturnType<typeof setInterval> | null = null
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let reducedMotion = false

  // Check for reduced motion preference
  onMounted(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      reducedMotion = mediaQuery.matches
      mediaQuery.addEventListener('change', (e) => {
        reducedMotion = e.matches
        if (reducedMotion) {
          pause()
        }
      })
    }
  })

  // Computed properties
  const currentGroup = computed(() => groups[currentGroupIndex.value] ?? null)
  const currentItem = computed(() => currentGroup.value?.items[currentItemIndex.value] ?? null)
  const durationMs = computed(() => {
    const item = currentItem.value
    if (!item) return minDuration
    
    if (item.media.kind === 'video' && item.media.durationMs) {
      return Math.min(Math.max(item.media.durationMs, minDuration), maxVideoDuration)
    }
    return imageDuration
  })

  // Auto-advance on video end
  function handleVideoEnd() {
    if (!isPaused.value) {
      advance()
    }
  }

  // Progress management
  function startProgress() {
    stopProgress()
    
    if (reducedMotion) {
      progress.value = 100
      return
    }
    
    const duration = durationMs.value
    const startedAt = Date.now()
    
    progressTimer = setInterval(() => {
      const elapsed = Date.now() - startedAt
      progress.value = Math.min(100, (elapsed / duration) * 100)
      if (progress.value >= 100) {
        advance()
      }
    }, PROGRESS_UPDATE_INTERVAL)
    
    isPlaying.value = true
  }

  function stopProgress() {
    if (progressTimer !== null) {
      clearInterval(progressTimer)
      progressTimer = null
    }
    isPlaying.value = false
  }

  function resetProgress() {
    progress.value = 0
  }

  // Navigation
  function advance() {
    const group = currentGroup.value
    if (!group) return close()
    
    if (currentItemIndex.value < group.items.length - 1) {
      currentItemIndex.value += 1
      resetProgress()
      startProgress()
      return
    }
    
    if (currentGroupIndex.value < groups.length - 1) {
      currentGroupIndex.value += 1
      currentItemIndex.value = 0
      resetProgress()
      startProgress()
      return
    }
    
    // End of all stories - pause
    pause()
  }

  function previous() {
    if (currentItemIndex.value > 0) {
      currentItemIndex.value -= 1
      resetProgress()
      startProgress()
      return
    }
    
    if (currentGroupIndex.value > 0) {
      currentGroupIndex.value -= 1
      currentItemIndex.value = Math.max(0, (currentGroup.value?.items.length ?? 1) - 1)
      resetProgress()
      startProgress()
    }
  }

  function close() {
    stopProgress()
  }

  // Playback controls
  function pause() {
    if (isPaused.value) return
    isPaused.value = true
    stopProgress()
  }

  function resume() {
    if (!isPaused.value) return
    isPaused.value = false
    resetProgress()
    startProgress()
  }

  function togglePause() {
    if (isPaused.value) {
      resume()
    } else {
      pause()
    }
  }

  // Pause on hold
  function startHoldPause() {
    pause()
    // Clear any existing hold timer
    if (holdTimer !== null) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }

  function endHoldPause() {
    if (holdTimer !== null) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    // Delay resume slightly to avoid flicker
    holdTimer = setTimeout(() => {
      holdTimer = null
      if (!isPaused.value) return
      resume()
    }, 100)
  }

  // Mark as seen
  async function markSeenIfNeeded(): Promise<void> {
    const item = currentItem.value
    if (!item || item.seen) return
    
    // Import store dynamically to avoid circular dependencies
    const { useAtBridgeStore } = await import('@/stores/atBridgeStore')
    const atBridgeStore = useAtBridgeStore()
    await atBridgeStore.markStoriesViewed([item.uri])
  }

  // Start playback when item changes
  const stopWatch = watch(
    currentItem,
    (item) => {
      if (!item) {
        stopProgress()
        return
      }
      markSeenIfNeeded()
      resetProgress()
      if (!isPaused.value) {
        startProgress()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    stopProgress()
    stopWatch()
    if (holdTimer !== null) {
      clearTimeout(holdTimer)
    }
  })

  return {
    // State
    currentGroupIndex,
    currentItemIndex,
    progress,
    isPaused,
    isPlaying,
    durationMs,
    currentGroup,
    currentItem,
    
    // Handlers
    advance,
    previous,
    pause,
    resume,
    resetProgress,
    togglePause,
    markSeenIfNeeded,
    
    // Hold pause helpers
    startHoldPause,
    endHoldPause,
    
    // Video event handler
    handleVideoEnd,
    
    // Cleanup
    close
  }
}


