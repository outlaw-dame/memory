/**
 * useExploreSearch - Explore Search State Composable
 * 
 * Manages all search state for the Explore feature including:
 * - Search query and submitted query
 * - Search mode (default, history, results)
 * - Search history management
 * - Query type detection (user, tag, general)
 * - Result state
 */

import { computed, ref, type Ref, type ComputedRef } from 'vue'
import { defaultSearchHistory } from './exploreDemoData'

// Search mode types
export type ExploreMode = 'default' | 'history' | 'results'

// Search type based on query prefix
export type SearchType = 'user' | 'tag' | 'general'

export interface UseExploreSearchReturn {
  // State
  searchQuery: Ref<string>
  isSearchFocused: Ref<boolean>
  submittedQuery: Ref<string>
  searchHistory: Ref<string[]>
  
  // Computed
  mode: ComputedRef<ExploreMode>
  searchType: ComputedRef<SearchType>
  searchTerm: ComputedRef<string>
  hasResults: ComputedRef<boolean>
  
  // Actions
  submitSearch: () => void
  exitSearch: () => void
  selectHistoryItem: (item: string) => void
  removeHistoryItem: (index: number) => void
  clearSearchHistory: () => void
  setSearchFocused: (focused: boolean) => void
}

/**
 * Composable for managing explore search state
 */
export function useExploreSearch(): UseExploreSearchReturn {
  // Search query state
  const searchQuery = ref('')
  const isSearchFocused = ref(false)
  const submittedQuery = ref('')
  
  // Search history state - initialized with default demo data
  const searchHistory = ref<string[]>([...defaultSearchHistory])

  // Three modes: 'default' | 'history' | 'results'
  const mode = computed<ExploreMode>(() => {
    if (submittedQuery.value) return 'results'
    if (isSearchFocused.value) return 'history'
    return 'default'
  })

  // Parse query intent from prefix
  const searchType = computed<SearchType>(() => {
    const q = submittedQuery.value
    if (q.startsWith('user=')) return 'user'
    if (q.startsWith('#')) return 'tag'
    return 'general'
  })

  const searchTerm = computed(() => {
    const q = submittedQuery.value
    if (q.startsWith('user=')) return q.slice(5).trim()
    if (q.startsWith('#')) return q.slice(1).trim()
    return q
  })

  // Mock "no results" — simulate by detecting long random strings (no spaces, >18 chars)
  const hasResults = computed(() => {
    const t = submittedQuery.value
    return !(t.length > 18 && !t.includes(' ') && !t.startsWith('#') && !t.startsWith('user='))
  })

  // Actions
  function submitSearch(): void {
    const q = searchQuery.value.trim()
    if (!q) return
    submittedQuery.value = q
    if (!searchHistory.value.includes(q)) {
      searchHistory.value.unshift(q)
    }
    isSearchFocused.value = false
  }

  function exitSearch(): void {
    searchQuery.value = ''
    submittedQuery.value = ''
    isSearchFocused.value = false
  }

  function selectHistoryItem(item: string): void {
    searchQuery.value = item
    submitSearch()
  }

  function removeHistoryItem(index: number): void {
    searchHistory.value.splice(index, 1)
  }

  function clearSearchHistory(): void {
    searchHistory.value = []
  }

  function setSearchFocused(focused: boolean): void {
    isSearchFocused.value = focused
  }

  return {
    // State
    searchQuery,
    isSearchFocused,
    submittedQuery,
    searchHistory,
    
    // Computed
    mode,
    searchType,
    searchTerm,
    hasResults,
    
    // Actions
    submitSearch,
    exitSearch,
    selectHistoryItem,
    removeHistoryItem,
    clearSearchHistory,
    setSearchFocused,
  }
}
