/**
 * useConversationAdapter - Adapter utilities to map backend store types to UI model types
 * 
 * Responsibilities:
 * - Convert conversationsStore types to Messages feature UI types
 * - Map ConversationPreview to ConversationSummary
 * - Map Message to MessageItem
 * - Map ConversationDetail to ConversationDetail (UI model)
 * - Handle direction determination (incoming vs outgoing)
 * - Sanitize and prepare data for display
 * 
 * Security considerations:
 * - No sensitive data exposed
 * - All IDs remain opaque strings
 * - Message body is treated as plaintext (safe rendering)
 * - No encryption details leak into UI model
 * - Preview text is properly truncated/sanitized
 */

import type {
  ConversationPreview,
  Message as StoreMessage,
  ConversationMember,
  ConversationDetail as StoreConversationDetail,
} from '@/stores/conversationsStore'
import type {
  ConversationSummary,
  MessageItem,
  MessageParticipant,
  MessageDirection,
  MessageDeliveryState,
  ConversationDetail as UIDetail,
} from './types'

const AVATAR_COLORS = [
  '#6f563d', '#9cb8bd', '#7c8793', '#6f5f41', '#96a2b0',
  '#a67c52', '#7a9399', '#6b7c85', '#8b6f47', '#7a8fa3',
]

function hashString(str: string): number {
  return str.split('').reduce((h, c) => h + c.charCodeAt(0), 0)
}

function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map(part => part.trim().charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function truncatePreview(text: string, maxLength = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

function getMessageDirection(senderDid: string, currentUserDid: string): MessageDirection {
  const normalizedSender = senderDid.trim().toLowerCase()
  const normalizedCurrent = currentUserDid.trim().toLowerCase()
  if (normalizedSender === normalizedCurrent) {
    return 'outgoing'
  }
  return 'incoming'
}

function mapDeliveryState(deleted?: boolean): MessageDeliveryState {
  if (deleted) return 'failed'
  return 'delivered'
}

export function mapMessageToMessageItem(message: StoreMessage, currentUserDid: string): MessageItem {
  return {
    id: message.id,
    conversationId: message.convoId,
    senderId: message.senderDid,
    body: message.text,
    createdAt: message.sentAt,
    deliveryState: mapDeliveryState(message.deleted),
    direction: getMessageDirection(message.senderDid, currentUserDid),
    attachments: mapAttachments(message.attachments),
    inReplyToMessageId: message.inReplyToMessageId,
  }
}

export function mapMemberToParticipant(member: ConversationMember | string): MessageParticipant {
  const userDid = typeof member === 'string' ? member : member.userDid
  return {
    id: userDid,
    displayName: formatMemberLabel(userDid),
    handle: undefined,
    avatarUrl: null,
  }
}

export function mapConversationPreviewToSummary(
  preview: ConversationPreview,
  currentUserDid: string
): ConversationSummary {
  const participants = preview.members.map(m => mapMemberToParticipant(m))
  const otherParticipants = participants.filter(p => p.id !== currentUserDid)
  const otherParticipant = otherParticipants[0]
  
  let title: string
  let subtitle: string | undefined
  let avatarInitials: string | undefined
  
  if (preview.type === 'direct' && otherParticipant) {
    title = otherParticipant.displayName
    subtitle = preview.preview
    avatarInitials = getInitials(otherParticipant.displayName)
  } else {
    title = preview.name
    subtitle = preview.otherUserName ? `With ${preview.otherUserName}` : preview.preview
    avatarInitials = getInitials(preview.name)
  }
  
  return {
    id: preview.id,
    title,
    subtitle,
    avatarUrl: null,
    avatarInitials,
    lastMessagePreview: truncatePreview(preview.preview),
    lastMessageAt: preview.lastActivity,
    unreadCount: preview.unreadCount,
    isMuted: false,
    isPinned: false,
    participants,
  }
}

export function mapConversationDetailToUI(
  detail: StoreConversationDetail,
  currentUserDid: string
): UIDetail {
  const messages = detail.messages.map(m => mapMessageToMessageItem(m, currentUserDid))
  const participants = detail.members.map(m => mapMemberToParticipant(m))
  
  return {
    id: detail.conversation.id,
    title: detail.conversation.name,
    type: detail.conversation.type,
    participants,
    messages,
    cursor: detail.cursor,
  }
}

export function mapAttachments(attachments: Array<Record<string, unknown>>): MessageAttachment[] {
  const AVATAR_COLORS = ['#6f563d', '#9cb8bd', '#7c8793']
  return attachments
    .filter((a): a is Record<string, unknown> => a && typeof a === 'object')
    .map((attachment, index) => {
      const url = typeof attachment.url === 'string' ? attachment.url : ''
      const mimeType = typeof attachment.mimeType === 'string' ? attachment.mimeType.toLowerCase() : ''
      const filename = typeof attachment.name === 'string' ? attachment.name : undefined
      const alt = typeof attachment.alt === 'string' ? attachment.alt : undefined
      const sizeBytes = typeof attachment.sizeBytes === 'number' ? attachment.sizeBytes : undefined
      
      let kind: 'image' | 'video' | 'audio' | 'file' = 'file'
      if (mimeType.startsWith('image/') || /\.(png|jpe?g|webp|avif|heic|bmp|svg|gif)(\?|#|$)/i.test(url)) {
        kind = 'image'
      } else if (mimeType.startsWith('video/') || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url)) {
        kind = 'video'
      } else if (mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(url)) {
        kind = 'audio'
      }
      
      return {
        id: typeof attachment.id === 'string' ? attachment.id : `attach-${index}`,
        kind,
        url,
        filename,
        mimeType,
        alt,
        sizeBytes,
      }
    })
}

export function formatMemberLabel(userDid: string): string {
  if (userDid.startsWith('http://') || userDid.startsWith('https://')) {
    try {
      const url = new URL(userDid)
      const lastPath = url.pathname.split('/').map(part => part.trim()).filter(Boolean).at(-1)
      if (lastPath && lastPath !== 'profile' && lastPath !== 'card') {
        return `${lastPath}@${url.hostname}`
      }
      return url.hostname
    } catch {
      return userDid
    }
  }
  if (userDid.startsWith('did:')) {
    const [, method, identifier] = userDid.split(':')
    if (method && identifier) return `${method}:${identifier.slice(0, 12)}`
  }
  return userDid.length > 24 ? `${userDid.slice(0, 24)}...` : userDid
}

export function useConversationAdapter(currentUserDid: string) {
  return {
    mapPreview: (preview: ConversationPreview) => mapConversationPreviewToSummary(preview, currentUserDid),
    mapDetail: (detail: StoreConversationDetail) => mapConversationDetailToUI(detail, currentUserDid),
    mapMessage: (message: StoreMessage) => mapMessageToMessageItem(message, currentUserDid),
    mapMember: mapMemberToParticipant,
  }
}
