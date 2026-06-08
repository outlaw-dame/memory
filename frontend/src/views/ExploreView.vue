<script setup lang="ts">
/**
 * ExploreView - Main explore page
 * 
 * Orchestrates the explore feature by composing:
 * - Search state management (useExploreSearch)
 * - Search header
 * - Search history
 * - Search results
 * - Default explore content (trending tags, recommended tags, recommended people, latest posts)
 */

import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  useExploreSearch,
  type ExploreMode,
  type SearchType,
} from '@/features/explore/useExploreSearch'
import ExploreSearchHeader from '@/features/explore/ExploreSearchHeader.vue'
import ExploreSearchHistory from '@/features/explore/ExploreSearchHistory.vue'
import ExploreSearchResults from '@/features/explore/ExploreSearchResults.vue'
import ExploreTrendingTags from '@/features/explore/ExploreTrendingTags.vue'
import ExploreRecommendedTags from '@/features/explore/ExploreRecommendedTags.vue'
import ExploreRecommendedPeople from '@/features/explore/ExploreRecommendedPeople.vue'
import ExploreLatestPosts from '@/features/explore/ExploreLatestPosts.vue'
import {
  trendingTags,
  recommendedTags,
  people,
} from '@/features/explore/exploreDemoData'

const router = useRouter()

// Use the explore search composable
const {
  searchQuery,
  isSearchFocused,
  submittedQuery,
  searchHistory,
  mode,
  searchType,
  searchTerm,
  hasResults,
  submitSearch,
  exitSearch,
  selectHistoryItem,
  removeHistoryItem,
  clearSearchHistory,
  setSearchFocused,
} = useExploreSearch()

// Tag follow state
const followedTags = ref<Set<string>>(new Set(['cats']))
function toggleTag(tag: string): void {
  if (followedTags.value.has(tag)) {
    followedTags.value.delete(tag)
  } else {
    followedTags.value.add(tag)
  }
}

// Handle back navigation
function handleBack(): void {
  router.back()
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--color-pastel-light, #f2f0ec);">

    <!-- Search Header -->
    <ExploreSearchHeader
      :mode="mode"
      :search-query="searchQuery"
      :is-search-focused="isSearchFocused"
      :submitted-query="submittedQuery"
      @update:search-query="searchQuery = $event"
      @update:is-search-focused="setSearchFocused($event)"
      @search="submitSearch"
      @clear="searchQuery = ''"
      @exit="exitSearch"
      @back="handleBack"
    />

    <!-- History panel -->
    <ExploreSearchHistory
      v-if="mode === 'history'"
      :search-history="searchHistory"
      @select="selectHistoryItem"
      @remove="removeHistoryItem"
      @clear="clearSearchHistory"
    />

    <!-- Search Results -->
    <ExploreSearchResults
      v-else-if="mode === 'results'"
      :search-type="searchType"
      :search-term="searchTerm"
      :has-results="hasResults"
      :followed-tags="followedTags"
      @toggle-tag="toggleTag"
    />

    <!-- Default explore content -->
    <div v-else class="flex-1 overflow-y-auto px-4 pb-28 pt-3 flex flex-col gap-4">
      <!-- Trending Tags -->
      <ExploreTrendingTags
        :tags="trendingTags"
        :followed-tags="followedTags"
        @toggle-tag="toggleTag"
      />

      <!-- Recommended Tags -->
      <ExploreRecommendedTags
        :tags="recommendedTags"
        :followed-tags="followedTags"
        @toggle-tag="toggleTag"
      />

      <!-- Recommended People -->
      <ExploreRecommendedPeople :people="people" />

      <!-- Latest Posts -->
      <ExploreLatestPosts />
    </div>
  </div>
</template>
