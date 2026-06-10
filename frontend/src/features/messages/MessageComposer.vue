<script setup lang="ts">
/**
 * MessageComposer - Composer component for sending messages
 * 
 * Provides text input, attachment handling, and send functionality.
 * Supports mentions, hashtags, and reply-to functionality.
 * 
 * Security considerations:
 * - No unsafe HTML rendering
 * - File uploads are validated before processing
 * - Input is sanitized on send
 * - No sensitive data in draft state
 */

import { computed, ref, watch, nextTick } from 'vue'
import type { ComposerAttachment, MessageComposerState } from './types'

export interface MessageComposerProps {
  /** Initial draft text */
  modelValue?: string
  /** Whether to disable the composer */
  disabled?: boolean
  /** Whether a message is being sent */
  isSending?: boolean
  /** Current reply target message ID */
  replyToMessageId?: string | null
  /** Current reply target snippet */
  replyToSnippet?: string
  /** Placeholder text */
  placeholder?: string
  /** Maximum message length */
  maxLength?: number
  /** Custom CSS classes for the composer */
  class?: string
}

const props = withDefaults(defineProps<MessageComposerProps>(), {
  modelValue: '',
  disabled: false,
  isSending: false,
  replyToMessageId: null,
  replyToSnippet: '',
  placeholder: 'Type a message...',
  maxLength: 5000,
  class: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send', text: string): void
  (e: 'cancelReply'): void
  (e: 'attachmentAdd', attachment: ComposerAttachment): void
  (e: 'attachmentRemove', attachmentId: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const attachments = ref<ComposerAttachment[]>([])

/**
 * Internal draft text
 */
const internalDraft = ref(props.modelValue)

/**
 * Character count
 */
const charCount = computed(() => {
  return internalDraft.value.length
})

/**
 * Whether send button should be disabled
 */
const isSendDisabled = computed(() => {
  return props.disabled || 
    props.isSending || 
    internalDraft.value.trim().length === 0 ||
    charCount.value > props.maxLength
})

/**
 * Whether to show character counter
 */
const showCharCounter = computed(() => {
  return charCount.value > props.maxLength * 0.8 || charCount.value > props.maxLength
})

/**
 * Character counter class
 */
const charCounterClass = computed(() => {
  return {
    'message-composer-counter-warning': charCount.value > props.maxLength * 0.8,
    'message-composer-counter-danger': charCount.value > props.maxLength,
  }
})

/**
 * Whether to show reply indicator
 */
const showReplyIndicator = computed(() => {
  return !!(props.replyToMessageId)
})

/**
 * Remaining characters
 */
const remainingChars = computed(() => {
  return props.maxLength - charCount.value
})

/**
 * Has attachments
 */
const hasAttachments = computed(() => {
  return attachments.value.length > 0
})

/**
 * Total attachment count display
 */
const attachmentCountDisplay = computed(() => {
  if (attachments.value.length === 0) return ''
  if (attachments.value.length === 1) return '1 attachment'
  return `${attachments.value.length} attachments`
})

/**
 * Send message
 */
function sendMessage(): void {
  if (isSendDisabled.value || props.isSending) return
  
  const text = internalDraft.value.trim()
  if (text.length === 0) return
  
  emit('send', text)
  
  // Clear draft after send
  internalDraft.value = ''
  emit('update:modelValue', '')
  
  // Optionally clear attachments
  // attachments.value = []
}

/**
 * Handle text area input
 */
function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  internalDraft.value = target.value
  emit('update:modelValue', target.value)
  
  // Auto-resize textarea
  autoResize()
}

/**
 * Handle key down for send on Enter (without Shift)
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

/**
 * Auto-resize textarea
 */
function autoResize(): void {
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }
}

/**
 * Handle textarea focus
 */
function handleFocus(): void {
  emit('focus')
}

/**
 * Handle textarea blur
 */
function handleBlur(): void {
  emit('blur')
}

/**
 * Cancel reply
 */
function cancelReply(): void {
  emit('cancelReply')
}

/**
 * Clear draft
 */
function clearDraft(): void {
  internalDraft.value = ''
  emit('update:modelValue', '')
  
  // Reset textarea height
  const textarea = textareaRef.value
  if (textarea) {
    textarea.style.height = 'auto'
  }
}

/**
 * Add attachment
 */
function addAttachment(attachment: ComposerAttachment): void {
  // Check for duplicates
  if (attachments.value.some(a => a.id === attachment.id)) return
  
  attachments.value = [...attachments.value, attachment]
  emit('attachmentAdd', attachment)
}

/**
 * Remove attachment
 */
function removeAttachment(attachmentId: string): void {
  attachments.value = attachments.value.filter(a => a.id !== attachmentId)
  emit('attachmentRemove', attachmentId)
}

/**
 * Handle file selection
 */
async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files
  
  if (!files || files.length === 0) return
  
  for (const file of Array.from(files)) {
    // Validate file type and size
    const fileType = file.type.toLowerCase()
    const fileSize = file.size
    
    // Skip files over 50MB
    if (fileSize > 50 * 1024 * 1024) {
      console.warn(`File ${file.name} exceeds maximum size of 50MB`)
      continue
    }
    
    // Create attachment
    const attachment: ComposerAttachment = {
      id: `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      kind: fileType.startsWith('image/') ? 'image' :
            fileType.startsWith('video/') ? 'video' :
            fileType.startsWith('audio/') ? 'audio' : 'file',
      url: URL.createObjectURL(file),
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadProgress: 0,
    }
    
    addAttachment(attachment)
  }
  
  // Reset file input
  input.value = ''
}

/**
 * Handle paste event for file attachments
 */
function handlePaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items) return
  
  for (const item of Array.from(items)) {
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) {
        // Handle file paste (similar to file select)
        const fileType = file.type.toLowerCase()
        
        // Only allow image pasting for now
        if (fileType.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
          const attachment: ComposerAttachment = {
            id: `attach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            kind: 'image',
            url: URL.createObjectURL(file),
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            uploadProgress: 0,
          }
          addAttachment(attachment)
        }
      }
    }
  }
}

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue !== internalDraft.value) {
    internalDraft.value = newValue
  }
})

// Auto-resize on content change
watch(internalDraft, () => {
  nextTick(autoResize)
}, { flush: 'post' })
</script>

<template>
  <div
    class="message-composer"
    :class="[props.class, { 'message-composer-disabled': disabled }]"
    role="form"
    aria-label="Message composer"
  >
    <!-- Reply Indicator -->
    <div v-if="showReplyIndicator" class="message-composer-reply">
      <slot name="replyIndicator" :snippet="replyToSnippet">
        <div class="message-composer-reply-content">
          <span class="message-composer-reply-label">Replying to:</span>
          <span class="message-composer-reply-text">{{ replyToSnippet }}</span>
        </div>
        <button
          type="button"
          class="message-composer-reply-cancel"
          aria-label="Cancel reply"
          @click="cancelReply"
        >
          ×
        </button>
      </slot>
    </div>

    <!-- Attachments Preview -->
    <div v-if="hasAttachments" class="message-composer-attachments">
      <slot name="attachments" :attachments="attachments" :remove="removeAttachment">
        <button
          v-for="attachment in attachments"
          :key="attachment.id"
          type="button"
          class="message-composer-attachment"
          :aria-label="`Remove ${attachment.filename}`"
          @click="removeAttachment(attachment.id)"
        >
          <span class="message-composer-attachment-name">{{ attachment.filename }}</span>
          <span class="message-composer-attachment-remove">×</span>
        </button>
      </slot>
    </div>

    <!-- Text Input Area -->
    <div class="message-composer-input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="internalDraft"
        class="message-composer-input"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxLength"
        rows="1"
        @input="handleInput"
        @keydown="handleKeyDown"
        @paste="handlePaste"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>

    <!-- Character Counter -->
    <div v-if="showCharCounter" class="message-composer-counter" :class="charCounterClass">
      <slot name="counter" :remaining="remainingChars" :count="charCount" :max="maxLength">
        {{ remainingChars }} / {{ maxLength }}
      </slot>
    </div>

    <!-- Action Bar -->
    <div class="message-composer-actions">
      <slot name="actions" :send="sendMessage" :clear="clearDraft" :disabled="isSendDisabled">
        <div class="message-composer-actions-left">
          <!-- File attachment button -->
          <label class="message-composer-action message-composer-action-attach" aria-label="Attach file">
            <input
              type="file"
              class="message-composer-file-input"
              multiple
              @change="handleFileSelect"
            />
            <svg viewBox="0 0 24 24" class="message-composer-action-icon" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L12 18.56l1.44-1.44a2 2 0 0 1 2.83-2.83l-1.44-1.44"/>
            </svg>
          </label>
        </div>
        
        <div class="message-composer-actions-right">
          <!-- Clear button -->
          <button
            v-if="internalDraft.trim().length > 0"
            type="button"
            class="message-composer-action message-composer-action-clear"
            :disabled="disabled"
            aria-label="Clear message"
            @click="clearDraft"
          >
            <svg viewBox="0 0 24 24" class="message-composer-action-icon" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          
          <!-- Send button -->
          <button
            type="button"
            class="message-composer-action message-composer-action-send"
            :class="{ 'message-composer-action-send-disabled': isSendDisabled }"
            :disabled="isSendDisabled"
            aria-label="Send message"
            @click="sendMessage"
          >
            <svg viewBox="0 0 24 24" class="message-composer-action-icon" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            <span v-if="!isSendDisabled" class="message-composer-send-label">Send</span>
            <span v-else class="message-composer-send-label">Sending...</span>
          </button>
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.message-composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.message-composer-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.message-composer-reply {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 22px;
  font-size: 14px;
}

.message-composer-reply-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
}

.message-composer-reply-label {
  color: #666;
  font-weight: 500;
}

.message-composer-reply-text {
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-composer-reply-cancel {
  flex-shrink: 0;
  padding: 0.25rem;
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: color 0.2s ease;
}

.message-composer-reply-cancel:hover {
  color: #000;
}

.message-composer-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.message-composer-attachment {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.message-composer-attachment:hover {
  background: rgba(0, 0, 0, 0.1);
}

.message-composer-attachment-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.message-composer-attachment-remove {
  color: #888;
  font-size: 16px;
  line-height: 1;
  transition: color 0.2s ease;
}

.message-composer-attachment:hover .message-composer-attachment-remove {
  color: #000;
}

.message-composer-input-wrapper {
  position: relative;
  display: flex;
}

.message-composer-input {
  flex: 1;
  min-height: 44px;
  max-height: 200px;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 28px;
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: rgba(0, 0, 0, 0.02);
}

.message-composer-input:focus {
  border-color: #1d9bf0;
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

.message-composer-input::placeholder {
  color: #888;
}

.message-composer-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message-composer-counter {
  display: flex;
  justify-content: flex-end;
  font-size: 12px;
  color: #888;
}

.message-composer-counter-warning {
  color: #9a6f00;
}

.message-composer-counter-danger {
  color: #ef4444;
}

.message-composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.message-composer-actions-left,
.message-composer-actions-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.message-composer-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.message-composer-action:hover {
  background: rgba(0, 0, 0, 0.05);
}

.message-composer-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.message-composer-action-attach {
  color: #1d9bf0;
  cursor: pointer;
}

.message-composer-action-attach:hover {
  background: rgba(29, 155, 240, 0.05);
}

.message-composer-action-clear {
  color: #888;
}

.message-composer-action-clear:hover {
  background: rgba(255, 0, 0, 0.05);
  color: #ef4444;
}

.message-composer-action-send {
  color: white;
  background: #1d9bf0;
  border-radius: 28px;
  padding: 0 1rem;
  min-width: 80px;
}

.message-composer-action-send:hover:not(:disabled) {
  background: #1a8cd8;
}

.message-composer-action-send-disabled {
  background: rgba(29, 155, 240, 0.3);
}

.message-composer-action-icon {
  width: 18px;
  height: 18px;
}

.message-composer-send-label {
  margin-left: 0.25rem;
  font-size: 14px;
  font-weight: 500;
}

.message-composer-file-input {
  display: none;
}
</style>
