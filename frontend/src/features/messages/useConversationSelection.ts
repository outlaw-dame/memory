/**
 * useConversationSelection - Composable for managing conversation selection state
 * 
 * Provides reactive state for selected conversation and navigation between conversations.
 * Handles loading states and error management for conversation data.
 * 
 * Security considerations:
 * - No sensitive data in state
 * - All IDs are opaque strings
 * - User-triggered navigation only
 * - No automatic data loading without user intent
 */

import { computed, ref, watch } from 'vue'
import type { ConversationSummary, ConversationDetail, MessagesUIState, MessagesErrorState } from './types'

export interface UseConversationSelectionOptions {
  /** Initial conversation ID */
  initialId?: string | null
  /** Whether to auto-select first conversation */
  autoSelectFirst?: boolean
}

export interface UseConversationSelectionReturn {
  /** Currently selected conversation ID */
  selectedId: string | null
  /** Currently selected conversation summary */
  selectedSummary: ConversationSummary | null
  /** Currently selected conversation detail */
  selectedDetail: ConversationDetail | null
  /** Conversation list */
  conversations: ConversationSummary[]
  /** UI state */
  uiState: MessagesUIState
  /** Error state */
  errorState: MessagesErrorState | null
  /** Whether a conversation is selected */
  hasSelection: boolean
  /** Whether we're loading a conversation */
  isLoading: boolean
  /** Whether we're in an error state */
  hasError: boolean
  
  /** Select a conversation by ID */
  select: (conversationId: string) => Promise<void>
  /** Select the first conversation */
  selectFirst: () => Promise<void>
  /** Select the next conversation */
  selectNext: () => Promise<void>
  /** Select the previous conversation */
  selectPrevious: () => Promise<void>
  /** Clear selection */
  clear: () => void
  /** Set conversations list */
  setConversations: (conversations: ConversationSummary[]) => void
  /** Set conversation detail */
  setDetail: (detail: ConversationDetail | null) => void
  /** Set UI state */
  setUiState: (state: MessagesUIState) => void
  /** Set error state */
  setError: (error: MessagesErrorState | null) => void
  /** Get conversation by ID */
  getConversation: (id: string) => ConversationSummary | null
  /** Resolve conversation summary to detail */
  resolveConversation: (id: string) => Promise<ConversationDetail | null>
}

export type ConversationResolver = (id: string) => Promise<ConversationDetail | null>

/**
 * Main composable function
 */
export function useConversationSelection(
  options: UseConversationSelectionOptions = {},
  conversationResolver?: ConversationResolver
): UseConversationSelectionReturn {
  const { 
    initialId = null, 
    autoSelectFirst = true 
  } = options
  
  const conversations = ref<ConversationSummary[]>([])
  const selectedId = ref<string | null>(initialId)
  const selectedDetail = ref<ConversationDetail | null>(null)
  const uiState = ref<MessagesUIState>('loading')
  const errorState = ref<MessagesErrorState | null>(null)
  const isLoadingDetail = ref(false)
  
  // Compute derived state
  const selectedSummary = computed(() => {
    if (!selectedId.value) return null
    return conversations.value.find(c => c.id === selectedId.value) ?? null
  })
  
  const hasSelection = computed(() => selectedId.value !== null)
  const isLoading = computed(() => uiState.value === 'loading' || isLoadingDetail.value)
  const hasError = computed(() => uiState.value === 'error' || errorState.value !== null)
  
  /**
   * Get conversation by ID
   */
  function getConversation(id: string): ConversationSummary | null {
    return conversations.value.find(c => c.id === id) ?? null
  }
  
  /**
   * Select a conversation by ID
   */
  async function select(conversationId: string): Promise<void> {
    const conversation = getConversation(conversationId)
    
    if (!conversation) {
      setError({
        type: 'notFound',
        message: 'Conversation not found',
        recoverable: true,
      })
      return
    }
    
    // Clear any previous error
    setError(null)
    
    // Set selection
    selectedId.value = conversationId
    
    // Load detail if resolver is provided
    if (conversationResolver) {
      isLoadingDetail.value = true
      setUiState('loading')
      
      try {
        const detail = await conversationResolver(conversationId)
        selectedDetail.value = detail
        setUiState(detail ? 'ready' : 'empty')
      } catch (err) {
        setError({
          type: 'unknown',
          message: 'Failed to load conversation',
          recoverable: true,
          recoveryAction: () => select(conversationId),
        })
        setUiState('error')
      } finally {
        isLoadingDetail.value = false
      }
    }
  }
  
  /**
   * Select the first conversation
   */
  async function selectFirst(): Promise<void> {
    if (conversations.value.length === 0) {
      selectedId.value = null
      selectedDetail.value = null
      return
    }
    
    await select(conversations.value[0].id)
  }
  
  /**
   * Select the next conversation
   */
  async function selectNext(): Promise<void> {
    if (!selectedId.value) {
      await selectFirst()
      return
    }
    
    const currentIndex = conversations.value.findIndex(c => c.id === selectedId.value)
    if (currentIndex < 0 || currentIndex >= conversations.value.length - 1) {
      return
    }
    
    await select(conversations.value[currentIndex + 1].id)
  }
  
  /**
   * Select the previous conversation
   */
  async function selectPrevious(): Promise<void> {
    if (!selectedId.value) {
      await selectFirst()
      return
    }
    
    const currentIndex = conversations.value.findIndex(c => c.id === selectedId.value)
    if (currentIndex <= 0) {
      return
    }
    
    await select(conversations.value[currentIndex - 1].id)
  }
  
  /**
   * Clear selection
   */
  function clear(): void {
    selectedId.value = null
    selectedDetail.value = null
    setUiState('empty')
    setError(null)
  }
  
  /**
   * Set conversations list
   */
  function setConversations(newConversations: ConversationSummary[]): void {
    conversations.value = newConversations
    
    // If no selection and conversations exist, auto-select first
    if (!hasSelection.value && newConversations.length > 0 && autoSelectFirst) {
      void selectFirst()
    } else if (newConversations.length === 0) {
      clear()
    }
  }
  
  /**
   * Set conversation detail
   */
  function setDetail(detail: ConversationDetail | null): void {
    selectedDetail.value = detail
    setUiState(detail ? 'ready' : hasSelection.value ? 'loading' : 'empty')
  }
  
  /**
   * Set UI state
   */
  function setUiState(newState: MessagesUIState): void {
    uiState.value = newState
  }
  
  /**
   * Set error state
   */
  function setError(newError: MessagesErrorState | null): void {
    errorState.value = newError
    
    if (newError) {
      setUiState('error')
    } else if (!hasSelection.value) {
      setUiState(conversations.value.length > 0 ? 'ready' : 'empty')
    }
  }
  
  /**
   * Resolve conversation summary to detail
   */
  async function resolveConversation(id: string): Promise<ConversationDetail | null> {
    if (!conversationResolver) return null
    return conversationResolver(id)
  }
  
  // Auto-select first on initial load if configured
  watch(conversations, (newConversations) => {
    if (newConversations.length > 0 && !hasSelection.value && autoSelectFirst) {
      void selectFirst()
    }
  }, { immediate: true })
  
  return {
    selectedId,
    selectedSummary,
    selectedDetail,
    conversations,
    uiState,
    errorState,
    hasSelection,
    isLoading,
    hasError,
    select,
    selectFirst,
    selectNext,
    selectPrevious,
    clear,
    setConversations,
    setDetail,
    setUiState,
    setError,
    getConversation,
    resolveConversation,
  }
}

export default useConversationSelection
