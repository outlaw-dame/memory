/**
 * StoryViewerOverlay - Container overlay for story viewer
 *
 * Responsibilities:
 * - Full-screen black background
 * - Container for all viewer elements
 * - Handle gestures and keyboard
 * - Manage focus
 * - Native transitions
 */

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useStoryGestures } from './useStoryGestures'
import { useStoryPlayback } from './useStoryPlayback'
import StoryProgressBar from './StoryProgressBar.vue'
import StoryViewerHeader from './StoryViewerHeader.vue'
import StoryViewerFooter from './StoryViewerFooter.vue'
import type { StoryGroup, StoryItem } from '@/stores/atBridgeStore'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

export interface StoryViewerOverlayProps {
  groups: StoryGroup[]
  initialGroupIndex?: number
}

const props = defineProps<StoryViewerOverlayProps>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'deleted'): void
}>()

// Refs
const overlayRef = ref<HTMLElement | null>(null)
const isDeleting = ref(false)
let actionSheetOpen = false

// Register action sheet state for pausing
function registerActionSheet(state: boolean) {
  actionSheetOpen = state
  if (actionSheetOpen) {
    playback.pause()
  } else if (!playback.isPaused.value) {
    playback.resume()
  }
}

// Use composables
const playback = useStoryPlayback({
  groups: props.groups,
  initialGroupIndex: props.initialGroupIndex
})

const nativeUiProfile = useNativeUiProfile()

const gestures = useStoryGestures({
  element: overlayRef,
  onNext: playback.advance,
  onPrevious: playback.previous,
  onClose: () => emit('close'),
  onPause: playback.pause,
  onResume: playback.resume,
  onHoldStart: () => {
    // Optional: haptic feedback on hold
  },
  onHoldEnd: () => {
    // Optional: haptic feedback on release
  },
  isPaused: playback.isPaused,
  disableGestures: computed(() => nativeUiProfile.prefersReducedMotion)
})

// Current group and item
const currentGroup = computed(() => playback.currentGroup.value)
const currentItem = computed(() => playback.currentItem.value)

// Watch for action sheet changes
watch(
  () => actionSheetOpen,
  (open) => {
    if (open) {
      playback.pause()
    } else if (!playback.isPaused.value) {
      playback.resume()
    }
  }
)

// Handle video end
function handleVideoEnd() {
  if (!playback.isPaused.value) {
    playback.advance()
  }
}

// Handle delete
async function handleDelete() {
  if (!currentItem.value?.viewerCanDelete) return
  
  isDeleting.value = true
  try {
    const { useAtBridgeStore } = await import('@/stores/atBridgeStore')
    const atBridgeStore = useAtBridgeStore()
    const ok = await atBridgeStore.deleteStory(currentItem.value.uri)
    if (ok) {
      emit('deleted')
      emit('close')
    }
  } finally {
    isDeleting.value = false
  }
}

// Handle close
function handleClose() {
  playback.close()
  emit('close')
}

// Focus management
function focusOverlay() {
  nextTick(() => {
    overlayRef.value?.focus()
  })
}

onMounted(() => {
  focusOverlay()
})

// Expose methods for parent control
defineExpose({
  close: handleClose,
  focus: focusOverlay,
  registerActionSheet
})
</script>

<template>
  <div
    ref="overlayRef"
    class="story-viewer-overlay fixed inset-0 z-50 bg-black text-white"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="Story viewer"
    @keydown="gestures.handleKeyDown"
    @touchstart="gestures.handleTouchStart"
    @touchmove="gestures.handleTouchMove"
    @touchend="gestures.handleTouchEnd"
    @mousedown="gestures.handleMouseDown"
    @mousemove="gestures.handleMouseMove"
    @mouseup="gestures.handleMouseUp"
  >
    <!-- Invisible tap areas for navigation -->
    <button
      type="button"
      class="story-viewer-overlay__tap-area story-viewer-overlay__tap-area--left absolute left-0 top-0 z-10 h-full w-1/3"
      aria-hidden="true"
      @click="playback.previous"
    />
    <button
      type="button"
      class="story-viewer-overlay__tap-area story-viewer-overlay__tap-area--right absolute right-0 top-0 z-10 h-full w-1/3"
      aria-hidden="true"
      @click="playback.advance"
    />

    <!-- Content area -->
    <div
      v-if="currentGroup && currentItem"
      class="story-viewer-overlay__content relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      <!-- Progress bar -->
      <StoryProgressBar
        :items="currentGroup.items"
        :current-index="playback.currentItemIndex"
        :progress="playback.progress"
        :is-paused="playback.isPaused"
      />

      <!-- Header -->
      <StoryViewerHeader
        :group="currentGroup"
        :item="currentItem"
        :is-deleting="isDeleting"
        @delete="handleDelete"
        @close="handleClose"
      />

      <!-- Media -->
      <div class="story-viewer-overlay__media absolute inset-0 flex items-center justify-center">
        <video
          v-if="currentItem.media.kind === 'video' && currentItem.media.url"
          :key="currentItem.uri"
          :src="currentItem.media.url"
          class="story-viewer-overlay__media-item h-full w-full object-contain"
          autoplay
          muted
          playsinline
          @ended="handleVideoEnd"
        />
        <img
          v-else-if="currentItem.media.url"
          :src="currentItem.media.url"
          :alt="currentItem.media.alt"
          class="story-viewer-overlay__media-item h-full w-full object-contain"
          @load="playback.resetProgress"
        />
        <div
          v-else
          class="story-viewer-overlay__media-placeholder px-8 text-center text-sm text-white/70"
        >
          {{ currentItem.media.alt || 'Media not available' }}
        </div>
      </div>

      <!-- Footer -->
      <StoryViewerFooter :item="currentItem" />

      <!-- Invisible tap areas for keyboard users -->
      <button
        type="button"
        class="story-viewer-overlay__tap-area story-viewer-overlay__tap-area--center absolute left-1/3 right-1/3 top-0 z-0 h-full"
        aria-label="Pause or resume story"
        @click="playback.togglePause"
      />
    </div>
  </div>
</template>

<style scoped>
.story-viewer-overlay {
  /* Full screen */
  inset: 0;
  /* Prevent text selection */
  user-select: none;
  -webkit-user-select: none;
  /* Smooth transitions */
  transition: opacity 0.3s ease, visibility 0.3s ease;
  /* Native touch feedback */
  -webkit-tap-highlight-color: transparent;
}

.story-viewer-overlay:focus {
  outline: none;
}

.story-viewer-overlay__content {
  /* Safe area insets */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.story-viewer-overlay__media {
  /* Center media */
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-viewer-overlay__media-item {
  /* Ensure media is centered and contained */
  max-width: 100%;
  max-height: 100%;
}

.story-viewer-overlay__media-placeholder {
  /* Center placeholder text */
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.story-viewer-overlay__tap-area {
  /* Invisible but clickable */
  opacity: 0;
  cursor: pointer;
  /* Ensure tap areas work */
  pointer-events: auto;
}

/* Native feel on iOS */
@supports (-webkit-touch-callout: none) {
  .story-viewer-overlay__tap-area {
    cursor: pointer;
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .story-viewer-overlay {
    transition: none;
  }
}
</style>
