import ky, { type Options as KyOptions } from 'ky'
import type { NoteCreateRequest, PodProviderSignInResponse } from '../types'
import type User from '../decorater/User'

// ---------------------------------------------------------------------------
// Retry / backoff helpers
// ---------------------------------------------------------------------------

/**
 * Retry configuration for *safe* (read-only / idempotent) pod-server calls.
 * Uses ky's built-in exponential backoff:
 *   attempt 1 → delay ≈ 0.3 s
 *   attempt 2 → delay ≈ 0.6 s
 *   attempt 3 → delay ≈ 1.2 s
 * 429 (rate-limit) and transient 5xx are retried; auth errors are not.
 */
const SAFE_RETRY: KyOptions['retry'] = {
  limit: 3,
  methods: ['get', 'post'],
  statusCodes: [429, 500, 502, 503, 504],
  backoffLimit: 10_000
}

/**
 * Default request timeout for all pod-server calls (10 s).
 * Prevents zombie connections when the pod server is unresponsive.
 */
const DEFAULT_TIMEOUT = 10_000
const MAX_ACTIVITYPUB_RESPONSE_BYTES = 2_000_000
const TRUSTED_ACTIVITYPUB_PROXY_ORIGINS = new Set(
  [
    process.env.ACTIVITYPUB_PROXY_BASE_URL,
    process.env.POD_PROVIDER_BASE_URL,
    ...(process.env.MEMORY_POD_PROVIDER_ENDPOINTS?.split(',') ?? []),
  ]
    .map(value => {
      if (!value) return null

      try {
        const parsed = new URL(value.trim())
        return parsed.origin
      } catch {
        return null
      }
    })
    .filter((value): value is string => value !== null)
)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const extractObjectUri = (response: any): string | null => {
  if (!response || typeof response !== 'object') return null
  if (typeof response.object === 'string') return response.object
  if (response.object && typeof response.object.id === 'string') return response.object.id
  if (response.object && typeof response.object['@id'] === 'string') return response.object['@id']
  if (
    typeof response.id === 'string' &&
    (
      response.type === 'Note' ||
      response.type === 'Article' ||
      response.type === 'https://www.w3.org/ns/activitystreams#Note' ||
      response.type === 'https://www.w3.org/ns/activitystreams#Article'
    )
  ) {
    return response.id
  }
  return null
}

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const isAllowedRemoteFetchUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (parsed.username.length > 0 || parsed.password.length > 0) return false

    if (TRUSTED_ACTIVITYPUB_PROXY_ORIGINS.has(parsed.origin)) {
      return true
    }

    const hostname = parsed.hostname.toLowerCase()
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false
    if (isPrivateIpLiteral(hostname)) return false

    return true
  } catch {
    return false
  }
}

const parseIpv4 = (hostname: string): number[] | null => {
  const parts = hostname.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map(part => Number.parseInt(part, 10))
  if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null
  return octets
}

const isPrivateIpLiteral = (hostname: string): boolean => {
  const ipv4 = parseIpv4(hostname)
  if (ipv4) {
    const [a, b] = ipv4
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a === 198 && (b === 18 || b === 19)) return true
    return false
  }

  const normalized = hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase()
  if (normalized === '::1' || normalized === '::') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true

  return false
}

const extractUriLike = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return isHttpUrl(value) ? value : null
  }

  if (value && typeof value === 'object') {
    const id = (value as Record<string, unknown>).id ?? (value as Record<string, unknown>)['@id']
    if (typeof id === 'string' && id.trim().length > 0) {
      return isHttpUrl(id) ? id : null
    }
  }

  return null
}

const extractCollectionItemUris = (collectionDoc: Record<string, unknown>): string[] => {
  const raw = collectionDoc.orderedItems ?? collectionDoc.items
  if (!Array.isArray(raw)) return []

  return raw
    .map(item => extractUriLike(item))
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
}

const extractPageUri = (doc: Record<string, unknown>, key: 'first' | 'next'): string | null => {
  return extractUriLike(doc[key])
}

const extractHistoryCollectionUri = (doc: Record<string, unknown>): string | null => {
  return (
    extractUriLike(doc.history) ??
    extractUriLike(doc['as:history']) ??
    extractUriLike(doc['https://w3id.org/fep/bad1#history'])
  )
}

const looksLikeCollection = (doc: Record<string, unknown>): boolean => {
  const rawType = doc.type
  const hasCollectionType =
    typeof rawType === 'string'
      ? rawType.includes('Collection')
      : Array.isArray(rawType)
        ? rawType.some(entry => typeof entry === 'string' && entry.includes('Collection'))
        : false

  return hasCollectionType || Array.isArray(doc.orderedItems) || Array.isArray(doc.items) || !!doc.first || !!doc.next
}

const extractNoteLikeObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const noteTypes = new Set(['Note', 'Article', 'Page', 'Question'])

  if (typeof record.type === 'string' && noteTypes.has(record.type)) {
    return record
  }

  const wrappingTypes = new Set(['Create', 'Update', 'Announce'])
  if (typeof record.type === 'string' && wrappingTypes.has(record.type)) {
    const object = record.object
    if (object && typeof object === 'object' && !Array.isArray(object)) {
      const inner = object as Record<string, unknown>
      if (typeof inner.type === 'string' && noteTypes.has(inner.type)) {
        return inner
      }
    }
  }

  return null
}

export interface ConversationBackfillResult {
  mode: 'contextHistory' | 'context' | 'replies' | 'none'
  root: Record<string, unknown>
  activities: Record<string, unknown>[]
  posts: Record<string, unknown>[]
}

export interface UploadedPodMedia {
  url: string
  mediaType: string
  size: number
}

  // ---------------------------------------------------------------------------
  // Process-level profile cache
  //
  // Caches the authenticated user's own profile for a short TTL so that repeated
  // requests within the same Bun process (e.g. multiple route handlers in one
  // session burst) do not each make a full pod roundtrip.
  //
  // Constraints:
  //   - Only profile data (non-sensitive) is stored; tokens are never cached.
  //   - Cache key = WebID URI (per-user).
  //   - updateProfile() must invalidate the entry so writes are never masked.
  //   - Pod remains source of truth; this is a soft read-through cache only.
  // ---------------------------------------------------------------------------

  const PROFILE_CACHE_TTL_MS = 5 * 60 * 1_000  // 5 minutes

  interface ProfileCacheEntry {
    profile: Record<string, unknown>
    expiresAt: number
  }

  const profileCache = new Map<string, ProfileCacheEntry>()

export default abstract class ActivityPod {
  static async signIn(endpoint: string, username: string, password: string) {
    const response: PodProviderSignInResponse = await ky
      .post(`${endpoint}/auth/login`, {
        json: { username, password },
        timeout: DEFAULT_TIMEOUT
      })
      .json()
    return response
  }

  static async signup(endpoint: string, username: string, password: string, email: string) {
    const response: PodProviderSignInResponse = await ky
      .post(`${endpoint}/auth/signup`, {
        json: { username, password, email },
        timeout: DEFAULT_TIMEOUT
      })
      .json()
    return response
  }

  static async createPost(user: User, post: NoteCreateRequest) {
    const response = await ky
      .post(`${user.endpoint}/${user.userName}/outbox`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: post,
        timeout: DEFAULT_TIMEOUT
        // No retry: posting to an outbox is not idempotent.
      })
      .json<any>()
    return {
      raw: response,
      objectUri: extractObjectUri(response)
    }
  }

  static async uploadMedia(user: User, file: File, slug: string): Promise<UploadedPodMedia> {
    const uploadContainerUrl = `${user.endpoint.replace(/\/$/, '')}/${encodeURIComponent(user.userName)}/data/semapps/file`
    const response = await ky.post(uploadContainerUrl, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': file.type,
        Slug: slug,
      },
      body: file,
      timeout: DEFAULT_TIMEOUT,
      retry: 0,
    })
    const location = response.headers.get('Location') || response.headers.get('location')
    if (!location) {
      throw new Error('ActivityPods media upload did not return a Location header')
    }

    return {
      url: new URL(location, uploadContainerUrl).toString(),
      mediaType: file.type,
      size: file.size,
    }
  }

  static async announceObject(user: User, objectUri: string) {
    const actorUri = user.getWebId()
    const response = await ky
      .post(`${user.endpoint}/${user.userName}/outbox`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Announce',
          actor: actorUri,
          attributedTo: actorUri,
          object: objectUri,
          to: [
            `${user.endpoint}/${user.userName}/followers`,
            'https://www.w3.org/ns/activitystreams#Public',
          ],
        },
        timeout: DEFAULT_TIMEOUT
        // No retry: announcing is not idempotent.
      })
      .json<any>()

    return {
      raw: response,
      objectUri: extractObjectUri(response)
    }
  }

  static async getProfile(user: User) {
    const webId = user.getWebId()
    const cached = profileCache.get(webId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.profile
    }

    const profile = await ky
      .get(webId, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          Accept: 'application/ld+json, application/json;q=0.9'
        },
        retry: SAFE_RETRY,
        timeout: DEFAULT_TIMEOUT
      })
      .json<Record<string, unknown>>()

    profileCache.set(webId, { profile, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS })
    return profile
  }

  static async updateProfile(user: User, actor: Record<string, unknown>) {
    // Invalidate cache before the write so the next getProfile() fetches fresh data.
    profileCache.delete(user.getWebId())

    const response = await ky.put(user.getWebId(), {
      headers: {
        Authorization: `Bearer ${user.token}`,
        Accept: 'application/ld+json, application/json;q=0.9',
        'Content-Type': 'application/ld+json'
      },
      body: JSON.stringify(actor),
      timeout: DEFAULT_TIMEOUT
    })

    const text = await response.text()
    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }

  /**
   * Resolves the reply policy for an ActivityPub object from the replier's
   * perspective. This is a state-read call and is safe to retry on transient
   * failures.
   */
  static async resolveReplyPolicy(user: User, objectUri: string) {
    return ky
      .post(`${user.endpoint}/api/reply-policies/resolve`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: { objectUri },
        retry: SAFE_RETRY,
        timeout: DEFAULT_TIMEOUT
      })
      .json()
  }

  /**
   * Submits a reply to an ActivityPub object.
   * NOT retried automatically — submitting a reply is not idempotent and a
   * duplicate send would create two copies in the replier's outbox.
   * A single attempt with a reasonable timeout is the correct policy here.
   */
  static async replyToObject(user: User, objectUri: string, content: string, isPublic = true) {
    const response = await ky
      .post(`${user.endpoint}/api/reply-policies/reply`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: { objectUri, content, isPublic },
        timeout: DEFAULT_TIMEOUT
        // No retry: not idempotent.
      })
      .json<any>()

    return {
      ...response,
      replyObjectUri: extractObjectUri(response?.posted ?? response)
    }
  }

  static async followActor(user: User, objectUri: string) {
    return this.followObject(user, objectUri)
  }

  static async resolveFollowTarget(user: User, objectUri: string) {
    return ky
      .post(`${user.endpoint}/api/followable/resolve`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: {
          objectUri,
          recursionLimit: 1,
          requireFollowersCollection: true
        },
        retry: SAFE_RETRY,
        timeout: DEFAULT_TIMEOUT
      })
      .json()
  }

  static async followObject(user: User, objectUri: string) {
    const response = await ky
      .post(`${user.endpoint}/api/followable/follow`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: {
          objectUri,
          recursionLimit: 1,
          requireFollowersCollection: true
        },
        timeout: DEFAULT_TIMEOUT
      })
      .json()
    return response
  }

  /**
   * Verify all rel=me metadata links on the authenticated actor profile.
   * Read-only call; safe to retry on transient failures.
   */
  static async verifyActorMetadata(user: User, actorUri?: string) {
    const payload = actorUri ? { actorUri } : {}
    const response = await ky.post(`${user.endpoint}/api/actor-metadata/verify`, {
      headers: { Authorization: `Bearer ${user.token}` },
      json: payload,
      retry: SAFE_RETRY,
      timeout: DEFAULT_TIMEOUT
    })
    const text = await response.text()
    if (!text.trim()) return null
    return JSON.parse(text)
  }

  /**
   * Verify a single rel=me link for the authenticated actor profile.
   * Read-only call; safe to retry on transient failures.
   */
  static async verifyRelMeLink(user: User, href: string, actorUri?: string) {
    const payload = actorUri ? { href, actorUri } : { href }
    return ky
      .post(`${user.endpoint}/api/actor-metadata/verify-link`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: payload,
        retry: SAFE_RETRY,
        timeout: DEFAULT_TIMEOUT
      })
      .json()
  }

  /**
   * FEP-f228 conversation backfill helper:
   *   1) contextHistory (activities collection)
   *   2) context       (posts collection)
   *   3) replies       (recursive fallback)
   */
  static async fetchConversationBackfill(user: User, objectUri: string): Promise<ConversationBackfillResult> {
    const normalizedObjectUri = objectUri.trim()
    if (!isHttpUrl(normalizedObjectUri)) {
      throw new Error('objectUri must be an absolute http(s) URL')
    }

    const root = await this.fetchActivityPubJson(user, normalizedObjectUri)
    const noteObject = extractNoteLikeObject(root)
    if (!noteObject) {
      return { mode: 'none', root, activities: [], posts: [] }
    }

    const contextHistoryUri =
      extractUriLike((root as Record<string, unknown>).contextHistory) ??
      extractUriLike((noteObject as Record<string, unknown>).contextHistory)
    if (contextHistoryUri) {
      const activities = await this.fetchOrderedCollectionItems(user, contextHistoryUri)
      return { mode: 'contextHistory', root, activities, posts: [] }
    }

    const contextUri =
      extractUriLike((root as Record<string, unknown>).context) ??
      extractUriLike((noteObject as Record<string, unknown>).context)
    if (contextUri) {
      const contextDoc = await this.fetchActivityPubJson(user, contextUri).catch(() => null)
      const historyViaContext = contextDoc ? extractHistoryCollectionUri(contextDoc) : null
      if (historyViaContext) {
        const activities = await this.fetchOrderedCollectionItems(user, historyViaContext)
        return { mode: 'contextHistory', root, activities, posts: [] }
      }

      const posts = await this.fetchOrderedCollectionItems(user, contextUri)
      return { mode: 'context', root, activities: [], posts }
    }

    const repliesUri = extractUriLike((noteObject as Record<string, unknown>).replies)
    if (!repliesUri) {
      return { mode: 'none', root, activities: [], posts: [] }
    }

    const posts = await this.fetchRecursiveReplies(user, repliesUri, {
      maxDepth: 4,
      maxItems: 300,
      maxPagesPerCollection: 10
    })
    return { mode: 'replies', root, activities: [], posts }
  }

  private static async fetchActivityPubJson(user: User, url: string): Promise<Record<string, unknown>> {
    if (!isAllowedRemoteFetchUrl(url)) {
      throw new Error('Blocked unsafe ActivityPub fetch URL')
    }

    const response = await ky
      .get(url, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          Accept: 'application/activity+json, application/ld+json, application/json;q=0.9'
        },
        retry: SAFE_RETRY,
        timeout: DEFAULT_TIMEOUT
      })

    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '', 10)
    if (Number.isFinite(contentLength) && contentLength > MAX_ACTIVITYPUB_RESPONSE_BYTES) {
      throw new Error('ActivityPub response exceeds configured size limit')
    }

    const bodyText = await response.text()
    if (Buffer.byteLength(bodyText, 'utf8') > MAX_ACTIVITYPUB_RESPONSE_BYTES) {
      throw new Error('ActivityPub response exceeds configured size limit')
    }

    const responseJson = JSON.parse(bodyText) as unknown

    if (!responseJson || typeof responseJson !== 'object' || Array.isArray(responseJson)) {
      throw new Error('Expected an ActivityPub JSON object response')
    }

    return responseJson as Record<string, unknown>
  }

  private static async fetchOrderedCollectionItems(
    user: User,
    collectionUri: string,
    options: { maxPages?: number; maxItems?: number } = {}
  ): Promise<Record<string, unknown>[]> {
    const maxPages = Math.max(1, options.maxPages ?? 10)
    const maxItems = Math.max(1, options.maxItems ?? 300)
    const items: Record<string, unknown>[] = []

    const firstDoc = await this.fetchActivityPubJson(user, collectionUri)
    if (!looksLikeCollection(firstDoc)) {
      return items
    }

    const ingestUris = async (doc: Record<string, unknown>) => {
      for (const itemUri of extractCollectionItemUris(doc)) {
        if (items.length >= maxItems) return
        const item = await this.fetchActivityPubJson(user, itemUri).catch(() => null)
        if (item) items.push(item)
      }
    }

    await ingestUris(firstDoc)
    let nextUri = extractPageUri(firstDoc, 'first') ?? extractPageUri(firstDoc, 'next')
    let pageCount = 0

    while (nextUri && pageCount < maxPages && items.length < maxItems) {
      const page = await this.fetchActivityPubJson(user, nextUri)
      await ingestUris(page)
      nextUri = extractPageUri(page, 'next')
      pageCount += 1
    }

    return items
  }

  private static async fetchRecursiveReplies(
    user: User,
    repliesUri: string,
    options: { maxDepth: number; maxItems: number; maxPagesPerCollection: number }
  ): Promise<Record<string, unknown>[]> {
    const results: Record<string, unknown>[] = []
    const visitedCollections = new Set<string>()

    const walk = async (collectionUri: string, depth: number): Promise<void> => {
      if (depth > options.maxDepth || results.length >= options.maxItems) return
      if (visitedCollections.has(collectionUri)) return
      visitedCollections.add(collectionUri)

      const posts = await this.fetchOrderedCollectionItems(user, collectionUri, {
        maxItems: options.maxItems - results.length,
        maxPages: options.maxPagesPerCollection
      })

      for (const post of posts) {
        if (results.length >= options.maxItems) break
        results.push(post)

        const nestedRepliesUri = extractUriLike((post as Record<string, unknown>).replies)
        if (nestedRepliesUri) {
          await walk(nestedRepliesUri, depth + 1)
        }
      }
    }

    await walk(repliesUri, 0)
    return results
  }
}
