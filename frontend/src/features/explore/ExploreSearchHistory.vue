<script setup lang="ts">
/**
 * ExploreSearchHistory - Search history list for Explore view
 * 
 * Displays search history items as native list rows with:
 * - Ability to select an item (re-runs the search)
 * - Ability to remove individual items
 * - Ability to clear all history
 */

import AppIcon from '@/components/AppIcon.vue'

interface Props {
  searchHistory: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', item: string): void
  (e: 'remove', index: number): void
  (e: 'clear'): void
}>()

function handleSelect(item: string): void {
  emit('select', item)
}

function handleRemove(index: number): void {
  emit('remove', index)
}

function handleClear(): void {
  emit('clear')
}
</script>

<template>
  <div class="flex-1 px-4 pt-2 pb-28 flex flex-col gap-2">
    <!-- Clear History Button -->
    <div class="flex justify-end mb-1">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-full px-4 py-2 text-footnote font-semibold"
        style="background: rgba(239,68,68,0.12); color: rgb(239,68,68);"
        @click="handleClear"
        aria-label="Clear search history"
      >
        Clear Search History
        <AppIcon name="trash" :size="14" color="currentColor" />
      </button>
    </div>

    <!-- History Items -->
    <div
      v-for="(item, i) in searchHistory"
      :key="`${i}-${item}`"
      class="flex items-center rounded-2xl bg-white px-4 py-3 cursor-pointer hover:bg-dark-5 transition-colors"
      @click="handleSelect(item)"
      role="button"
      tabindex="0"
      :aria-label="`Search for ${item}`"
    >
      <span class="flex-1 text-sm text-dark font-medium">{{ item }}</span>
      <button
        type="button"
        class="w-7 h-7 flex items-center justify-center rounded-full text-dark-30 hover:bg-dark-10 transition-colors"
        @click.stop="handleRemove(i)"
        :aria-label="`Remove ${item} from history`"
      >
        <AppIcon name="close" :size="14" color="currentColor" />
      </button>
    </div>
  </div>
</template>
