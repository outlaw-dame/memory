<script setup lang="ts">
/**
 * ConversationThread - Thread view for a single conversation
 * 
 * Displays conversation header with participants and message list.
 * Manages message display and scrolling behavior.
 * 
 * Security considerations:
 * - No sensitive data exposed
 * - All IDs are opaque strings
 * - Message content is rendered safely
 * - No auto-loading of sensitive data
 */

import { computed, ref, watch, nextTick } from 'vue'
import MessageBubble from './MessageBubble.vue'
import type { ConversationDetail, MessageItem } from './types'

export interface ConversationThreadProps {
  /** Conversation detail to display */
  conversation: ConversationDetail | null
  /** Whether to show the header */
  showHeader?: boolean
  /** Whether to auto-scroll to bottom on new messages */
  autoScroll?: boolean
  /** Custom CSS classes for the thread container */
  class?: string
}

const props = withDefaults(defineProps<ConversationThreadProps>(), {
  showHeader: true,
  autoScroll: true,
  class: '',
})

const emit = defineEmits<{
  (e: 'scrollTop'): void
  (e: 'messageAction', action: string, messageId: string): void
}>()

const threadContainer = ref<HTMLElement | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)

/**
 * Whether we're at the bottom of the thread
 */
const isAtBottom = ref(true)

/**
 * Track if user has manually scrolled
 */
const hasManualScroll = ref(false)

/**
 * Sorted messages (oldest first)
 */
const sortedMessages = computed(() => {
  if (!props.conversation) return []
  return [...props.conversation.messages].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
})

/**
 * Conversation participants for display
 */
const displayParticipants = computed(() => {
  return props.conversation?.participants || []
})

/**
 * Conversation type
 */
const conversationType = computed(() => {
  return props.conversation?.type || 'direct'
})

/**
 * Conversation title
 */
const displayTitle = computed(() => {
  return props.conversation?.title || 'Conversation'
})

/**
 * Participant count for display
 */
const participantCount = computed(() => {
  return displayParticipants.value.length
})

/**
 * Check if there are messages
 */
const hasMessages = computed(() => {
  return sortedMessages.value.length > 0
})

/**
 * Scroll to bottom of thread
 */
async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    isAtBottom.value = true
    hasManualScroll.value = false
  }
}

/**
 * Handle scroll events to track position
 */
function handleScroll(event: Event): void {
  const target = event.target as HTMLElement
  if (!target) return
  
  const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 10
  isAtBottom.value = atBottom
  
  if (atBottom) {
    hasManualScroll.value = false
  } else {
    hasManualScroll.value = true
  }
}

/**
 * Handle message action from child bubble
 */
function handleMessageAction(action: string, messageId: string): void {
  emit('messageAction', action, messageId)
}

/**
 * Format participant display name
 */
function formatParticipantLabel(participantId: string): string {
  const participant = displayParticipants.value.find(p => p.id === participantId)
  return participant?.displayName || participantId
}

// Auto-scroll on new messages
watch(
  () => sortedMessages.value,
  (newMessages, oldMessages) => {
    if (props.autoScroll && !hasManualScroll.value && newMessages.length > oldMessages.length) {
      void scrollToBottom()
    }
  },
  { deep: true }
)

// Auto-scroll on initial load
watch(
  () => props.conversation,
  () => {
    if (props.autoScroll) {
      void scrollToBottom()
    }
  },
  { immediate: true }
)

// Expose methods
expose({
  scrollToBottom,
  getMessagesContainer: () => messagesContainer.value,
})
</script>

<template>
  <div
    ref="threadContainer"
    class="conversation-thread"
    :class="[props.class, { 'conversation-thread-empty': !hasMessages }]"
    role="region"
    aria-label="Conversation thread"
  >
    <!-- Thread Header -->
    <header v-if="showHeader && conversation" class="conversation-thread-header">
      <slot name="header" :conversation="conversation">
        <div class="conversation-thread-header-content">
          <h2 class="conversation-thread-title">{{ displayTitle }}</h2>
          <p class="conversation-thread-type">
            {{ conversationType === 'group' 
              ? `${participantCount} participants` 
              : 'Direct message' }}
          </p>
        </div>
        <div class="conversation-thread-header-participants">
          <slot name="participants">
            <span
              v-for="participant in displayParticipants"
              :key="participant.id"
              class="conversation-thread-participant"
            >
              {{ participant.displayName || participant.id }}
            </span>
          </slot>
        </div>
      </slot>
    </header>

    <!-- Messages Container -->
    <div
      ref="messagesContainer"
      class="conversation-thread-messages"
      @scroll="handleScroll"
    >
      <slot name="messages" :messages="sortedMessages">
        <div v-if="!hasMessages" class="conversation-thread-empty-state">
          <slot name="empty">
            <p class="conversation-thread-empty-text">
              {{ conversation ? 'No messages yet' : 'Select a conversation' }}
            </p>
          </slot>
        </div>

        <template v-else>
          <MessageBubble
            v-for="message in sortedMessages"
            :key="message.id"
            :message="message"
            :conversation-id="conversation?.id"
            @action="handleMessageAction"
          />
        </template>
      </slot>
    </div>

    <!-- Thread Footer -->
    <footer v-if="conversation" class="conversation-thread-footer">
      <slot name="footer" :conversation="conversation" />
    </footer>
  </div>
</template>

<style scoped>
.conversation-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 32px;
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 22px 60px rgba(35, 31, 32, 0.08);
  overflow: hidden;
}

.conversation-thread-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  background: transparent;
}

.conversation-thread-header-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.conversation-thread-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #000;
  line-height: 1.2;
}

.conversation-thread-type {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.conversation-thread-header-participants {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.conversation-thread-participant {
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.conversation-thread-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.conversation-thread-empty-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.conversation-thread-empty-text {
  margin: 0;
  font-size: 16px;
  color: #888;
}

.conversation-thread-footer {
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: transparent;
}
</style>
