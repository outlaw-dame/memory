<script setup lang="ts">
/**
 * ExplorePersonRow - Reusable person row component for Explore view
 * 
 * Displays a person with follow/unfollow button
 * Used in: Recommended People, Search Results
 */

import { ref } from 'vue'

interface Props {
  id: string
  name: string
  handle: string
  initials: string
  color: string
  isFollowing?: boolean
  showBorder?: boolean
  isLast?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'follow', id: string): void
}>()

// Local follow state (optional, can be controlled by parent)
const localFollowing = ref(props.isFollowing ?? false)

function handleFollow(): void {
  localFollowing.value = !localFollowing.value
  emit('follow', props.id)
}
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3"
    :class="{ 'border-b border-dark-5': !isLast && showBorder }"
  >
    <!-- Avatar -->
    <div
      class="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
      :style="{ background: color }"
    >
      {{ initials }}
    </div>

    <!-- Person info -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-bold text-dark">{{ name }}</p>
      <p class="text-xs text-dark-50">{{ handle }}</p>
    </div>

    <!-- Follow button -->
    <button
      type="button"
      class="rounded-xl px-5 py-2 text-sm font-bold shrink-0 transition-colors"
      :style="localFollowing 
        ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
        : 'background:var(--color-accent);color:#fff;'
      "
      @click="handleFollow"
      :aria-label="localFollowing ? `Unfollow ${name}` : `Follow ${name}`"
    >
      {{ localFollowing ? 'Unfollow' : 'Follow' }}
    </button>
  </div>
</template>
