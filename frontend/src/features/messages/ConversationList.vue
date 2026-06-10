<script setup lang="ts">
/**
 * ConversationList - List of conversations for the Messages feature
 * 
 * Displays a scrollable list of conversation summaries with selection support.
 * Uses the ConversationSummary type from the UI model.
 * 
 * Security considerations:
 * - No sensitive data exposed
 * - All IDs are opaque strings
 * - User-triggered actions only
 * - No auto-selection or navigation without user intent
 */

import { computed } from 'vue'
import ConversationListItem from './ConversationListItem.vue'
import type { ConversationSummary } from './types'

export interface ConversationListProps {
  /** List of conversation summaries to display */
  conversations: ConversationSummary[]
  /** Currently selected conversation ID */
  selectedId?: string | null
  /** Whether the list is in a loading state */
  isLoading?: boolean
  /** Whether to show unread count badges */
  showUnreadBadges?: boolean
  /** Maximum number of conversations to display (0 = unlimited) */
  maxCount?: number
  /** Custom CSS classes for the list container */
  class?: string
}

const props = withDefaults(defineProps<ConversationListProps>(), {
  selectedId: null,
  isLoading: false,
  showUnreadBadges: true,
  maxCount: 0,
  class: '',
})

const emit = defineEmits<{
  (e: 'select', conversationId: string): void
  (e: 'loadMore'): void
}>()

/**
 * Filtered and limited conversations list
 */
const displayConversations = computed(() => {
  if (props.maxCount <= 0) return props.conversations
  return props.conversations.slice(0, props.maxCount)
})

/**
 * Check if there are more conversations to load
 */
const hasMore = computed(() => {
  return props.maxCount > 0 && props.conversations.length > props.maxCount
})

function handleSelect(conversationId: string): void {
  emit('select', conversationId)
}

function handleLoadMore(): void {
  emit('loadMore')
}

expose({
  refresh: () => {
    // Expose refresh method for external control
  },
})
</script>

<template>
  <div
    class="conversation-list"
    :class="[props.class, { 'conversation-list-loading': isLoading }]"
    role="listbox"
    aria-label="Conversations"
  >
    <slot name="header" />

    <div class="conversation-list-content">
      <ConversationListItem
        v-for="conversation in displayConversations"
        :key="conversation.id"
        :conversation="conversation"
        :is-selected="conversation.id === selectedId"
        :show-unread-badge="showUnreadBadges"
        @select="handleSelect"
      />
    </div>

    <div v-if="hasMore" class="conversation-list-more">
      <slot name="loadMore">
        <button
          type="button"
          class="conversation-list-load-more"
          aria-label="Load more conversations"
          @click="handleLoadMore"
        >
          Load more...
        </button>
      </slot>
    </div>

    <slot name="footer" />
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  overflow-y: auto;
}

.conversation-list-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.conversation-list-more {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.conversation-list-load-more {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1d9bf0;
  background: transparent;
  border: 1px solid #1d9bf0;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.conversation-list-load-more:hover {
  background-color: rgba(29, 155, 240, 0.05);
}
</style>
