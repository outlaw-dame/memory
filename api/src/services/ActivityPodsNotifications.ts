import crypto from 'crypto'
import ky from 'ky'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { notifications, users } from '../db/schema'
import { chatConvos, chatMembers, chatMessages } from '../db/chatSchema'
import type { SelectUsers } from '../types'
import { decryptPodTokenForUser } from './PodTokenService'

const JSON_LD_ACCEPT = 'application/ld+json, application/json;q=0.9'
const NOTIFY_CONTEXT = {
  notify: 'http://www.w3.org/ns/solid/notifications#',
}
const APP_CONTEXT = {
  interop: 'http://www.w3.org/ns/solid/interop#',
  oidc: 'http://openid.net/specs/openid-connect-core-1_0#',
  apods: 'http://activitypods.org/ns/core#',
  as: 'https://www.w3.org/ns/activitystreams#',
  dc: 'http://purl.org/dc/terms/',
}
const APP_MODIFIED_AT = '2026-04-06T00:00:00.000Z'
const POD_REQUEST_TIMEOUT_MS = 12_000
const ENABLE_REGISTRATION_RESET_FALLBACK = process.env.ACTIVITYPODS_ENABLE_REGISTRATION_RESET_FALLBACK === 'true'
const DEFAULT_FRONTEND_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000
const DEFAULT_FRONTEND_REAUTH_DEFER_MS = 4 * 60 * 60 * 1000

type BackoffOptions = {
  attempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

export interface RemoteWebhookChannel {
  id: string
  topic: string
  sendTo?: string
}

export interface MemoryAppStatus {
  appUri: string
  authorizeUrl: string | null
  hasInboxWebhook: boolean
  inboxTopic: string
  installed: boolean
  onlineBackend: boolean
  upgradeNeeded: boolean
  webhookChannels: RemoteWebhookChannel[]
  expectedFrontendPolicy: {
    sessionMaxAgeMs: number
    podReauthDeferMs: number
  }
}

type AuthAgentAction = 'register-app' | 'upgrade-app'

function parsePositiveDurationMs(raw: string | undefined, fallbackMs: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs
  return parsed
}

function getExpectedFrontendPolicy() {
  return {
    sessionMaxAgeMs: parsePositiveDurationMs(
      process.env.EXPECTED_FRONTEND_SESSION_MAX_AGE_MS,
      DEFAULT_FRONTEND_SESSION_MAX_AGE_MS
    ),
    podReauthDeferMs: parsePositiveDurationMs(
      process.env.EXPECTED_FRONTEND_POD_REAUTH_DEFER_MS,
      DEFAULT_FRONTEND_REAUTH_DEFER_MS
    ),
  }
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) return false
  const text = error.message.toLowerCase()
  return (
    text.includes('timeout') ||
    text.includes('socket') ||
    text.includes('network') ||
    text.includes('econnreset') ||
    text.includes('503') ||
    text.includes('502') ||
    text.includes('500') ||
    text.includes('429')
  )
}

async function withExponentialBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  options?: BackoffOptions
): Promise<T> {
  const attempts = options?.attempts ?? 4
  const baseDelayMs = options?.baseDelayMs ?? 250
  const maxDelayMs = options?.maxDelayMs ?? 4_000

  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation(attempt)
    } catch (error) {
      lastError = error
      if (attempt >= attempts || !isRetryableError(error)) {
        throw error
      }

      const jitter = Math.floor(Math.random() * 100)
      const delayMs = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)) + jitter)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Operation failed after retries')
}

function getApiUrl() {
  return (process.env.API_URL || `http://localhost:${process.env.API_PORT || 8796}`).replace(/\/$/, '')
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/$/, '')
}

export function getMemoryAppUri() {
  return `${getApiUrl()}/activitypods/app`
}

function getRequiredAccessNeedGroupUri() {
  return `${getApiUrl()}/activitypods/access-needs/required`
}

function getAuthorizationCallbackEndpoint() {
  return `${getFrontendUrl()}/auth/callback?register_app=true`
}

export function getInboxTopicUri(webId: string) {
  return `${webId.replace(/\/$/, '')}/inbox`
}

function getWebhookSecret() {
  return process.env.ACTIVITYPODS_WEBHOOK_SECRET || process.env.JWT_SECRET || 'memory-activitypods-webhook'
}

export function signWebhookTarget(userId: number) {
  return crypto.createHmac('sha256', getWebhookSecret()).update(`${userId}:${getMemoryAppUri()}`).digest('hex')
}

export function getWebhookTargetUrl(userId: number) {
  const url = new URL(`${getApiUrl()}/activitypods/webhooks/inbox/${userId}`)
  url.searchParams.set('signature', signWebhookTarget(userId))
  return url.toString()
}

function getAuthHeaders(token: string, extraHeaders?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: JSON_LD_ACCEPT,
    ...extraHeaders,
  }
}

export async function getUserById(userId: number) {
  const records = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return records[0]
}

async function fetchJson(url: string, token: string) {
  return withExponentialBackoff(() =>
    ky.get(url, {
      headers: getAuthHeaders(token),
      timeout: POD_REQUEST_TIMEOUT_MS,
    }).json<any>()
  )
}

async function fetchAppStatus(user: SelectUsers, token: string) {
  return withExponentialBackoff(() =>
    ky.get(`${user.providerEndpoint}/.well-known/app-status`, {
      searchParams: { appUri: getMemoryAppUri() },
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: POD_REQUEST_TIMEOUT_MS,
    }).json<{
      installed?: boolean
      onlineBackend?: boolean
      upgradeNeeded?: boolean
      webhookChannels?: RemoteWebhookChannel[]
    }>()
  )
}

async function callAuthAgent(user: SelectUsers, token: string, action: AuthAgentAction) {
  return withExponentialBackoff(() =>
    ky.post(`${user.providerEndpoint}/.auth-agent/${action}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        appUri: getMemoryAppUri(),
        acceptAllRequirements: true,
      }),
      timeout: POD_REQUEST_TIMEOUT_MS,
    })
  )
}

async function removeAppRegistration(user: SelectUsers, token: string) {
  return withExponentialBackoff(() =>
    ky.post(`${user.providerEndpoint}/.auth-agent/remove-app`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        appUri: getMemoryAppUri(),
      }),
      timeout: POD_REQUEST_TIMEOUT_MS,
    })
  )
}

async function reconcileAppRegistration(user: SelectUsers, token: string, status: MemoryAppStatus) {
  if (!status.installed) {
    await callAuthAgent(user, token, 'register-app')
    return
  }

  if (status.upgradeNeeded) {
    try {
      await callAuthAgent(user, token, 'upgrade-app')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!/already has an application registration/i.test(message)) {
        throw error
      }
    }
  }
}

async function deleteWebhookChannel(user: SelectUsers, token: string, channelUri: string) {
  await withExponentialBackoff(() =>
    ky.delete(channelUri, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: JSON_LD_ACCEPT,
      },
      timeout: POD_REQUEST_TIMEOUT_MS,
    })
  )
}

async function pruneInboxWebhookChannels(user: SelectUsers, token: string, channels: RemoteWebhookChannel[]) {
  const expectedTopic = getInboxTopicUri(user.webId)
  const expectedSendTo = getWebhookTargetUrl(user.id)

  const inboxChannels = channels.filter(channel => channel.topic === expectedTopic)
  const matchingChannels = inboxChannels.filter(channel => channel.sendTo === expectedSendTo)
  const staleChannels = inboxChannels.filter(channel => channel.sendTo !== expectedSendTo)
  const duplicateMatchingChannels = matchingChannels.slice(1)

  let removed = 0
  for (const channel of [...staleChannels, ...duplicateMatchingChannels]) {
    try {
      await deleteWebhookChannel(user, token, channel.id)
      removed += 1
    } catch {
      // Keep bootstrap robust when stale channel deletion is not possible.
    }
  }

  return { removed }
}

async function getAuthorizationUrl(user: SelectUsers, token: string) {
  const actor = await fetchJson(user.webId, token)
  const authAgentUri = actor['interop:hasAuthorizationAgent']
  if (typeof authAgentUri !== 'string') return null

  const authAgent = await fetchJson(authAgentUri, token)
  const redirectEndpoint = authAgent['interop:hasAuthorizationRedirectEndpoint']
  if (typeof redirectEndpoint !== 'string') return null

  const url = new URL(redirectEndpoint)
  url.searchParams.set('client_id', getMemoryAppUri())
  return url.toString()
}

async function refreshStatusUntilStable(user: SelectUsers, token: string, currentStatus: MemoryAppStatus) {
  let status = currentStatus

  for (let attempt = 0; attempt < 3; attempt++) {
    if (!status.upgradeNeeded || status.hasInboxWebhook) {
      return status
    }

    await new Promise(resolve => setTimeout(resolve, 250 * (2 ** attempt)))
    status = await getMemoryAppStatus(user, token)
  }

  return status
}

async function recoverPersistentUpgradeStaleness(user: SelectUsers, token: string, status: MemoryAppStatus) {
  if (!ENABLE_REGISTRATION_RESET_FALLBACK) {
    return {
      usedFallback: false,
      status,
    }
  }

  // Never reset registration if notifications are already active.
  if (status.hasInboxWebhook || !status.upgradeNeeded) {
    return {
      usedFallback: false,
      status,
    }
  }

  await removeAppRegistration(user, token)
  await callAuthAgent(user, token, 'register-app')

  const recoveredStatus = await refreshStatusUntilStable(user, token, await getMemoryAppStatus(user, token))
  return {
    usedFallback: true,
    status: recoveredStatus,
  }
}

export async function getMemoryAppStatus(user: SelectUsers, token: string): Promise<MemoryAppStatus> {
  const remoteStatus = await fetchAppStatus(user, token)
  const inboxTopic = getInboxTopicUri(user.webId)
  const expectedSendTo = getWebhookTargetUrl(user.id)
  const webhookChannels = Array.isArray(remoteStatus.webhookChannels) ? remoteStatus.webhookChannels : []
  const hasInboxWebhook = webhookChannels.some(channel => channel.topic === inboxTopic && channel.sendTo === expectedSendTo)
  const authorizeUrl = !remoteStatus.installed || remoteStatus.upgradeNeeded
    ? await getAuthorizationUrl(user, token)
    : null

  return {
    appUri: getMemoryAppUri(),
    authorizeUrl,
    hasInboxWebhook,
    inboxTopic,
    installed: !!remoteStatus.installed,
    onlineBackend: remoteStatus.onlineBackend !== false,
    upgradeNeeded: !!remoteStatus.upgradeNeeded,
    webhookChannels,
    expectedFrontendPolicy: getExpectedFrontendPolicy(),
  }
}

export async function ensureMemoryInboxWebhook(user: SelectUsers, token: string) {
  let status = await getMemoryAppStatus(user, token)
  let cleanedChannels = 0
  let registrationReconciled = false
  let usedRegistrationResetFallback = false

  if (!status.installed || status.upgradeNeeded) {
    await reconcileAppRegistration(user, token, status)
    registrationReconciled = true
    status = await getMemoryAppStatus(user, token)
    status = await refreshStatusUntilStable(user, token, status)

    if (status.upgradeNeeded && !status.hasInboxWebhook) {
      const fallback = await recoverPersistentUpgradeStaleness(user, token, status)
      status = fallback.status
      usedRegistrationResetFallback = fallback.usedFallback
    }
  }

  if (status.webhookChannels.length > 0) {
    const cleanup = await pruneInboxWebhookChannels(user, token, status.webhookChannels)
    cleanedChannels = cleanup.removed
    if (cleanedChannels > 0) {
      status = await getMemoryAppStatus(user, token)
    }
  }

  if (status.hasInboxWebhook) {
    return {
      createdWebhook: false,
      cleanedChannels,
      registrationReconciled,
      usedRegistrationResetFallback,
      status,
    }
  }

  await withExponentialBackoff(() =>
    ky.post(`${user.providerEndpoint}/.notifications/WebhookChannel2023`, {
      headers: getAuthHeaders(token, {
        'Content-Type': 'application/ld+json',
      }),
      body: JSON.stringify({
        '@context': NOTIFY_CONTEXT,
        '@type': 'notify:WebhookChannel2023',
        'notify:topic': getInboxTopicUri(user.webId),
        'notify:sendTo': getWebhookTargetUrl(user.id),
      }),
      timeout: POD_REQUEST_TIMEOUT_MS,
    })
  )

  return {
    createdWebhook: true,
    cleanedChannels,
    registrationReconciled,
    usedRegistrationResetFallback,
    status: await getMemoryAppStatus(user, token),
  }
}

export function getMemoryApplicationDocument() {
  const appUri = getMemoryAppUri()
  const clientId = `${getApiUrl()}/oauth/client.json`

  return {
    '@context': APP_CONTEXT,
    '@id': appUri,
    id: appUri,
    type: ['as:Application', 'interop:Application'],
    name: 'Memory',
    summary: 'Memory watches your ActivityPods inbox and surfaces notifications in the app.',
    'dc:modified': APP_MODIFIED_AT,
    'interop:applicationName': 'Memory',
    'interop:applicationDescription': 'Memory watches your ActivityPods inbox and surfaces notifications in the app.',
    'interop:applicationAuthor': 'Memory',
    'interop:hasAuthorizationCallbackEndpoint': getAuthorizationCallbackEndpoint(),
    'interop:hasAccessNeedGroup': getRequiredAccessNeedGroupUri(),
    'oidc:client_name': 'Memory',
    'oidc:client_uri': clientId,
    'oidc:redirect_uris': [`${getFrontendUrl()}/auth/callback`],
    'oidc:post_logout_redirect_uris': [getFrontendUrl()],
    'oidc:scope': 'openid profile webid offline_access',
    'oidc:grant_types': ['authorization_code', 'refresh_token'],
    'oidc:response_types': ['code'],
  }
}

export function getRequiredAccessNeedGroupDocument() {
  const resourceUri = getRequiredAccessNeedGroupUri()
  return {
    '@context': APP_CONTEXT,
    '@id': resourceUri,
    id: resourceUri,
    '@type': 'interop:AccessNeedGroup',
    'interop:accessNecessity': 'interop:AccessRequired',
    'interop:accessScenario': 'interop:PersonalAccess',
    'interop:authenticatedAs': 'interop:SocialAgent',
    'apods:hasSpecialRights': ['apods:ReadInbox'],
  }
}

function getStringValue(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).id === 'string') {
        return String((entry as Record<string, unknown>).id)
      }
    }
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.id === 'string') return record.id
    if (typeof record['@id'] === 'string') return record['@id'] as string
  }
  return null
}

function sanitizeString(value: string | null, maxLength: number) {
  if (!value) return null
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function sanitizeNotificationPayload(payload: Record<string, unknown>) {
  const allowedKeys = ['@context', 'id', '@id', 'type', 'actor', 'object', 'target', 'published']
  const sanitized: Record<string, unknown> = {}

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      sanitized[key] = payload[key]
    }
  }

  return sanitized
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function firstTypeString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim().length > 0) return entry.trim()
      const record = asRecord(entry)
      if (record) {
        const nested = firstTypeString(record.type ?? record['@type'])
        if (nested) return nested
      }
    }
  }
  const record = asRecord(value)
  if (!record) return null
  const nested = record.type ?? record['@type']
  return firstTypeString(nested)
}

function getNestedObject(payload: Record<string, unknown>): Record<string, unknown> | null {
  const object = asRecord(payload.object)
  if (!object) return null
  const nestedObject = asRecord(object.object)
  return nestedObject ?? object
}

type NotificationKind =
  | 'reblog'
  | 'favourite'
  | 'follow'
  | 'mention'
  | 'reply'
  | 'quote'
  | 'create'
  | 'update'
  | 'delete'
  | 'add'
  | 'other'

/**
 * Returns true when the AP Note/Article object looks like a quote-post.
 * Checks Mastodon quoteUrl, Misskey _misskey_quote, and FEP-e232 quoteUri.
 */
function isQuotePost(obj: Record<string, unknown>): boolean {
  if (typeof obj.quoteUrl === 'string' && obj.quoteUrl.length > 0) return true
  if (typeof obj._misskey_quote === 'string' && obj._misskey_quote.length > 0) return true
  if (typeof obj.quoteUri === 'string' && obj.quoteUri.length > 0) return true
  // FEP-e232 tag-based quote: { type: 'Link', mediaType: 'application/ld+json', rel: 'https://misskey-hub.net/ns#_misskey_quote' }
  if (Array.isArray(obj.tag)) {
    for (const tag of obj.tag) {
      if (!tag || typeof tag !== 'object' || Array.isArray(tag)) continue
      const t = tag as Record<string, unknown>
      const rel = typeof t.rel === 'string' ? t.rel : ''
      if (
        (t.type === 'Link' || t.type === 'Note') &&
        (rel.includes('quote') || rel.includes('misskey'))
      ) {
        return true
      }
    }
  }
  return false
}

function deriveNotificationKind(payload: Record<string, unknown>, activityType: string): NotificationKind {
  const envelopeType = firstTypeString(payload.type ?? activityType) ?? activityType
  const nestedObject = getNestedObject(payload)
  const nestedType = firstTypeString(nestedObject?.type)
  const effectiveType = (nestedType ?? envelopeType).toLowerCase()

  if (effectiveType === 'announce' || effectiveType === 'share' || effectiveType === 'repost') return 'reblog'
  if (effectiveType === 'like' || effectiveType === 'favorite' || effectiveType === 'favourite') return 'favourite'
  if (effectiveType === 'follow') return 'follow'
  if (effectiveType === 'mention') return 'mention'
  if (effectiveType === 'create') return 'create'
  if (effectiveType === 'update') return 'update'
  if (effectiveType === 'delete') return 'delete'
  if (effectiveType === 'add') return 'add'

  if (envelopeType.toLowerCase() === 'add') {
    if (effectiveType === 'note' || effectiveType === 'article') {
      // Distinguish reply vs quote vs plain mention using the Note's own fields.
      if (nestedObject) {
        if (isQuotePost(nestedObject)) return 'quote'
        if (nestedObject.inReplyTo != null) return 'reply'
      }
      return 'mention'
    }
    return 'add'
  }

  return 'other'
}

function deriveGroupSubjectUri(
  payload: Record<string, unknown>,
  objectUri: string | null,
  targetUri: string | null,
): string | null {
  const nestedObject = getNestedObject(payload)
  const nestedTarget = asRecord(nestedObject?.target)
  const nestedSubject = asRecord(nestedObject?.object)

  return (
    sanitizeString(
      getStringValue(nestedSubject) ??
      getStringValue(nestedTarget) ??
      getStringValue(nestedObject) ??
      objectUri ??
      targetUri,
      4096,
    )
  )
}

export interface GroupedNotificationActor {
  actorUri: string
  count: number
  lastAt: string
}

export interface GroupedNotification {
  groupId: string
  kind: NotificationKind
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

function getNotificationLabel(kind: NotificationKind, activityType: string): string {
  switch (kind) {
    case 'reblog':
      return 'Boosts'
    case 'favourite':
      return 'Likes'
    case 'follow':
      return 'Follows'
    case 'mention':
      return 'Mentions'
    case 'reply':
      return 'Replies'
    case 'quote':
      return 'Quotes'
    case 'create':
      return 'New activity'
    case 'update':
      return 'Updated activity'
    case 'delete':
      return 'Deleted activity'
    case 'add':
      return 'Inbox activity'
    default:
      return activityType || 'Activity'
  }
}

// ---------------------------------------------------------------------------
// Direct-message detection helpers
// ---------------------------------------------------------------------------

const AS_PUBLIC_IRIS = new Set([
  'https://www.w3.org/ns/activitystreams#Public',
  'as:Public',
  'Public',
])

function toArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value != null) return [value]
  return []
}

function extractUriString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  if (value && typeof value === 'object') {
    const r = value as Record<string, unknown>
    const id = r.id ?? r['@id']
    if (typeof id === 'string' && id.trim().length > 0) return id.trim()
  }
  return null
}

function deriveConvoIdFromDids(dids: string[]): string {
  const sorted = [...dids].sort()
  return `convo_${crypto.createHash('sha256').update(sorted.join('|')).digest('hex').slice(0, 32)}`
}

function extractMentionsAndHashtags(tags: unknown): { mentions: string[]; hashtags: string[] } {
  const mentionSet = new Set<string>()
  const hashtagSet = new Set<string>()

  for (const tag of toArrayValue(tags)) {
    if (!tag || typeof tag !== 'object' || Array.isArray(tag)) continue
    const record = tag as Record<string, unknown>
    const typeValues = toArrayValue(record.type)
    const isMention = typeValues.some(t => t === 'Mention')
    const isHashtag = typeValues.some(t => t === 'Hashtag')

    if (isMention) {
      const mentionUri = extractUriString(record.href ?? record.id)
      if (mentionUri && /^https?:\/\//i.test(mentionUri) && mentionUri.length <= 2048) {
        mentionSet.add(mentionUri)
      }
    }

    if (isHashtag && typeof record.name === 'string') {
      const normalized = record.name.replace(/^#/, '').trim().toLowerCase()
      if (normalized && normalized.length <= 128) {
        hashtagSet.add(normalized)
      }
    }
  }

  return { mentions: [...mentionSet], hashtags: [...hashtagSet] }
}

function extractAttachments(attachmentsRaw: unknown): Array<Record<string, unknown>> {
  const attachments: Array<Record<string, unknown>> = []
  for (const item of toArrayValue(attachmentsRaw).slice(0, 16)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const r = item as Record<string, unknown>
    const url = extractUriString(r.url ?? r.href)
    if (!url || !/^https?:\/\//i.test(url) || url.length > 2048) continue

    const entry: Record<string, unknown> = {
      type: typeof r.type === 'string' ? r.type : 'Link',
      url,
    }

    if (typeof r.mediaType === 'string') entry.mimeType = r.mediaType
    if (typeof r.name === 'string') entry.name = r.name.slice(0, 256)
    attachments.push(entry)
  }
  return attachments
}

/**
 * Inspects a raw Solid Notifications webhook payload for an AP Create(Note) DM
 * and, if detected, upserts the conversation + message into the local chat DB.
 *
 * Solid Notifications delivers an `Add` envelope:
 *   { type: 'Add', object: '<activity-uri>', target: '<inbox-uri>' }
 *
 * The function:
 *   1. Detects the `Add` envelope
 *   2. Fetches the full AP activity from the pod using the user's podToken
 *   3. Applies DM detection (Create(Note), no public audience)
 *   4. Upserts convo + members + message atomically
 *
 * Called after `recordNotificationDelivery` — delivery recording is never
 * blocked by DM persistence failures. Fully idempotent.
 */
export async function maybePersistDirectMessage(
  userId: number,
  payload: Record<string, unknown>,
): Promise<void> {
  // 1. Solid Notifications inbox envelope is type 'Add'
  const types = toArrayValue(payload.type)
  const isAdd = types.some(t => t === 'Add')
  if (!isAdd) return

  // 2. Resolve the local recipient — needed for webId (and podToken if fetching)
  const recipientUser = await getUserById(userId)
  if (!recipientUser?.webId) return
  const recipientWebId = recipientUser.webId

  // 3. Determine the activity — two cases:
  //    A. payload.object is an embedded AP activity object (transient/bridge path):
  //       ActivityPods emits the full activity when the activity ID contains '#' (no LDP store)
  //    B. payload.object is a plain HTTP(S) URI → fetch the LDP resource from the pod
  const rawObject = payload.object
  let activity: Record<string, unknown>

  if (rawObject && typeof rawObject === 'object' && !Array.isArray(rawObject)) {
    // Case A: embedded activity object — validate it's a real AP record
    const embedded = rawObject as Record<string, unknown>
    if (!embedded.type) return
    activity = embedded
  } else {
    // Case B: URI reference — fetch from pod (requires podToken)
    const activityUri = extractUriString(rawObject)
    if (!activityUri || !/^https?:\/\//i.test(activityUri) || activityUri.length > 2048) return
    const podToken = await decryptPodTokenForUser(recipientUser)
    if (!podToken) return

    try {
      activity = await fetchJson(activityUri, podToken) as Record<string, unknown>
    } catch {
      // Pod unreachable or access denied — drop silently, not retried here
      return
    }
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) return
  }

  // 4. Must be a Create activity
  const activityTypes = toArrayValue(activity.type)
  const isCreate = activityTypes.some(t => t === 'Create')
  if (!isCreate) return

  // 5. Object must be an embedded Note (not a bare URI string)
  const obj = activity.object
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return
  const objRecord = obj as Record<string, unknown>
  const objTypes = toArrayValue(objRecord.type)
  if (!objTypes.some(t => t === 'Note')) return

  // 6. Must be a direct message — no AS Public IRI in any recipient list
  const allRecipients = [
    ...toArrayValue(objRecord.to),
    ...toArrayValue(objRecord.cc),
    ...toArrayValue(activity.to),
    ...toArrayValue(activity.cc),
  ]
  if (allRecipients.some(r => typeof r === 'string' && AS_PUBLIC_IRIS.has(r))) return

  // 7. Extract sender — must be an absolute HTTP(S) URI
  const actorUri = extractUriString(activity.actor)
  if (!actorUri || !/^https?:\/\//i.test(actorUri) || actorUri.length > 2048) return

  // Do not persist self-messages
  if (actorUri === recipientWebId) return

  // 8. Sanitise message content
  const rawContent = typeof objRecord.content === 'string' ? objRecord.content : ''
  const text = rawContent.replace(/\x00/g, '').trim().slice(0, 10_000)

  const { mentions: rawMentions, hashtags } = extractMentionsAndHashtags(objRecord.tag)
  const attachments = extractAttachments(objRecord.attachment)

  // Mention scoping: direct-message mentions must remain inside the chat participants.
  const allowedMentionUris = new Set([actorUri, recipientWebId])
  const mentions = rawMentions.filter(uri => allowedMentionUris.has(uri))

  // 9. Derive stable convoId
  const convoId = deriveConvoIdFromDids([actorUri, recipientWebId])

  // 10. Derive stable message ID from the activity's own IRI (globally unique in AP).
  //     Fall back to a content hash — never use new Date() to avoid non-deterministic
  //     IDs that would create duplicates on redelivery.
  const fetchedActivityId = extractUriString(activity.id ?? activity['@id'])
  const objectUri = extractUriString(objRecord.id ?? objRecord['@id'])
  const publishedRaw = typeof activity.published === 'string' ? activity.published : null
  if (!fetchedActivityId && !publishedRaw) return // cannot derive a stable id; drop safely

  const msgIdSource = objectUri ?? fetchedActivityId ?? `${actorUri}|${recipientWebId}|${text}|${publishedRaw}`
  const msgId = crypto.createHash('sha256').update(msgIdSource).digest('hex').slice(0, 36)

  // 11. Parse sentAt — guard against malformed published value
  const sentAt = publishedRaw ? new Date(publishedRaw) : new Date()
  if (isNaN(sentAt.getTime())) return

  // 12. Upsert convo + memberships + message atomically
  await db.transaction(async (tx) => {
    await tx.insert(chatConvos).values({
      id: convoId,
      convoType: 'direct',
      name: null,
      rev: 0,
    }).onConflictDoNothing()

    await tx.insert(chatMembers).values({ convoId, userDid: actorUri, role: 'member' }).onConflictDoNothing()
    await tx.insert(chatMembers).values({ convoId, userDid: recipientWebId, role: 'member' }).onConflictDoNothing()

    const [existingMessage] = await tx
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.id, msgId))
      .limit(1)

    if (existingMessage) return

    const [updated] = await tx
      .update(chatConvos)
      .set({ rev: sql`${chatConvos.rev} + 1`, updatedAt: new Date() })
      .where(eq(chatConvos.id, convoId))
      .returning({ rev: chatConvos.rev })

    await tx.insert(chatMessages).values({
      id: msgId,
      objectUri,
      convoId,
      senderDid: actorUri,
      text,
      mentions,
      hashtags,
      attachments,
      inReplyToMessageId: null,
      quoteMessageId: null,
      sentAt,
      rev: updated?.rev ?? 1,
    }).onConflictDoNothing()
  })
}

export async function recordNotificationDelivery(userId: number, payload: Record<string, unknown>) {
  const sanitizedPayload = sanitizeNotificationPayload(payload)
  const activityType = sanitizeString(getStringValue(sanitizedPayload.type), 120) || 'Unknown'
  const objectUri = sanitizeString(getStringValue(sanitizedPayload.object), 4096)
  const actorUri = sanitizeString(getStringValue(sanitizedPayload.actor), 4096)
  const targetUri = sanitizeString(getStringValue(sanitizedPayload.target), 4096)
  const publishedValue = sanitizeString(getStringValue(sanitizedPayload.published), 128)
  const deliveryHash = crypto.createHash('sha256').update(JSON.stringify({
    userId,
    activityType,
    objectUri,
    actorUri,
    targetUri,
    publishedValue,
  })).digest('hex')

  try {
    await db.insert(notifications).values({
      userId,
      deliveryHash,
      activityType,
      objectUri,
      actorUri,
      targetUri,
      payload: sanitizedPayload,
      publishedAt: publishedValue ? new Date(publishedValue) : null,
    })

    return { duplicate: false }
  } catch (error) {
    if (error instanceof Error && /notifications_delivery_hash_unique/.test(error.message)) {
      return { duplicate: true }
    }
    if (error instanceof Error && /duplicate key value/.test(error.message)) {
      return { duplicate: true }
    }
    throw error
  }
}

export async function listNotificationsForUser(userId: number) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50)
}

export interface GroupedNotificationOptions {
  includeFollows?: boolean
  includeMentions?: boolean
  windowHours?: number
}

export async function listGroupedNotificationsForUser(
  userId: number,
  options: GroupedNotificationOptions = {},
): Promise<GroupedNotification[]> {
  const includeFollows = options.includeFollows === true
  const includeMentions = options.includeMentions === true
  const windowHours = Number.isFinite(options.windowHours)
    ? Math.min(24 * 30, Math.max(1, Math.trunc(options.windowHours as number)))
    : 72
  const cutoffMs = Date.now() - (windowHours * 60 * 60 * 1000)

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(200)

  type ActorAggregate = {
    actorUri: string
    count: number
    lastAt: Date
  }

  type GroupAggregate = {
    kind: NotificationKind
    label: string
    objectUri: string | null
    targetUri: string | null
    totalCount: number
    unreadCount: number
    latestAt: Date
    actorMap: Map<string, ActorAggregate>
    notificationIds: number[]
  }

  const groups = new Map<string, GroupAggregate>()

  for (const row of rows) {
    const payload = (row.payload && typeof row.payload === 'object')
      ? row.payload as Record<string, unknown>
      : {}

    const kind = deriveNotificationKind(payload, row.activityType)
    const occurredAt = row.publishedAt ?? row.createdAt
    const actorUri = row.actorUri
    const groupSubject = deriveGroupSubjectUri(payload, row.objectUri, row.targetUri)

    const isWithinWindow = occurredAt.getTime() >= cutoffMs
    const isBoostOrLikeGroup = (kind === 'reblog' || kind === 'favourite') && !!groupSubject
    const isFollowGroup = kind === 'follow' && includeFollows && !!actorUri
    const isMentionGroup = kind === 'mention' && includeMentions && !!groupSubject

    const isGroupable = isWithinWindow && (isBoostOrLikeGroup || isFollowGroup || isMentionGroup)
    const groupId = isGroupable
      ? (isFollowGroup ? `${kind}:${actorUri}` : `${kind}:${groupSubject}`)
      : `single:${row.id}`

    let aggregate = groups.get(groupId)
    if (!aggregate) {
      aggregate = {
        kind,
        label: getNotificationLabel(kind, row.activityType),
        objectUri: row.objectUri,
        targetUri: row.targetUri,
        totalCount: 0,
        unreadCount: 0,
        latestAt: occurredAt,
        actorMap: new Map<string, ActorAggregate>(),
        notificationIds: [],
      }
      groups.set(groupId, aggregate)
    }

    aggregate.totalCount += 1
    if (!row.isRead) aggregate.unreadCount += 1
    if (occurredAt > aggregate.latestAt) aggregate.latestAt = occurredAt
    aggregate.notificationIds.push(row.id)

    if (actorUri) {
      const existingActor = aggregate.actorMap.get(actorUri)
      if (existingActor) {
        existingActor.count += 1
        if (occurredAt > existingActor.lastAt) existingActor.lastAt = occurredAt
      } else {
        aggregate.actorMap.set(actorUri, {
          actorUri,
          count: 1,
          lastAt: occurredAt,
        })
      }
    }
  }

  const result: GroupedNotification[] = [...groups.entries()].map(([groupId, aggregate]) => {
    const actors = [...aggregate.actorMap.values()]
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .slice(0, 3)
      .map(actor => ({
        actorUri: actor.actorUri,
        count: actor.count,
        lastAt: actor.lastAt.toISOString(),
      }))

    return {
      groupId,
      kind: aggregate.kind,
      label: aggregate.label,
      totalCount: aggregate.totalCount,
      unreadCount: aggregate.unreadCount,
      actorCount: aggregate.actorMap.size,
      actors,
      latestAt: aggregate.latestAt.toISOString(),
      objectUri: aggregate.objectUri,
      targetUri: aggregate.targetUri,
      notificationIds: aggregate.notificationIds,
    }
  })

  return result.sort((a, b) => {
    const ta = new Date(a.latestAt).getTime()
    const tb = new Date(b.latestAt).getTime()
    return tb - ta
  })
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const now = new Date()
  const updated = await db
    .update(notifications)
    .set({ isRead: true, readAt: now })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, notificationId)))
    .returning({ id: notifications.id })

  return updated.length > 0
}

export async function markNotificationsRead(userId: number, notificationIds: number[]) {
  const ids = notificationIds.filter(id => Number.isInteger(id) && id > 0)
  if (ids.length === 0) return 0

  const now = new Date()
  const updated = await db
    .update(notifications)
    .set({ isRead: true, readAt: now })
    .where(and(eq(notifications.userId, userId), inArray(notifications.id, ids)))
    .returning({ id: notifications.id })

  return updated.length
}

export async function markAllNotificationsRead(userId: number) {
  const now = new Date()
  const updated = await db
    .update(notifications)
    .set({ isRead: true, readAt: now })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id })

  return updated.length
}

export async function verifyWebhookTarget(userId: number, signature?: string) {
  if (!signature) return false
  const expected = signWebhookTarget(userId)
  if (signature.length !== expected.length) return false
  return crypto.timingSafeEqual(new Uint8Array(Buffer.from(signature)), new Uint8Array(Buffer.from(expected)))
}
