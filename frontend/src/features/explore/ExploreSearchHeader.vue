<script setup lang="ts">
/**
 * ExploreSearchHeader - Search header for Explore view
 * 
 * Handles different header layouts based on search mode:
 * - Default/History: Shows "explore." title with search bar
 * - Results: Shows back button with search bar (no title)
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { AppSearchBar } from '@/design/semantic'
import AppIcon from '@/components/AppIcon.vue'
import type { ExploreMode } from './useExploreSearch'

interface Props {
  mode: ExploreMode
  searchQuery: string
  isSearchFocused: boolean
  submittedQuery: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'update:isSearchFocused', value: boolean): void
  (e: 'search'): void
  (e: 'clear'): void
  (e: 'exit'): void
  (e: 'back'): void
}>()

const router = useRouter()

// Computed properties for event handlers
const handleFocus = () => {
  emit('update:isSearchFocused', true)
}

const handleBlur = () => {
  // Keep focused if there's a submitted query
  if (props.submittedQuery.length > 0) {
    emit('update:isSearchFocused', false)
  }
}

const handleSearch = () => {
  emit('search')
}

const handleClear = () => {
  emit('clear')
}

const handleExit = () => {
  emit('exit')
}

const handleBack = () => {
  emit('back')
}

// Sync searchQuery prop
const searchQueryProxy = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit('update:searchQuery', value),
})
</script>

<template>
  <!-- Default / History header: "explore." title + search bar -->
  <div
    v-if="mode !== 'results'"
    class="px-4 pt-4 pb-3 sticky top-0 z-20"
    style="background: var(--color-pastel-light, #f2f0ec);"
  >
    <div class="relative flex items-center justify-center mb-3">
      <button
        type="button"
        class="absolute left-0 w-9 h-9 flex items-center justify-center rounded-full"
        style="background: rgba(55,55,55,0.1); color: rgba(55,55,55,0.6);"
        @click="handleBack"
        aria-label="Go back"
      >
        <AppIcon name="back" :size="16" color="currentColor" />
      </button>
      <h1 class="font-black text-dark" style="font-size: 1.75rem; letter-spacing: -0.04em;" aria-label="Explore">explore.</h1>
      <button
        type="button"
        class="absolute right-0 w-9 h-9 flex items-center justify-center rounded-full"
        style="background: rgba(55,55,55,0.1); color: rgba(55,55,55,0.6);"
        @click="handleBack"
        aria-label="Close"
      >
        <AppIcon name="close" :size="16" color="currentColor" />
      </button>
    </div>

    <AppSearchBar
      v-model="searchQueryProxy"
      placeholder="Search posts/tags/users..."
      :show-cancel="false"
      @focus="handleFocus"
      @blur="handleBlur"
      @search="handleSearch"
      @clear="handleClear"
      type="search"
      inputmode="search"
      enterkeyhint="search"
      autocapitalize="none"
      spellcheck="false"
    />
  </div>

  <!-- Results header: back button + search bar only (no title) -->
  <div
    v-else
    class="px-4 pt-4 pb-3 sticky top-0 z-20 flex items-center gap-3"
    style="background: var(--color-pastel-light, #f2f0ec);"
  >
    <button
      type="button"
      class="h-9 w-9 shrink-0 flex items-center justify-center rounded-full"
      style="background: rgba(55,55,55,0.1); color: rgba(55,55,55,0.6);"
      @click="handleExit"
      aria-label="Back to explore"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <AppSearchBar
      v-model="searchQueryProxy"
      class="flex-1"
      :show-cancel="false"
      @search="handleSearch"
      @clear="handleClear"
      type="search"
      inputmode="search"
      enterkeyhint="search"
      autocapitalize="none"
      spellcheck="false"
    />
  </div>
</template>
