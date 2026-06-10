/**
 * Messages Feature Types
 * 
 * UI model types for the Messages/Conversation system.
 * These are separate from backend contracts and are optimized for display.
 * 
 * Security considerations:
 * - No encryption implementation details leak into these types
 * - Message body treated as user content (must be rendered safely)
 * - All IDs are opaque strings
 * - No raw encrypted payloads exposed
 */

// ============================================================================
// Participant Types
// ============================================================================

export interface MessageParticipant {
  id: string
  displayName: string
  handle?: string
  avatarUrl?: string | null
}

// ============================================================================
// Attachment Types
// ============================================================================

export type MessageAttachmentKind = 'image' | 'video' | 'audio' | 'file'

export interface MessageAttachment {
  id: string
  kind: MessageAttachmentKind
  url: string
  filename?: string
  mimeType?: string
  alt?: string
  sizeBytes?: number
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageDeliveryState = 'sending' | 'sent' | 'delivered' | 'failed'
export type MessageDirection = 'incoming' | 'outgoing'

export interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  deliveryState: MessageDeliveryState
  direction: MessageDirection
  attachments?: MessageAttachment[]
  inReplyToMessageId?: string | null
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationSummary {
  id: string
  title: string
  subtitle?: string
  avatarUrl?: string | null
  avatarInitials?: string
  lastMessagePreview?: string
  lastMessageAt?: string | null
  unreadCount: number
  isMuted?: boolean
  isPinned?: boolean
  participants: MessageParticipant[]
}

// ============================================================================
// Thread/Conversation Detail Types
// ============================================================================

export interface ConversationDetail {
  id: string
  title: string
  type: 'direct' | 'group'
  participants: MessageParticipant[]
  messages: MessageItem[]
  cursor?: string
}

// ============================================================================
// Composer Types
// ============================================================================

export interface ComposerAttachment {
  id: string
  kind: MessageAttachmentKind
  url: string
  filename?: string
  mimeType?: string
  sizeBytes?: number
  uploadProgress?: number
  uploadError?: string
}

// ============================================================================
// Action Types
// ============================================================================

export type MessageActionType =
  | 'copy'
  | 'reply'
  | 'forward'
  | 'delete'
  | 'report'
  | 'mute'
  | 'block'
  | 'retry'
  | 'viewAttachment'
  | 'saveAttachment'

export interface MessageAction {
  id: string
  label: string
  type: MessageActionType
  destructive?: boolean
  disabled?: boolean
  requiresConfirmation?: boolean
  action: () => void | Promise<void>
}

// ============================================================================
// State Types for Composer
// ============================================================================

export interface MessageComposerState {
  draftText: string
  attachments: ComposerAttachment[]
  canSend: boolean
  isSending: boolean
  error?: string
}

// ============================================================================
// UI State Types
// ============================================================================

export type MessagesUIState = 'loading' | 'error' | 'empty' | 'ready'

export interface MessagesErrorState {
  type: 'network' | 'permission' | 'notFound' | 'unknown'
  message: string
  recoverable: boolean
  recoveryAction?: () => void | Promise<void>
}

// ============================================================================
// Event Types
// ============================================================================

export interface MessageSendEvent {
  text: string
  attachments: ComposerAttachment[]
  inReplyToMessageId?: string
}

export interface MessageReceivedEvent {
  message: MessageItem
  conversationId: string
}

// ============================================================================
// Demo Data Types (for development only)
// ============================================================================

/**
 * Demo data for development/testing
 * Isolated from production code paths
 * Used only when explicit feature flag is enabled
 */
export interface MessagesDemoConfig {
  enabled: boolean
  mockConversations: ConversationSummary[]
  mockMessages: Record<string, MessageItem[]>
}
