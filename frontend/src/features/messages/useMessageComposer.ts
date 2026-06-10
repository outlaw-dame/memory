/**
 * useMessageComposer - Composable for managing message composer state
 * 
 * Provides reactive state for text input, attachments, and send functionality.
 * Handles validation, mentions, and attachment management.
 * 
 * Security considerations:
 * - No sensitive data in state
 * - Input validation before send
 * - Attachment URLs are validated
 * - No automatic uploads without user intent
 */

import { computed, ref, watch } from 'vue'
import type { ComposerAttachment, MessageComposerState, MessageSendEvent } from './types'

export interface UseMessageComposerOptions {
  /** Maximum message length */
  maxLength?: number
  /** Maximum attachments */
  maxAttachments?: number
  /** Maximum attachment size in bytes */
  maxAttachmentSize?: number
  /** Allowed MIME types for attachments */
  allowedMimeTypes?: string[]
}

export interface UseMessageComposerReturn {
  /** Composer state */
  state: MessageComposerState
  /** Draft text */
  draftText: string
  /** Attachments */
  attachments: ComposerAttachment[]
  /** Reply to message ID */
  replyToMessageId: string | null
  /** Whether can send */
  canSend: boolean
  /** Whether is sending */
  isSending: boolean
  /** Character count */
  charCount: number
  /** Remaining characters */
  remainingChars: number
  /** Whether has attachments */
  hasAttachments: boolean
  /** Error message if any */
  error: string | undefined
  
  /** Set reply target */
  setReplyTarget: (messageId: string | null) => void
  /** Update draft text */
  setDraftText: (text: string) => void
  /** Add attachment */
  addAttachment: (attachment: ComposerAttachment) => Promise<boolean>
  /** Remove attachment */
  removeAttachment: (attachmentId: string) => void
  /** Clear composer */
  clear: () => void
  /** Send message */
  send: (options?: { force?: boolean }) => Promise<MessageSendEvent | null>
  /** Reset state */
  reset: () => void
}

const DEFAULT_MAX_LENGTH = 5000
const DEFAULT_MAX_ATTACHMENTS = 10
const DEFAULT_MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * Default allowed MIME types
 */
const DEFAULT_ALLOWED_MIME_TYPES = [
  // Images
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/svg+xml',
  // Videos
  'video/mp4', 'video/mov', 'video/webm', 'video/quicktime',
  // Audio
  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac',
  // Documents
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
]

/**
 * Validate attachment against constraints
 */
function validateAttachment(
  attachment: ComposerAttachment,
  currentAttachments: ComposerAttachment[],
  options: UseMessageComposerOptions
): { valid: boolean; error?: string } {
  // Check maximum attachments
  if (currentAttachments.length >= (options.maxAttachments ?? DEFAULT_MAX_ATTACHMENTS)) {
    return { valid: false, error: `Maximum ${options.maxAttachments ?? DEFAULT_MAX_ATTACHMENTS} attachments allowed` }
  }
  
  // Check attachment size
  if (attachment.sizeBytes && attachment.sizeBytes > (options.maxAttachmentSize ?? DEFAULT_MAX_ATTACHMENT_SIZE)) {
    return { valid: false, error: `Attachment exceeds maximum size of ${options.maxAttachmentSize ? options.maxAttachmentSize / (1024 * 1024) : 50}MB` }
  }
  
  // Check MIME type
  const allowedTypes = options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES
  if (attachment.mimeType && !allowedTypes.includes(attachment.mimeType.toLowerCase())) {
    // Check if it's a known type by extension
    const url = attachment.url || ''
    const hasValidExtension = /\.(png|jpe?g|webp|avif|heic|bmp|svg|gif|mp4|mov|webm|m4v|mp3|wav|ogg|m4a|aac|pdf|docx?|xlsx?|pptx?|txt|csv)(\?|#|$)/i.test(url)
    if (!hasValidExtension) {
      return { valid: false, error: `File type not allowed: ${attachment.mimeType || 'unknown'}` }
    }
  }
  
  // Check for duplicate ID
  if (currentAttachments.some(a => a.id === attachment.id)) {
    return { valid: false, error: 'Duplicate attachment' }
  }
  
  return { valid: true }
}

/**
 * Main composable function
 */
export function useMessageComposer(options: UseMessageComposerOptions = {}): UseMessageComposerReturn {
  const draftText = ref('')
  const attachments = ref<ComposerAttachment[]>([])
  const replyToMessageId = ref<string | null>(null)
  const isSending = ref(false)
  const error = ref<string | undefined>(undefined)
  
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH
  
  const charCount = computed(() => draftText.value.length)
  const remainingChars = computed(() => maxLength - charCount.value)
  const hasAttachments = computed(() => attachments.value.length > 0)
  
  const canSend = computed(() => {
    return !isSending.value && 
      draftText.value.trim().length > 0 &&
      charCount.value <= maxLength &&
      error.value === undefined
  })
  
  const state = computed<MessageComposerState>(() => ({
    draftText: draftText.value,
    attachments: attachments.value,
    canSend: canSend.value,
    isSending: isSending.value,
    error: error.value,
  }))
  
  /**
   * Set reply target
   */
  function setReplyTarget(messageId: string | null): void {
    replyToMessageId.value = messageId
  }
  
  /**
   * Update draft text
   */
  function setDraftText(text: string): void {
    if (text.length > maxLength) {
      draftText.value = text.slice(0, maxLength)
    } else {
      draftText.value = text
    }
  }
  
  /**
   * Add attachment with validation
   */
  async function addAttachment(attachment: ComposerAttachment): Promise<boolean> {
    const validation = validateAttachment(attachment, attachments.value, options)
    if (!validation.valid) {
      error.value = validation.error
      return false
    }
    
    // Clear any previous error
    error.value = undefined
    
    // Add the attachment
    attachments.value = [...attachments.value, attachment]
    return true
  }
  
  /**
   * Remove attachment
   */
  function removeAttachment(attachmentId: string): void {
    attachments.value = attachments.value.filter(a => a.id !== attachmentId)
  }
  
  /**
   * Clear composer
   */
  function clear(): void {
    draftText.value = ''
    attachments.value = []
    replyToMessageId.value = null
    error.value = undefined
  }
  
  /**
   * Send message
   */
  async function send(optionsParam?: { force?: boolean }): Promise<MessageSendEvent | null> {
    const force = optionsParam?.force ?? false
    
    // Check if we can send
    if (!canSend.value && !force) {
      return null
    }
    
    // Don't allow sending if disabled
    if (draftText.value.trim().length === 0) {
      error.value = 'Message cannot be empty'
      return null
    }
    
    isSending.value = true
    
    try {
      const event: MessageSendEvent = {
        text: draftText.value.trim(),
        attachments: [...attachments.value],
        inReplyToMessageId: replyToMessageId.value,
      }
      
      // Clear state after successful send
      clear()
      
      return event
    } finally {
      isSending.value = false
    }
  }
  
  /**
   * Reset state
   */
  function reset(): void {
    draftText.value = ''
    attachments.value = []
    replyToMessageId.value = null
    isSending.value = false
    error.value = undefined
  }
  
  return {
    state,
    draftText,
    attachments,
    replyToMessageId,
    canSend,
    isSending,
    charCount,
    remainingChars,
    hasAttachments,
    error,
    setReplyTarget,
    setDraftText,
    addAttachment,
    removeAttachment,
    clear,
    send,
    reset,
  }
}

export default useMessageComposer
