/**
 * Messages Feature Index
 * 
 * Exports all public components, types and utilities for the Messages feature.
 */

// Types
export type {
  MessageParticipant,
  MessageAttachment,
  MessageAttachmentKind,
  MessageItem,
  MessageDeliveryState,
  MessageDirection,
  ConversationSummary,
  ConversationDetail,
  ComposerAttachment,
  MessageActionType,
  MessageAction,
  MessageComposerState,
  MessagesUIState,
  MessagesErrorState,
  MessageSendEvent,
  MessageReceivedEvent,
  MessagesDemoConfig,
} from './types'

// Demo data (development only)
export {
  messagesDemoConfig,
  getDemoConversations,
  getDemoMessages,
  getDemoConversation,
} from './messagesDemoData'

// Adapter utilities
export {
  mapMessageToMessageItem,
  mapMemberToParticipant,
  mapConversationPreviewToSummary,
  mapConversationDetailToUI,
  mapAttachments,
  formatMemberLabel,
  useConversationAdapter,
} from './useConversationAdapter'

// Components
export { default as ConversationList, type ConversationListProps } from './ConversationList.vue'
export { default as ConversationListItem, type ConversationListItemProps } from './ConversationListItem.vue'
export { default as ConversationThread, type ConversationThreadProps } from './ConversationThread.vue'
export { default as MessageBubble, type MessageBubbleProps } from './MessageBubble.vue'
export { default as MessageComposer, type MessageComposerProps } from './MessageComposer.vue'
export { default as MessageActionSheet, type MessageActionSheetProps } from './MessageActionSheet.vue'
export { default as MessageAttachmentPreview, type MessageAttachmentPreviewProps } from './MessageAttachmentPreview.vue'

// State components
export { default as MessageEmptyState, type MessageEmptyStateProps } from './MessageEmptyState.vue'
export { default as MessageLoadingState, type MessageLoadingStateProps } from './MessageLoadingState.vue'
export { default as MessageErrorState, type MessageErrorStateProps } from './MessageErrorState.vue'

// Composables
export { useMessageComposer, type UseMessageComposerOptions, type UseMessageComposerReturn } from './useMessageComposer'
export { useMessageActions, type UseMessageActionsOptions, type UseMessageActionsReturn } from './useMessageActions'
export { useConversationSelection, type UseConversationSelectionOptions, type UseConversationSelectionReturn, type ConversationResolver } from './useConversationSelection'
