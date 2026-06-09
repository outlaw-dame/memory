/**
 * StoryProgressBar - Progress indicators for story viewer
 *
 * Responsibilities:
 * - Show progress for each story item in a group
 * - Display current item's progress
 * - Animate smoothly
 * - Respect reduced motion
 */

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { StoryItem } from '@/stores/atBridgeStore'

export interface StoryProgressBarProps {
  items: StoryItem[]
  currentIndex: number | Ref<number>
  progress: number | Ref<number>
  isPaused?: boolean | Ref<boolean>
}

const props = defineProps<StoryProgressBarProps>()

// Normalize props to refs
const currentIndex = computed(() => {
  return typeof props.currentIndex === 'number' ? props.currentIndex : props.currentIndex.value
})

const progress = computed(() => {
  return typeof props.progress === 'number' ? props.progress : props.progress.value
})

const isPaused = computed(() => {
  const val = props.isPaused
  return typeof val === 'boolean' ? val : val?.value
})

// Reduced motion preference
const reducedMotion = ref(false)

onMounted(() => {
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = mediaQuery.matches
    mediaQuery.addEventListener('change', (e) => {
      reducedMotion.value = e.matches
    })
  }
})

onBeforeUnmount(() => {
  // Cleanup handled by Vue
})
</script>

<template>
  <div
    class="story-progress-bar absolute left-3 right-3 top-3 z-20 flex gap-1"
    role="progressbar"
    aria-label="Story progress"
  >
    <span
      v-for="(item, index) in items"
      :key="item.uri"
      class="story-progress-bar__item h-1 flex-1 overflow-hidden rounded-full bg-white/30"
    >
      <!-- Filled portion -->
      <span
        class="story-progress-bar__fill block h-full rounded-full bg-white transition-all duration-100 ease-linear"
        :class="{
          'transition-none': reducedMotion || isPaused
        }"
        :style="{
          width: `${index < currentIndex ? 100 : index === currentIndex ? progress : 0}%`,
          // Disable transitions for reduced motion
          transition: reducedMotion || isPaused ? 'none' : 'width 0.1s ease-linear'
        }"
      />
    </span>
  </div>
</template>

<style scoped>
.story-progress-bar {
  /* Ensure progress bar is visible on dark backgrounds */
  pointer-events: none;
}

.story-progress-bar__item {
  min-width: 0; /* Allow flex items to shrink */
}

.story-progress-bar__fill {
  /* Smooth animation for progress */
  will-change: width;
}
</style>
