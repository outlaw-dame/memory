<script setup lang="ts">
/**
 * PostMediaCarousel - Horizontal carousel of media items for feed posts
 * 
 * Preserves existing carousel behavior and adds:
 * - Tap/click on image/video opens AppMediaViewer
 * - Respects aspect ratios to reduce layout shift
 * - Maintains alt text for accessibility
 * 
 * Security considerations:
 * - Input sanitization handled by Vue's template engine
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 */

import { ref, nextTick } from 'vue'
import AppMediaViewer from '@/features/media/AppMediaViewer.vue'

export interface CarouselMediaItem {
  type: 'image' | 'gif' | 'video' | 'audio'
  url: string
  alt?: string
  attribution?: string
  poster?: string      // for video
  filename?: string    // for audio
  duration?: number    // for audio (seconds)
}

const props = defineProps<{ items: CarouselMediaItem[] }>()

// Carousel state
const scrollEl = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

// Media viewer state
const mediaViewerRef = ref<InstanceType<typeof AppMediaViewer> | null>(null)

/**
 * Update active index based on scroll position
 */
function onScroll() {
  if (!scrollEl.value) return
  const el = scrollEl.value
  const idx = Math.round(el.scrollLeft / el.clientWidth)
  activeIndex.value = Math.min(Math.max(idx, 0), props.items.length - 1)
}

/**
 * Scroll to specific index
 */
function scrollTo(idx: number) {
  if (!scrollEl.value) return
  scrollEl.value.scrollTo({ left: idx * scrollEl.value.clientWidth, behavior: 'smooth' })
}

/**
 * Open media viewer at specific index
 * Security: Validates index bounds before opening
 */
function openViewerAt(index: number) {
  // Validate index
  if (index < 0 || index >= props.items.length) {
    console.warn('Invalid media index:', index)
    return
  }
  
  // Set active index and scroll to it
  activeIndex.value = index
  scrollTo(index)
  
  // Open viewer on next tick to ensure DOM is updated
  nextTick(() => {
    if (mediaViewerRef.value) {
      mediaViewerRef.value.setIndex(index)
      mediaViewerRef.value.open()
    }
  })
}

/**
 * Handle media click - opens viewer at that index
 */
function handleMediaClick(event: MouseEvent | TouchEvent, index: number) {
  // Prevent default to avoid any potential navigation
  event.preventDefault()
  event.stopPropagation()
  openViewerAt(index)
}

/**
 * Handle key down for accessibility
 */
function handleMediaKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openViewerAt(index)
  }
}
</script>

<template>
  <div class="post-media-carousel relative w-full select-none">
    <!-- Media viewer (teleported to body) -->
    <AppMediaViewer
      ref="mediaViewerRef"
      :items="props.items"
      :initial-index="activeIndex"
      :can-share="true"
      :can-download="true"
    />

    <!-- Scroll track -->
    <div
      ref="scrollEl"
      class="post-media-carousel__track flex overflow-x-auto gap-2 scroll-smooth"
      style="scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch;"
      @scroll="onScroll"
    >
      <div
        v-for="(item, i) in items"
        :key="i"
        class="post-media-carousel__item flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer"
        :style="items.length === 1 ? 'width:100%;min-height:200px;' : 'width:85%;min-height:180px;'"
        style="scroll-snap-align: start;"
        tabindex="0"
        :aria-label="item.alt || `Media item ${i + 1} of ${items.length}`"
        @click="handleMediaClick($event, i)"
        @keydown="handleMediaKeyDown($event, i)"
      >
        <!-- IMAGE / GIF -->
        <template v-if="item.type === 'image' || item.type === 'gif'">
          <img
            :src="item.url"
            :alt="item.alt || 'Post media'"
            loading="lazy"
            class="post-media-carousel__media w-full h-full object-cover"
            :class="{ 'cursor-pointer': item.type === 'image' || item.type === 'gif' }"
          />
          <span v-if="item.type === 'gif'"
            class="post-media-carousel__badge absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5"
          >
            GIF
          </span>
          <span v-if="item.attribution"
            class="post-media-carousel__attribution absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5"
          >
            {{ item.attribution }}
          </span>
        </template>

        <!-- VIDEO -->
        <template v-else-if="item.type === 'video'">
          <video
            :src="item.url"
            :poster="item.poster"
            class="post-media-carousel__media w-full h-full object-cover"
            preload="none"
            playsinline
            muted
            loop
          />
          <!-- Play overlay -->
          <div class="post-media-carousel__overlay absolute inset-0 flex items-center justify-center bg-black/20">
            <div class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <svg class="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          <span class="post-media-carousel__badge absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">
            VIDEO
          </span>
        </template>

        <!-- AUDIO -->
        <template v-else-if="item.type === 'audio'">
          <div class="post-media-carousel__audio w-full h-full bg-white flex flex-col items-center justify-center gap-3 px-4 py-6 min-h-[120px]">
            <!-- Mini waveform -->
            <div class="flex items-center gap-px h-10 w-full">
              <div
                v-for="j in 40"
                :key="j"
                class="flex-1 rounded-full"
                :style="{
                  height: `${Math.max(15, Math.min(100, 20 + 60 * Math.abs(Math.sin(j * 0.4)) * Math.abs(Math.sin(j * 0.15 + 0.5))))}%`,
                  background: 'color-mix(in srgb, var(--color-accent) 35%, transparent)',
                }"
              />
            </div>
            <div class="flex items-center gap-2 w-full">
              <svg class="w-4 h-4 flex-shrink-0" style="color:var(--color-accent)" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v18M8 8v8M4 10v4M16 8v8M20 10v4"/>
              </svg>
              <span class="text-caption text-dark-50 truncate">{{ item.filename ?? 'audio.wav' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Pagination dots -->
    <div v-if="items.length > 1" class="post-media-carousel__dots flex justify-center gap-1.5 mt-2">
      <button
        v-for="(_, i) in items"
        :key="i"
        type="button"
        class="post-media-carousel__dot rounded-full transition-all duration-200"
        :style="i === activeIndex
          ? 'width:16px;height:6px;background:var(--color-accent);'
          : 'width:6px;height:6px;background:rgba(55,55,55,0.2);'"
        :aria-label="`Go to media item ${i + 1}`"
        @click="scrollTo(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.post-media-carousel {
  /* Prevent text selection during interaction */
  user-select: none;
  -webkit-user-select: none;
}

.post-media-carousel__track {
  /* Hide scrollbar for cleaner look */
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.post-media-carousel__track::-webkit-scrollbar {
  display: none;
}

.post-media-carousel__item {
  /* Ensure aspect ratio is maintained */
  aspect-ratio: 9/14;
  /* Smooth transitions for hover/focus states */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  /* Touch feedback */
  -webkit-tap-highlight-color: transparent;
}

.post-media-carousel__item:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.post-media-carousel__item:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.post-media-carousel__item:active {
  transform: scale(0.98);
}

.post-media-carousel__media {
  /* Ensure media fills the container */
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Prevent pointer events from interfering with gestures */
  pointer-events: none;
}

.post-media-carousel__badge {
  /* Style for type badges */
  pointer-events: none;
}

.post-media-carousel__attribution {
  /* Style for attribution */
  pointer-events: none;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-media-carousel__overlay {
  /* Style for video play overlay */
  pointer-events: none;
}

.post-media-carousel__dots {
  /* Prevent dots from interfering with carousel scrolling */
  pointer-events: auto;
}

.post-media-carousel__dot {
  cursor: pointer;
  transition: background-color 0.2s ease, width 0.2s ease, height 0.2s ease;
}

.post-media-carousel__dot:hover {
  opacity: 0.8;
}

.post-media-carousel__dot:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
