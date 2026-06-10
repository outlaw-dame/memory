<script setup lang="ts">
/**
 * MessageBubble - Individual message bubble for the Messages feature
 * 
 * Displays a single message with sender info, content, attachments, and actions.
 * Supports both incoming and outgoing message styling.
 * 
 * Security considerations:
 * - No unsafe HTML rendering (uses text-based rendering)
 * - Message content is treated as user-generated (safe rendering)
 * - All IDs are opaque strings
 * - No sensitive data exposed
 * - Attachments are sanitized before display
 */

import { computed, ref } from 'vue'
import MessageAttachmentPreview from './MessageAttachmentPreview.vue'
import MessageActionSheet from './MessageActionSheet.vue'
import type { MessageItem, MessageAttachment } from './types'

export interface MessageBubbleProps {
  /** Message to display */
  message: MessageItem
  /** Conversation ID this message belongs to */
  conversationId?: string
  /** Whether to show sender information */
  showSender?: boolean
  /** Whether to show timestamp */
  showTimestamp?: boolean
  /** Whether to show message actions */
  showActions?: boolean
  /** Whether to group consecutive messages from same sender */
  groupWithPrevious?: boolean
  /** Custom CSS classes for the bubble */
  class?: string
}

const props = withDefaults(defineProps<MessageBubbleProps>(), {
  conversationId: '',
  showSender: true,
  showTimestamp: true,
  showActions: true,
  groupWithPrevious: false,
  class: '',
})

const emit = defineEmits<{
  (e: 'action', action: string, messageId: string): void
}>()

/**
 * Whether the message is outgoing (sent by current user)
 * Note: This is determined by direction property from the UI model
 */
const isOutgoing = computed(() => {
  return props.message.direction === 'outgoing'
})

/**
 * Whether the message is incoming
 */
const isIncoming = computed(() => {
  return props.message.direction === 'incoming'
})

/**
 * Sender display name (from participants or fallback)
 */
const senderDisplayName = computed(() => {
  // In a real implementation, we'd look up the participant
  // For now, use senderId as display name (will be formatted by parent)
  return props.message.senderId || 'Unknown'
})

/**
 * Formatted timestamp
 */
const formattedTimestamp = computed(() => {
  const date = new Date(props.message.createdAt)
  if (Number.isNaN(date.getTime())) return ''
  
  return date.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
})

/**
 * Message delivery state
 */
const deliveryState = computed(() => {
  return props.message.deliveryState
})

/**
 * Whether the message has attachments
 */
const hasAttachments = computed(() => {
  return props.message.attachments && props.message.attachments.length > 0
})

/**
 * Whether the message has media attachments (images, videos, etc.)
 */
const hasMediaAttachments = computed(() => {
  if (!props.message.attachments) return false
  return props.message.attachments.some(a => a.kind === 'image' || a.kind === 'video' || a.kind === 'audio')
})

/**
 * Whether the message has file attachments
 */
const hasFileAttachments = computed(() => {
  if (!props.message.attachments) return false
  return props.message.attachments.some(a => a.kind === 'file')
})

/**
 * Whether this is a reply message
 */
const isReply = computed(() => {
  return !!(props.message.inReplyToMessageId)
})

/**
 * Reply snippet (would normally be resolved from conversation context)
 */
const replySnippet = computed(() => {
  return 'Replied message'
})

/**
 * Show sender info (unless grouped with previous)
 */
const showSenderInfo = computed(() => {
  return props.showSender && !props.groupWithPrevious
})

/**
 * Action sheet visibility
 */
const showActionSheet = ref(false)

/**
 * Available actions for this message
 */
const availableActions = computed(() => {
  const actions = [
    { id: 'copy', label: 'Copy', type: 'copy' as const },
    { id: 'reply', label: 'Reply', type: 'reply' as const },
    { id: 'forward', label: 'Forward', type: 'forward' as const },
  ]
  
  // Only show delete for outgoing messages
  if (isOutgoing.value) {
    actions.push({ id: 'delete', label: 'Delete', type: 'delete' as const, destructive: true })
  }
  
  // Show retry for failed messages
  if (props.message.deliveryState === 'failed') {
    actions.push({ id: 'retry', label: 'Retry', type: 'retry' as const })
  }
  
  return actions
})

/**
 * Toggle action sheet
 */
function toggleActionSheet(event: MouseEvent): void {
  event.stopPropagation()
  showActionSheet.value = !showActionSheet.value
}

/**
 * Handle action from action sheet
 */
function handleAction(actionId: string): void {
  emit('action', actionId, props.message.id)
  showActionSheet.value = false
}

/**
 * Handle direct action (e.g., reply button)
 */
function handleDirectAction(action: string, event: MouseEvent): void {
  event.stopPropagation()
  emit('action', action, props.message.id)
}

/**
 * Format file size for display
 */
function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get attachment display name
 */
function getAttachmentDisplayName(attachment: MessageAttachment): string {
  return attachment.filename || attachment.url.split('/').pop() || `Attachment ${attachment.id.slice(0, 8)}`
}
</script>

<template>
  <article
    class="message-bubble"
    :class="[
      props.class,
      { 'message-bubble-outgoing': isOutgoing,
        'message-bubble-incoming': isIncoming,
        'message-bubble-grouped': groupWithPrevious,
        'message-bubble-reply': isReply }
    ]"
    role="article"
    :aria-label="`Message from ${senderDisplayName} at ${formattedTimestamp}`"
  >
    <!-- Sender Info -->
    <div v-if="showSenderInfo" class="message-bubble-sender">
      <slot name="sender" :sender="senderDisplayName" :timestamp="formattedTimestamp">
        <span class="message-bubble-sender-name">{{ senderDisplayName }}</span>
        <span v-if="showTimestamp && formattedTimestamp" class="message-bubble-sender-time">{{ formattedTimestamp }}</span>
      </slot>
    </div>

    <!-- Bubble Content Container -->
    <div class="message-bubble-content">
      <!-- Reply Indicator -->
      <div v-if="isReply" class="message-bubble-reply-indicator">
        <slot name="replyIndicator">
          <span class="message-bubble-reply-text">Replying to: {{ replySnippet }}</span>
        </slot>
      </div>

      <!-- Message Body -->
      <div class="message-bubble-body">
        <slot name="body" :text="message.body">
          <p class="message-bubble-text">{{ message.body || '(No content)' }}</p>
        </slot>
      </div>

      <!-- Delivery State -->
      <div v-if="!isIncoming && deliveryState !== 'delivered'" class="message-bubble-status">
        <slot name="status" :state="deliveryState">
          <span v-if="deliveryState === 'sending'" class="message-bubble-status-sending">Sending...</span>
          <span v-else-if="deliveryState === 'failed'" class="message-bubble-status-failed">Failed to send</span>
        </slot>
      </div>

      <!-- Attachments -->
      <div v-if="hasAttachments" class="message-bubble-attachments">
        <slot name="attachments" :attachments="message.attachments">
          <!-- Media Attachments (Images, Videos) -->
          <div v-if="hasMediaAttachments" class="message-bubble-media-attachments">
            <MessageAttachmentPreview
              v-for="attachment in message.attachments"
              :key="attachment.id"
              :attachment="attachment"
              :message-id="message.id"
              @action="(action) => handleDirectAction(action, $event)"
            />
          </div>

          <!-- File Attachments -->
          <div v-if="hasFileAttachments" class="message-bubble-file-attachments">
            <button
              v-for="attachment in message.attachments.filter(a => a.kind === 'file')"
              :key="attachment.id"
              type="button"
              class="message-bubble-file-attachment"
              :aria-label="`View ${getAttachmentDisplayName(attachment)}`"
              @click="handleDirectAction('viewAttachment', $event)"
            >
              <svg viewBox="0 0 24 24" class="message-bubble-file-icon" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L12 18.56l1.44-1.44a2 2 0 0 1 2.83-2.83l-1.44-1.44"/>
              </svg>
              <span class="message-bubble-file-name">{{ getAttachmentDisplayName(attachment) }}</span>
              <span v-if="attachment.sizeBytes" class="message-bubble-file-size">
                {{ formatFileSize(attachment.sizeBytes) }}
              </span>
            </button>
          </div>
        </slot>
      </div>
    </div>

    <!-- Action Button (for mobile/long-press) -->
    <div v-if="showActions" class="message-bubble-actions">
      <slot name="actions">
        <button
          type="button"
          class="message-bubble-action-button"
          :aria-label="`Message actions for message from ${senderDisplayName}`"
          @click="toggleActionSheet"
        >
          <svg viewBox="0 0 24 24" class="message-bubble-action-icon" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </slot>
    </div>

    <!-- Action Sheet (for message actions) -->
    <MessageActionSheet
      v-if="showActions && showActionSheet"
      :message-id="message.id"
      :actions="availableActions"
      @close="showActionSheet = false"
      @action="handleAction"
    />
  </article>
</template>

<style scoped>
.message-bubble {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 80%;
  min-width: 200px;
  animation: fadeIn 0.2s ease-out;
}

.message-bubble-outgoing {
  align-self: flex-end;
}

.message-bubble-incoming {
  align-self: flex-start;
}

.message-bubble-grouped .message-bubble-sender {
  display: none;
}

.message-bubble-sender {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.message-bubble-sender-name {
  font-size: 13px;
  font-weight: 600;
  color: #000;
}

.message-bubble-sender-time {
  font-size: 12px;
  color: #888;
}

.message-bubble-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-bubble-outgoing .message-bubble-content {
  background-color: #1a1a1a;
  color: white;
  border-radius: 24px 24px 0 24px;
  padding: 0.875rem 1rem;
}

.message-bubble-incoming .message-bubble-content {
  background-color: white;
  color: #000;
  border-radius: 24px 24px 24px 0;
  padding: 0.875rem 1rem;
  box-shadow: 0 10px 24px rgba(35, 31, 32, 0.05);
}

.message-bubble-grouped .message-bubble-content {
  border-radius: 24px;
}

.message-bubble-reply-indicator {
  font-size: 12px;
  padding: 0.5rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 16px;
}

.message-bubble-outgoing .message-bubble-reply-indicator {
  background-color: rgba(255, 255, 255, 0.1);
}

.message-bubble-reply-text {
  color: #666;
}

.message-bubble-outgoing .message-bubble-reply-text {
  color: rgba(255, 255, 255, 0.8);
}

.message-bubble-body {
}

.message-bubble-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-bubble-status {
  display: flex;
  justify-content: flex-end;
}

.message-bubble-status-sending,
.message-bubble-status-failed {
  font-size: 12px;
  font-style: italic;
}

.message-bubble-status-sending {
  color: #1d9bf0;
}

.message-bubble-status-failed {
  color: #ef4444;
}

.message-bubble-attachments {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.message-bubble-media-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.message-bubble-file-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.message-bubble-file-attachment {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.message-bubble-outgoing .message-bubble-file-attachment {
  background-color: rgba(255, 255, 255, 0.1);
}

.message-bubble-file-attachment:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.message-bubble-outgoing .message-bubble-file-attachment:hover {
  background-color: rgba(255, 255, 255, 0.15);
}

.message-bubble-file-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.message-bubble-file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.message-bubble-file-size {
  font-size: 11px;
  color: #888;
}

.message-bubble-outgoing .message-bubble-file-size {
  color: rgba(255, 255, 255, 0.6);
}

.message-bubble-actions {
  display: flex;
  align-items: center;
}

.message-bubble-action-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-bubble-action-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.message-bubble-outgoing .message-bubble-action-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.message-bubble-action-icon {
  width: 16px;
  height: 16px;
  opacity: 0.6;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
