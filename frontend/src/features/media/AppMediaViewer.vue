/**
 * AppMediaViewer - Full-screen media viewer for images and videos
 *
 * Capabilities:
 * - Image full-screen
 * - Video full-screen
 * - Swipe between media items
 * - Pinch zoom for images
 * - Double-tap zoom
 * - Swipe down dismiss
 * - Tap chrome show/hide
 * - Safe-area toolbar
 * - Share action
 * - Save/download action
 * - Open original action
 * - Alt text/caption display
 *
 * Constraints:
 * - Respect media permissions
 * - Do not auto-download media
 * - Do not autoplay unexpected audio
 * - Keep browser/native video controls accessible
 * - Support escape key close
 * - Provide close button fallback
 */

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useMediaPreload } from './useMediaPreload'
import MediaViewerToolbar from './MediaViewerToolbar.vue'
import MediaViewerGestureLayer from './MediaViewerGestureLayer.vue'
import type { CarouselMediaItem } from '@/components/PostMediaCarousel.vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

export interface AppMediaViewerProps {
  items: CarouselMediaItem[]
  initialIndex?: number
  showToolbar?: boolean
  canShare?: boolean
  canDownload?: boolean
}

const props = defineProps<AppMediaViewerProps>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'index-change', index: number): void
  (e: 'open-original', item: CarouselMediaItem): void
}>()

// State
const currentIndex = ref(props.initialIndex ?? 0)
const isOpen = ref(false)
const showChrome = ref(true)
const zoomScale = ref(1)
const zoomOrigin = ref({ x: 0, y: 0 })
const isZoomed = computed(() => zoomScale.value > 1)
const viewerRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)

// Get media URLs
const mediaUrls = computed(() => props.items.map(item => item.url))
const nativeUiProfile = useNativeUiProfile()

// Use media preload
const { preloadCurrent, preloadNext, preloadPrevious, cancelAll } = useMediaPreload({
  mediaUrls,
  currentIndex,
  preloadCount: 2
})

// Current item
const currentItem = computed(() => props.items[currentIndex.value] ?? null)

// Zoom state
const imageStyle = computed(() => {
  if (zoomScale.value <= 1) {
    return { transform: 'none' }
  }
  return {
    transform: `translate(${-zoomOrigin.value.x * (zoomScale.value - 1)}px, ${-zoomOrigin.value.y * (zoomScale.value - 1)}px) scale(${zoomScale.value})`,
    transformOrigin: 'center',
    cursor: 'grab'
  }
})

// Auto-load current and adjacent
watch(
  currentIndex,
  (newIndex) => {
    preloadCurrent()
    preloadNext()
    preloadPrevious()
    emit('index-change', newIndex)
  },
  { immediate: true }
)

// Navigation
function next() {
  if (currentIndex.value < props.items.length - 1) {
    currentIndex.value += 1
    resetZoom()
  }
}

function previous() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1
    resetZoom()
  }
}

function close() {
  cancelAll()
  emit('close')
}

// Chrome toggle
function toggleChrome() {
  showChrome.value = !showChrome.value
}

// Zoom handlers
function handleDoubleTap(event?: MouseEvent | TouchEvent) {
  if (!currentItem.value || currentItem.value.type !== 'image' && currentItem.value.type !== 'gif') return
  
  if (isZoomed.value) {
    resetZoom()
    return
  }
  
  // Calculate tap position for zoom origin
  const rect = viewerRef.value?.getBoundingClientRect()
  if (!rect) return
  
  let clientX = rect.width / 2
  let clientY = rect.height / 2
  
  if (event) {
    if ('touches' in event) {
      clientX = event.touches[0]?.clientX ?? rect.width / 2
      clientY = event.touches[0]?.clientY ?? rect.height / 2
    } else {
      clientX = event.clientX
      clientY = event.clientY
    }
  }
  
  zoomOrigin.value = {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height
  }
  
  zoomScale.value = 2
}

function handlePinch(scale: number) {
  if (!currentItem.value || currentItem.value.type !== 'image' && currentItem.value.type !== 'gif') return
  
  zoomScale.value = Math.max(1, Math.min(4, scale))
}

function handlePinchStart() {
  // Optional: track start position
}

function handlePinchEnd() {
  // Optional: track end
}

function resetZoom() {
  zoomScale.value = 1
  zoomOrigin.value = { x: 0, y: 0 }
}

// Handle image drag when zoomed
const dragStart = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })

function handleDragStart(event: MouseEvent | TouchEvent) {
  if (!isZoomed.value) return
  
  const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX
  const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY
  
  dragStart.value = { x: clientX, y: clientY }
  dragOffset.value = { x: 0, y: 0 }
}

function handleDragMove(event: MouseEvent | TouchEvent) {
  if (!isZoomed.value || !dragStart.value) return
  
  const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX
  const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY
  
  dragOffset.value = {
    x: clientX - dragStart.value.x,
    y: clientY - dragStart.value.y
  }
}

function handleDragEnd() {
  if (!isZoomed.value) return
  
  // Snap back if dragged too far
  const threshold = 50
  if (Math.abs(dragOffset.value.x) > threshold || Math.abs(dragOffset.value.y) > threshold) {
    resetZoom()
  }
  
  dragStart.value = { x: 0, y: 0 }
  dragOffset.value = { x: 0, y: 0 }
}

// Keyboard handler
function handleKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case 'Escape':
      close()
      break
    case 'ArrowRight':
      next()
      break
    case 'ArrowLeft':
      previous()
      break
    case 'ArrowUp':
    case 'ArrowDown':
      // Hide/show chrome
      toggleChrome()
      break
    case ' ':
    case 'Space':
      toggleChrome()
      event.preventDefault()
      break
  }
}

// Media load handlers
function handleImageLoad() {
  // Preload next images
  preloadNext()
}

function handleVideoEnd() {
  // Auto-advance to next item
  if (currentIndex.value < props.items.length - 1) {
    next()
  }
}

// Auto-show on open
function open() {
  isOpen.value = true
  nextTick(() => {
    viewerRef.value?.focus()
    preloadCurrent()
    preloadNext()
  })
}

// Expose methods
defineExpose({
  open,
  close,
  next,
  previous,
  setIndex: (index: number) => {
    if (index >= 0 && index < props.items.length) {
      currentIndex.value = index
    }
  },
  getCurrentIndex: () => currentIndex.value
})

// Cleanup on unmount
onBeforeUnmount(() => {
  cancelAll()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="media-viewer" @after-enter="open">
      <div
        v-if="isOpen"
        ref="viewerRef"
        class="app-media-viewer fixed inset-0 z-50 bg-black text-white"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-label="Media viewer"
        @keydown="handleKeyDown"
        @click="toggleChrome"
      >
        <MediaViewerGestureLayer
          :disable-gestures="!currentItem || nativeUiProfile.prefersReducedMotion"
          @swipe-left="next"
          @swipe-right="previous"
          @swipe-down="close"
          @double-tap="handleDoubleTap"
          @pinch="handlePinch"
          @pinch-start="handlePinchStart"
          @pinch-end="handlePinchEnd"
        >
          <!-- Content -->
          <div
            v-if="currentItem"
            class="app-media-viewer__content relative flex h-full w-full items-center justify-center overflow-hidden"
            @mousedown="handleDragStart"
            @mousemove="handleDragMove"
            @mouseup="handleDragEnd"
            @mouseleave="handleDragEnd"
            @touchstart="handleDragStart"
            @touchmove="handleDragMove"
            @touchend="handleDragEnd"
          >
            <!-- Image -->
            <img
              v-if="currentItem.type === 'image' || currentItem.type === 'gif'"
              ref="imageRef"
              :src="currentItem.url"
              :alt="currentItem.alt"
              class="app-media-viewer__media-item h-full w-full object-contain"
              :style="imageStyle"
              @load="handleImageLoad"
            />

            <!-- Video -->
            <video
              v-else-if="currentItem.type === 'video'"
              :src="currentItem.url"
              :poster="currentItem.poster"
              class="app-media-viewer__media-item h-full w-full object-contain"
              controls
              playsinline
              @ended="handleVideoEnd"
            />

            <!-- Audio -->
            <div
              v-else-if="currentItem.type === 'audio'"
              class="app-media-viewer__media-item flex h-full w-full items-center justify-center bg-black"
            >
              <div class="w-full max-w-md px-8">
                <audio
                  :src="currentItem.url"
                  controls
                  class="w-full"
                />
                <p v-if="currentItem.filename" class="mt-2 text-center text-sm text-white/70">
                  {{ currentItem.filename }}
                </p>
              </div>
            </div>

            <!-- Fallback -->
            <div
              v-else
              class="app-media-viewer__media-placeholder px-8 text-center text-sm text-white/70"
            >
              {{ currentItem.alt || 'Media not available' }}
            </div>

            <!-- Pagination indicator -->
            <div
              v-if="items.length > 1"
              class="app-media-viewer__pagination absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2"
            >
              <span
                v-for="(_, index) in items"
                :key="index"
                class="app-media-viewer__dot rounded-full transition-all duration-200"
                :class="{
                  'bg-white': index === currentIndex,
                  'bg-white/30': index !== currentIndex
                }"
              />
            </div>

            <!-- Current position indicator -->
            <div
              v-if="items.length > 1"
              class="app-media-viewer__counter absolute top-4 right-4 z-10 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white"
            >
              {{ currentIndex + 1 }} / {{ items.length }}
            </div>
          </div>
        </MediaViewerGestureLayer>

        <!-- Toolbar -->
        <MediaViewerToolbar
          v-if="showChrome && currentItem && showToolbar !== false"
          :media-url="currentItem.url"
          :alt-text="currentItem.alt"
          :caption="currentItem.attribution"
          :can-share="canShare"
          :can-download="canDownload"
          show-close
          @close="close"
          @open-original="() => emit('open-original', currentItem)"
        />

        <!-- Close button (always visible when chrome hidden) -->
        <button
          v-if="!showChrome"
          type="button"
          class="app-media-viewer__close absolute top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          aria-label="Close"
          @click="close"
        >
          <AppIcon name="close" :size="20" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-media-viewer {
  /* Safe area insets */
  inset: 0;
  /* Prevent text selection */
  user-select: none;
  -webkit-user-select: none;
}

.app-media-viewer:focus {
  outline: none;
}

.app-media-viewer__content {
  /* Safe area insets */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.app-media-viewer__media-item {
  /* Ensure media is centered */
  max-width: 100%;
  max-height: 100%;
  transition: transform 0.3s ease;
}

.app-media-viewer__media-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
}

.app-media-viewer__pagination {
  pointer-events: none;
}

.app-media-viewer__dot {
  width: 6px;
  height: 6px;
}

.app-media-viewer__counter {
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.app-media-viewer__close {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  touch-action: manipulation;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.app-media-viewer__close:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.app-media-viewer__close:active {
  opacity: 0.7;
  transform: scale(0.95);
}

/* Transitions */
.media-viewer-enter-active,
.media-viewer-leave-active {
  transition: opacity 0.3s ease;
}

.media-viewer-enter-from,
.media-viewer-leave-to {
  opacity: 0;
}

.media-viewer-enter-to,
.media-viewer-leave-from {
  opacity: 1;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .app-media-viewer__media-item,
  .media-viewer-enter-active,
  .media-viewer-leave-active {
    transition: none;
  }
}
</style>
