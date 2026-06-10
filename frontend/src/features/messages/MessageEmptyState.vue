<script setup lang="ts">
/**
 * MessageEmptyState - Empty state for messages
 */

export interface MessageEmptyStateProps {
  type?: 'noConversations' | 'noSelectedConversation' | 'noMessages'
  title?: string
  description?: string
}

const props = withDefaults(defineProps<MessageEmptyStateProps>(), {
  type: 'noConversations',
  title: '',
  description: '',
})

const defaultContent = {
  noConversations: {
    title: 'No conversations',
    description: 'Start a new conversation to get started',
  },
  noSelectedConversation: {
    title: 'Select a conversation',
    description: 'Choose a conversation to start messaging',
  },
  noMessages: {
    title: 'No messages yet',
    description: 'Send a message to start the conversation',
  },
}

const displayTitle = props.title || defaultContent[props.type].title
const displayDescription = props.description || defaultContent[props.type].description
</script>

<template>
  <div class="message-empty-state">
    <slot :title="displayTitle" :description="displayDescription">
      <div class="message-empty-state-content">
        <svg viewBox="0 0 24 24" class="message-empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h3 class="message-empty-state-title">{{ displayTitle }}</h3>
        <p class="message-empty-state-description">{{ displayDescription }}</p>
        <slot name="content" />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.message-empty-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.message-empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.message-empty-state-icon {
  width: 64px;
  height: 64px;
  color: #666;
  opacity: 0.7;
}

.message-empty-state-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.message-empty-state-description {
  margin: 0;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
  max-width: 300px;
}
</style>
