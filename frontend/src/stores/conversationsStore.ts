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
  id: number
  type: 'dm' | 'group'
  name: string
  preview: string
  lastActivity: string | null
  unreadCount: number
  otherUserName?: string
  otherUserWebId?: string
}

export interface Message {
  id: number
  senderId: number
  senderName: string
  content: string
  createdAt: string | null
}

export interface Conversation {
  id: number
  type: 'dm' | 'group'
  name: string
  createdAt: string | null
  updatedAt: string | null
}

export interface ConversationDetail {
  conversation: Conversation
  messages: Message[]
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
      const data = await apiFetch<ConversationPreview[]>('/conversations')
      conversations.value = data
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
  async function fetchConversation(id: number): Promise<void> {
    if (isLoading.value) return

    isLoading.value = true
    error.value = null

    try {
      const data = await apiFetch<ConversationDetail>(`/conversations/${id}`)
      currentConversation.value = data
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
  async function sendMessage(conversationId: number, content: string): Promise<void> {
    if (!content.trim()) return

    try {
      const data = await apiFetch<Message>(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })

      if (currentConversation.value?.conversation.id === conversationId) {
        currentConversation.value.messages.push(data)
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
    type: 'dm' | 'group',
    memberIds: number[],
    name?: string
  ): Promise<number | null> {
    try {
      const data = await apiFetch<{ id: number }>(
        '/conversations',
        {
          method: 'POST',
          body: JSON.stringify({ type, memberIds, name }),
        }
      )

      await fetchConversations()
      return data.id
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('conversations.errors.create')
      console.error('[ConversationsStore] createConversation error:', err)
      return null
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
    reset,
  }
})
