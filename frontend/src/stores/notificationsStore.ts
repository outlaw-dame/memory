import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './authStore'
import { getSessionPolicyConfig } from '@/utils/sessionPolicy'

export interface MemoryNotification {
  id: number
  activityType: string
  objectUri: string | null
  actorUri: string | null
  targetUri: string | null
  payload: Record<string, unknown>
  createdAt: string
  publishedAt: string | null
}

export interface NotificationStatus {
  appUri: string
  authorizeUrl: string | null
  hasInboxWebhook: boolean
  inboxTopic: string
  installed: boolean
  onlineBackend: boolean
  upgradeNeeded: boolean
  webhookChannels: Array<{ id: string; topic: string; sendTo?: string }>
  expectedFrontendPolicy?: {
    sessionMaxAgeMs: number
    podReauthDeferMs: number
  }
}

const REAUTH_DEFER_STARTED_AT_KEY = 'memory.notifications.reauth.defer.startedAt'
const sessionPolicyConfig = getSessionPolicyConfig()

export const useNotificationsStore = defineStore('notifications', () => {
  const authStore = useAuthStore()

  const items = ref<MemoryNotification[]>([])
  const status = ref<NotificationStatus | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const deferPodReauth = ref(false)

  function clearReauthDeferMarker() {
    localStorage.removeItem(REAUTH_DEFER_STARTED_AT_KEY)
  }

  function updateReauthDeferral(currentStatus: NotificationStatus) {
    if (!currentStatus.upgradeNeeded || !currentStatus.hasInboxWebhook || !authStore.hasFreshBrowserSession()) {
      deferPodReauth.value = false
      clearReauthDeferMarker()
      return
    }

    const now = Date.now()
    const raw = localStorage.getItem(REAUTH_DEFER_STARTED_AT_KEY)
    const startedAt = raw ? Number(raw) : now

    if (!raw) {
      localStorage.setItem(REAUTH_DEFER_STARTED_AT_KEY, String(now))
    }

    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      deferPodReauth.value = false
      clearReauthDeferMarker()
      return
    }

    deferPodReauth.value = now - startedAt <= sessionPolicyConfig.podReauthDeferMs
    if (!deferPodReauth.value) {
      clearReauthDeferMarker()
    }
  }

  function getApiBase() {
    return import.meta.env.VITE_API_URL || 'http://localhost:8796'
  }

  function getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      auth: authStore.token,
    }
  }

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: { ...getHeaders(), ...(options?.headers ?? {}) },
    })

    if (!response.ok) {
      throw new Error(await response.text().catch(() => 'Unknown API error'))
    }

    return response.json() as Promise<T>
  }

  async function fetchStatus() {
    status.value = await apiFetch<NotificationStatus>('/activitypods/notifications/status')
    updateReauthDeferral(status.value)
    return status.value
  }

  async function bootstrap() {
    const result = await apiFetch<{ createdWebhook: boolean; status: NotificationStatus }>('/activitypods/notifications/bootstrap', {
      method: 'POST',
    })
    status.value = result.status
    updateReauthDeferral(result.status)
    return result
  }

  async function fetchNotifications() {
    items.value = await apiFetch<MemoryNotification[]>('/activitypods/notifications')
    return items.value
  }

  async function initialize() {
    if (!authStore.isLoggedIn) return null

    isLoading.value = true
    error.value = null

    try {
      const currentStatus = await fetchStatus()
      if (currentStatus.installed && !currentStatus.hasInboxWebhook) {
        await bootstrap()
      }
      if (status.value?.installed && status.value.hasInboxWebhook) {
        await fetchNotifications()
      }
      return status.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to initialize notifications'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function beginAuthorization() {
    if (deferPodReauth.value) {
      return
    }
    if (status.value?.authorizeUrl) {
      window.location.assign(status.value.authorizeUrl)
    }
  }

  function reset() {
    items.value = []
    status.value = null
    error.value = null
    deferPodReauth.value = false
    clearReauthDeferMarker()
  }

  return {
    items,
    status,
    isLoading,
    error,
    deferPodReauth,
    beginAuthorization,
    bootstrap,
    fetchNotifications,
    fetchStatus,
    initialize,
    reset,
  }
})