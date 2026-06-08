<script setup lang="ts">
/**
 * ExploreTagRow - Reusable tag row component for Explore view
 * 
 * Displays a tag with follow/unfollow button
 * Used in: Trending Tags, Recommended Tags, Search Results
 */

import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

interface Props {
  tag: string
  count: string
  isFollowed?: boolean
  showBorder?: boolean
  isLast?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

// Local follow state (optional, can be controlled by parent)
const localFollowed = ref(props.isFollowed ?? false)

function handleToggle(): void {
  localFollowed.value = !localFollowed.value
  emit('toggle')
}
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3"
    :class="{ 'border-b border-dark-5': !isLast && showBorder }"
  >
    <!-- Tag hash icon -->
    <div class="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center" :style="localFollowed 
      ? 'background: color-mix(in srgb, var(--color-accent) 20%, transparent);'
      : 'background: color-mix(in srgb, var(--color-accent) 12%, transparent);'
    ">
      <span class="text-lg font-black" :style="localFollowed 
        ? 'color: color-mix(in srgb, var(--color-accent) 50%, transparent);'
        : 'color: var(--color-accent);'
      ">#</span>
    </div>

    <!-- Tag info -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-bold text-dark">#{{ tag }}</p>
      <p class="text-xs text-dark-50">{{ count }}</p>
    </div>

    <!-- Follow button -->
    <button
      type="button"
      class="rounded-xl px-5 py-2 text-sm font-bold shrink-0 transition-colors"
      :style="localFollowed 
        ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
        : 'background:var(--color-accent);color:#fff;'
      "
      @click="handleToggle"
      :aria-label="localFollowed ? 'Unfollow tag' : 'Follow tag'"
    >
      {{ localFollowed ? 'Followed' : 'Follow' }}
    </button>
  </div>
</template>
