/**
 * Messages Demo Data
 * 
 * Development-only mock data for the Messages feature.
 * This file is ONLY used when demo mode is explicitly enabled.
 * It must NEVER be used in production builds.
 * 
 * Security considerations:
 * - Clearly isolated from production code paths
 * - Feature-flagged to prevent accidental use in production
 * - No real user data or sensitive information
 * - All IDs are synthetic and non-real
 */

import type {
  ConversationSummary,
  MessageItem,
  MessageParticipant,
  MessageAttachment,
} from './types'

const demoParticipants: MessageParticipant[] = [
  {
    id: 'demo-user-1',
    displayName: 'Alice Johnson',
    handle: 'alice',
    avatarUrl: null,
  },
  {
    id: 'demo-user-2',
    displayName: 'Bob Smith',
    handle: 'bob',
    avatarUrl: null,
  },
]

const demoAttachments: MessageAttachment[] = [
  {
    id: 'demo-attach-1',
    kind: 'image',
    url: 'https://example.com/demo-image-1.jpg',
    filename: 'vacation.jpg',
    mimeType: 'image/jpeg',
    alt: 'Vacation photo',
    sizeBytes: 2048000,
  },
]

const demoMessages: MessageItem[] = [
  {
    id: 'demo-msg-1',
    conversationId: 'demo-convo-1',
    senderId: 'demo-user-2',
    body: 'Hey there! How are you doing today?',
    createdAt: '2024-01-15T10:30:00Z',
    deliveryState: 'delivered',
    direction: 'incoming',
  },
  {
    id: 'demo-msg-2',
    conversationId: 'demo-convo-1',
    senderId: 'demo-user-1',
    body: 'I am doing great! Just working on some exciting projects.',
    createdAt: '2024-01-15T11:15:00Z',
    deliveryState: 'delivered',
    direction: 'outgoing',
  },
]

const demoConversations: ConversationSummary[] = [
  {
    id: 'demo-convo-1',
    title: 'Alice Johnson',
    subtitle: 'Project Discussion',
    avatarUrl: null,
    avatarInitials: 'AJ',
    lastMessagePreview: 'I am doing great! Just working on some exciting projects.',
    lastMessageAt: '2024-01-15T11:15:00Z',
    unreadCount: 1,
    isMuted: false,
    isPinned: true,
    participants: demoParticipants,
  },
]

export const messagesDemoConfig = {
  enabled: false,
  mockConversations: demoConversations,
  mockMessages: {
    'demo-convo-1': demoMessages,
  },
}

export function getDemoConversations(): ConversationSummary[] {
  if (!messagesDemoConfig.enabled) {
    throw new Error('Demo mode is not enabled. Cannot access demo data.')
  }
  return [...messagesDemoConfig.mockConversations]
}

export function getDemoMessages(conversationId: string): MessageItem[] {
  if (!messagesDemoConfig.enabled) {
    throw new Error('Demo mode is not enabled. Cannot access demo data.')
  }
  return [...(messagesDemoConfig.mockMessages[conversationId] ?? [])]
}

export function getDemoConversation(conversationId: string): ConversationSummary | null {
  if (!messagesDemoConfig.enabled) {
    throw new Error('Demo mode is not enabled. Cannot access demo data.')
  }
  return messagesDemoConfig.mockConversations.find(c => c.id === conversationId) ?? null
}
