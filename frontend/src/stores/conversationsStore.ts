/**
 * Conversations Store — Frontend Pinia store for DM/group messages
 *
 * Manages conversation state and messaging.
 *
 * State:
 *   - conversations: List of DM/group conversations
 *   - currentConversation: Currently open conversation with messages
 *   - isLoading: Fetch state
 *   - error: Error messages
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { t } from '@/i18n'
import { useAuthStore } from './authStore'

export interface ConversationPreview {
  id: string
  type: 'direct' | 'group'
  name: string
  preview: string
  lastActivity: string | null
  unreadCount: number
  otherUserName?: string
  otherUserWebId?: string
  members: string[]
}

export interface ConversationMember {
  userDid: string
  role: 'admin' | 'member'
}

export interface Message {
  id: string
  convoId: string
  senderDid: string
  text: string
  mentions: string[]
  hashtags: string[]
  attachments: Array<Record<string, unknown>>
  inReplyToMessageId: string | null
  quoteMessageId: string | null
  sentAt: string
  rev: string
  deleted?: boolean
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name: string
  createdAt: string | null
  updatedAt: string | null
  rev: string
}

export interface ConversationDetail {
  conversation: Conversation
  members: ConversationMember[]
  messages: Message[]
  cursor?: string
}

interface ListConversationsResponse {
  convos: Array<{
    id: string
    convoType: 'direct' | 'group'
    name: string | null
    rev: string
    createdAt: string | null
    updatedAt: string | null
  }>
  cursor?: string
}

interface GetConversationResponse {
  id: string
  convoType: 'direct' | 'group'
  name: string | null
  rev: string
  createdAt: string | null
  updatedAt: string | null
  members: ConversationMember[]
}

interface GetMessagesResponse {
  messages: Message[]
  cursor?: string
}

interface SendMessageInput {
  text: string
  mentions?: string[]
  hashtags?: string[]
  attachments?: Array<Record<string, unknown>>
  inReplyToMessageId?: string | null
  quoteMessageId?: string | null
}

function parseMemberLabel(userDid: string): string {
  if (userDid.startsWith('http://') || userDid.startsWith('https://')) {
    try {
      const url = new URL(userDid)
      const lastPath = url.pathname
        .split('/')
        .map(part => part.trim())
        .filter(Boolean)
        .at(-1)
      if (lastPath && lastPath !== 'card' && lastPath !== 'profile') {
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

  return userDid.length > 24 ? `${userDid.slice(0, 24)}…` : userDid
}

function formatConversationName(
  convo: { convoType: 'direct' | 'group'; name: string | null },
  members: ConversationMember[],
  callerDid: string,
): { name: string; otherUserName?: string; otherUserWebId?: string } {
  const otherMembers = members.filter(member => member.userDid !== callerDid)

  if (convo.convoType === 'direct') {
    const other = otherMembers[0]
    if (!other) return { name: convo.name ?? 'Direct message' }
    const label = parseMemberLabel(other.userDid)
    return {
      name: label,
      otherUserName: label,
      otherUserWebId: other.userDid,
    }
  }

  if (convo.name?.trim()) {
    return { name: convo.name.trim() }
  }

  const labels = otherMembers.slice(0, 3).map(member => parseMemberLabel(member.userDid))
  const suffix = otherMembers.length > 3 ? ` +${otherMembers.length - 3}` : ''
  return { name: labels.length > 0 ? `${labels.join(', ')}${suffix}` : 'Group chat' }
}

function sortMessagesAscending(messages: Message[]): Message[] {
  return [...messages].sort((left, right) => new Date(left.sentAt).getTime() - new Date(right.sentAt).getTime())
}

export const useConversationsStore = defineStore('conversations', () => {
  const authStore = useAuthStore()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const conversations = ref<ConversationPreview[]>([])
  const currentConversation = ref<ConversationDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // -------------------------------------------------------------------------
  // API helpers
  // -------------------------------------------------------------------------

  function getApiBase(): string {
    return getApiBaseUrl()
  }

  function getHeaders(headers?: HeadersInit): HeadersInit {
    return buildApiHeaders({
      authToken: authStore.token || undefined,
      includeJsonContentType: true,
      headers
    })
  }

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: getHeaders(options?.headers),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      throw new Error(`API error ${response.status}: ${text}`)
    }

    return response.json() as Promise<T>
  }

  function getCallerDid(): string {
    const user = authStore.user as Record<string, unknown> | undefined
    const atprotoDid = typeof user?.atprotoDid === 'string' ? user.atprotoDid : ''
    const webId = typeof user?.webId === 'string' ? user.webId : ''
    return atprotoDid || webId
  }

  async function hydrateConversationPreview(convo: ListConversationsResponse['convos'][number]): Promise<ConversationPreview> {
    const [detail, messages] = await Promise.all([
      apiFetch<GetConversationResponse>(`/chat/getConvo?convoId=${encodeURIComponent(convo.id)}`),
      apiFetch<GetMessagesResponse>(`/chat/getMessages?convoId=${encodeURIComponent(convo.id)}&limit=1`),
    ])

    const callerDid = getCallerDid()
    const naming = formatConversationName(detail, detail.members, callerDid)
    const latestMessage = messages.messages[0] ?? null

    return {
      id: convo.id,
      type: convo.convoType,
      name: naming.name,
      preview: latestMessage?.deleted ? t('messages.deletedPreview') : (latestMessage?.text ?? ''),
      lastActivity: latestMessage?.sentAt ?? convo.updatedAt,
      unreadCount: 0,
      otherUserName: naming.otherUserName,
      otherUserWebId: naming.otherUserWebId,
      members: detail.members.map(member => member.userDid),
    }
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /**
   * Fetch all conversations for the current user
   */
  async function fetchConversations(): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const data = await apiFetch<ListConversationsResponse>('/chat/listConvos')
      conversations.value = await Promise.all(data.convos.map(convo => hydrateConversationPreview(convo)))
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('conversations.errors.fetchList')
      console.error('[ConversationsStore] fetchConversations error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a specific conversation with all messages
   */
  async function fetchConversation(id: string): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const [detail, messageData] = await Promise.all([
        apiFetch<GetConversationResponse>(`/chat/getConvo?convoId=${encodeURIComponent(id)}`),
        apiFetch<GetMessagesResponse>(`/chat/getMessages?convoId=${encodeURIComponent(id)}`),
      ])
      const callerDid = getCallerDid()
      const naming = formatConversationName(detail, detail.members, callerDid)
      currentConversation.value = {
        conversation: {
          id: detail.id,
          type: detail.convoType,
          name: naming.name,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
          rev: detail.rev,
        },
        members: detail.members,
        messages: sortMessagesAscending(messageData.messages),
        cursor: messageData.cursor,
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('conversations.errors.fetch')
      console.error('[ConversationsStore] fetchConversation error:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Send a message in the current conversation
   */
  async function sendMessage(conversationId: string, input: SendMessageInput): Promise<void> {
    if (!input.text.trim()) return

    try {
      const data = await apiFetch<{ message: Message }>(`/chat/sendMessage`, {
        method: 'POST',
        body: JSON.stringify({
          convoId: conversationId,
          text: input.text,
          ...(input.mentions && input.mentions.length > 0 ? { mentions: input.mentions } : {}),
          ...(input.hashtags && input.hashtags.length > 0 ? { hashtags: input.hashtags } : {}),
          ...(input.attachments && input.attachments.length > 0 ? { attachments: input.attachments } : {}),
          ...(input.inReplyToMessageId ? { inReplyToMessageId: input.inReplyToMessageId } : {}),
          ...(input.quoteMessageId ? { quoteMessageId: input.quoteMessageId } : {}),
        }),
      })

      if (currentConversation.value?.conversation.id === conversationId) {
        currentConversation.value.messages.push(data.message)
        currentConversation.value.messages = sortMessagesAscending(currentConversation.value.messages)
      }

      // Refresh conversation list to update timestamps
      await fetchConversations()
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('conversations.errors.send')
      console.error('[ConversationsStore] sendMessage error:', err)
    }
  }

  /**
   * Create a new conversation
   */
  async function createConversation(
    type: 'direct' | 'group',
    memberIds: string[],
    name?: string
  ): Promise<string | null> {
    try {
      const data = type === 'direct'
        ? await apiFetch<{ id: string } | { error: string }>(
            '/chat/getConvoForMembers',
            {
              method: 'POST',
              body: JSON.stringify({ members: memberIds }),
            }
          )
        : await apiFetch<{ id: string } | { error: string }>(
            '/chat/createGroup',
            {
              method: 'POST',
              body: JSON.stringify({ members: memberIds, name }),
            }
          )

      await fetchConversations()
      return 'id' in data ? data.id : null
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('conversations.errors.create')
      console.error('[ConversationsStore] createConversation error:', err)
      return null
    }
  }

  async function memberAutocomplete(conversationId: string, query: string, limit = 8): Promise<string[]> {
    if (!query.trim()) return []

    try {
      const data = await apiFetch<{ suggestions: string[] }>(
        `/chat/memberAutocomplete?convoId=${encodeURIComponent(conversationId)}&q=${encodeURIComponent(query)}&limit=${limit}`
      )
      return Array.isArray(data.suggestions) ? data.suggestions : []
    } catch (err) {
      console.error('[ConversationsStore] memberAutocomplete error:', err)
      return []
    }
  }

  /**
   * Reset store state (e.g., on logout)
   */
  function reset(): void {
    conversations.value = []
    currentConversation.value = null
    error.value = null
  }

  return {
    // State
    conversations,
    currentConversation,
    isLoading,
    error,

    // Actions
    fetchConversations,
    fetchConversation,
    sendMessage,
    createConversation,
    memberAutocomplete,
    reset,
  }
})
