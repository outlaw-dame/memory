import { defineStore } from 'pinia'
import { ref } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { t } from '@/i18n'
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
  isRead: boolean
  readAt: string | null
}

export interface GroupedNotificationActor {
  actorUri: string
  count: number
  lastAt: string
}

export interface GroupedNotification {
  groupId: string
  kind: string
  label: string
  totalCount: number
  unreadCount: number
  actorCount: number
  actors: GroupedNotificationActor[]
  latestAt: string
  objectUri: string | null
  targetUri: string | null
  notificationIds: number[]
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
const GROUPING_PREFERENCES_KEY = 'memory.notifications.grouping.preferences.v1'
const sessionPolicyConfig = getSessionPolicyConfig()

export interface NotificationGroupingPreferences {
  includeFollows: boolean
  includeMentions: boolean
  windowHours: number
}

const DEFAULT_GROUPING_PREFERENCES: NotificationGroupingPreferences = {
  includeFollows: false,
  includeMentions: false,
  windowHours: 72,
}

function normalizeGroupingPreferences(input: unknown): NotificationGroupingPreferences {
  const value = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  const includeFollows = value.includeFollows === true
  const includeMentions = value.includeMentions === true
  const rawWindow = typeof value.windowHours === 'number' ? value.windowHours : Number(value.windowHours)
  const windowHours = Number.isFinite(rawWindow)
    ? Math.min(24 * 30, Math.max(1, Math.trunc(rawWindow)))
    : DEFAULT_GROUPING_PREFERENCES.windowHours
  return { includeFollows, includeMentions, windowHours }
}

function loadGroupingPreferences(): NotificationGroupingPreferences {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_GROUPING_PREFERENCES }
  }
  const raw = localStorage.getItem(GROUPING_PREFERENCES_KEY)
  if (!raw) return { ...DEFAULT_GROUPING_PREFERENCES }
  try {
    return normalizeGroupingPreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_GROUPING_PREFERENCES }
  }
}

function saveGroupingPreferences(value: NotificationGroupingPreferences) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(GROUPING_PREFERENCES_KEY, JSON.stringify(value))
}

export const useNotificationsStore = defineStore('notifications', () => {
  const authStore = useAuthStore()

  const items = ref<MemoryNotification[]>([])
  const groupedItems = ref<GroupedNotification[]>([])
  const groupingPreferences = ref<NotificationGroupingPreferences>(loadGroupingPreferences())
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

  async function fetchGroupedNotifications() {
    const params = new URLSearchParams({
      includeFollows: String(groupingPreferences.value.includeFollows),
      includeMentions: String(groupingPreferences.value.includeMentions),
      windowHours: String(groupingPreferences.value.windowHours),
    })
    groupedItems.value = await apiFetch<GroupedNotification[]>(`/activitypods/notifications/grouped?${params.toString()}`)
    return groupedItems.value
  }

  async function setGroupingPreferences(next: Partial<NotificationGroupingPreferences>) {
    groupingPreferences.value = normalizeGroupingPreferences({
      ...groupingPreferences.value,
      ...next,
    })
    saveGroupingPreferences(groupingPreferences.value)
    if (status.value?.installed && status.value.hasInboxWebhook) {
      await fetchGroupedNotifications()
    }
  }

  async function markNotificationRead(id: number) {
    await apiFetch<{ updated: boolean }>(`/activitypods/notifications/${id}/read`, { method: 'PATCH' })
    items.value = items.value.map(item => {
      if (item.id !== id) return item
      return {
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      }
    })
    await fetchGroupedNotifications()
  }

  async function markGroupRead(notificationIds: number[]) {
    if (notificationIds.length === 0) return
    await apiFetch<{ updated: number }>('/activitypods/notifications/groups/read', {
      method: 'POST',
      body: JSON.stringify({ notificationIds }),
    })
    items.value = items.value.map(item => {
      if (!notificationIds.includes(item.id)) return item
      return {
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      }
    })
    await fetchGroupedNotifications()
  }

  async function markAllRead() {
    await apiFetch<{ updated: number }>('/activitypods/notifications/read-all', {
      method: 'POST',
    })
    const nowIso = new Date().toISOString()
    items.value = items.value.map(item => ({
      ...item,
      isRead: true,
      readAt: item.readAt ?? nowIso,
    }))
    await fetchGroupedNotifications()
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
        await fetchGroupedNotifications()
      }
      return status.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('notifications.errors.initialize')
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
    groupedItems.value = []
    status.value = null
    error.value = null
    deferPodReauth.value = false
    clearReauthDeferMarker()
  }

  return {
    items,
    groupedItems,
    groupingPreferences,
    status,
    isLoading,
    error,
    deferPodReauth,
    beginAuthorization,
    bootstrap,
    fetchNotifications,
    fetchGroupedNotifications,
    fetchStatus,
    markAllRead,
    setGroupingPreferences,
    markGroupRead,
    markNotificationRead,
    initialize,
    reset,
  }
})
