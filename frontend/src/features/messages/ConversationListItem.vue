<script setup lang="ts">
/**
 * ConversationListItem - Individual conversation item for the Messages feature
 * 
 * Displays a single conversation summary with avatar, title, preview, and timestamp.
 * Supports selection state and unread count badges.
 * 
 * Security considerations:
 * - No sensitive data exposed
 * - All IDs are opaque strings
 * - Message preview text is sanitized/truncated
 * - User-triggered selection only
 */

import { computed } from 'vue'
import type { ConversationSummary } from './types'

export interface ConversationListItemProps {
  /** Conversation summary to display */
  conversation: ConversationSummary
  /** Whether this item is currently selected */
  isSelected?: boolean
  /** Whether to show unread count badge */
  showUnreadBadge?: boolean
  /** Custom CSS classes for the item */
  class?: string
}

const props = withDefaults(defineProps<ConversationListItemProps>(), {
  isSelected: false,
  showUnreadBadge: true,
  class: '',
})

const emit = defineEmits<{
  (e: 'select', conversationId: string): void
}>()

/**
 * Avatar colors based on conversation title hash
 */
const AVATAR_COLORS = [
  '#6f563d', '#9cb8bd', '#7c8793', '#6f5f41', '#96a2b0',
  '#a67c52', '#7a9399', '#6b7c85', '#8b6f47', '#7a8fa3',
]

/**
 * Compute avatar color based on conversation title
 */
const avatarColor = computed(() => {
  const title = props.conversation.title || ''
  const hash = title.split('').reduce((h, c) => h + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
})

/**
 * Compute initials from title or participants
 */
const avatarInitials = computed(() => {
  return props.conversation.avatarInitials || 
    (props.conversation.title 
      ? props.conversation.title
          .split(' ')
          .map(part => part.trim().charAt(0))
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : '??')
})

/**
 * Compute display title
 */
const displayTitle = computed(() => {
  return props.conversation.title || 'Unknown'
})

/**
 * Compute display subtitle
 */
const displaySubtitle = computed(() => {
  return props.conversation.subtitle || ''
})

/**
 * Compute display preview text
 */
const displayPreview = computed(() => {
  return props.conversation.lastMessagePreview || ''
})

/**
 * Compute formatted timestamp
 */
const formattedTimestamp = computed(() => {
  if (!props.conversation.lastMessageAt) return ''
  
  const date = new Date(props.conversation.lastMessageAt)
  if (Number.isNaN(date.getTime())) return ''
  
  // Relative time formatting
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
})

/**
 * Show unread badge if there are unread messages and feature is enabled
 */
const showBadge = computed(() => {
  return props.showUnreadBadge && props.conversation.unreadCount > 0
})

/**
 * Unread count display (capped at 99)
 */
const badgeCount = computed(() => {
  return Math.min(props.conversation.unreadCount, 99)
})

function handleClick(): void {
  emit('select', props.conversation.id)
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('select', props.conversation.id)
  }
}
</script>

<template>
  <button
    type="button"
    class="conversation-list-item"
    :class="[
      props.class,
      { 'conversation-list-item-selected': isSelected }
    ]"
    role="option"
    :aria-selected="isSelected"
    :aria-label="`Conversation with ${displayTitle}. ${showBadge ? `${badgeCount} unread messages.` : ''} Last message: ${displayPreview || 'None'}`"
    @click="handleClick"
    @keydown="handleKeyDown"
  >
    <div class="conversation-list-item-avatar" :style="{ backgroundColor: avatarColor }">
      <slot name="avatar">
        <span class="conversation-list-item-initials">{{ avatarInitials }}</span>
      </slot>
    </div>

    <div class="conversation-list-item-content">
      <div class="conversation-list-item-header">
        <slot name="title">
          <h3 class="conversation-list-item-title">{{ displayTitle }}</h3>
        </slot>
        <slot name="timestamp">
          <span v-if="formattedTimestamp" class="conversation-list-item-timestamp">
            {{ formattedTimestamp }}
          </span>
        </slot>
      </div>

      <div class="conversation-list-item-body">
        <slot name="subtitle">
          <p v-if="displaySubtitle" class="conversation-list-item-subtitle">
            {{ displaySubtitle }}
          </p>
        </slot>
        <slot name="preview">
          <p class="conversation-list-item-preview">
            {{ displayPreview || 'No messages yet' }}
          </p>
        </slot>
      </div>
    </div>

    <div v-if="showBadge" class="conversation-list-item-badge">
      <slot name="badge">
        <span class="conversation-list-item-badge-text">{{ badgeCount > 9 ? '9+' : badgeCount }}</span>
      </slot>
    </div>
  </button>
</template>

<style scoped>
.conversation-list-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: none;
  background: transparent;
  border-radius: 28px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  text-align: left;
  width: 100%;
}

.conversation-list-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.conversation-list-item-selected {
  background-color: #1a1a1a;
  color: white;
  box-shadow: 0 18px 44px rgba(35, 31, 32, 0.18);
}

.conversation-list-item-selected .conversation-list-item-title {
  color: white;
}

.conversation-list-item-selected .conversation-list-item-subtitle,
.conversation-list-item-selected .conversation-list-item-preview,
.conversation-list-item-selected .conversation-list-item-timestamp {
  color: rgba(255, 255, 255, 0.8);
}

.conversation-list-item-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-list-item-initials {
  color: white;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.conversation-list-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.conversation-list-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.conversation-list-item-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-list-item-timestamp {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
}

.conversation-list-item-body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.conversation-list-item-subtitle {
  margin: 0;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-list-item-preview {
  margin: 0;
  font-size: 14px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-list-item-selected .conversation-list-item-preview {
  color: rgba(255, 255, 255, 0.8);
}

.conversation-list-item-badge {
  flex-shrink: 0;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background-color: #1d9bf0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-list-item-badge-text {
  color: white;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.conversation-list-item-selected .conversation-list-item-badge {
  background-color: #1d9bf0;
  color: white;
}
</style>
