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
  methods: ['post'],
  statusCodes: [429, 500, 502, 503, 504],
  backoffLimit: 10_000
}

/**
 * Default request timeout for all pod-server calls (10 s).
 * Prevents zombie connections when the pod server is unresponsive.
 */
const DEFAULT_TIMEOUT = 10_000

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

  static async getProfile(user: User) {
    return ky
      .get(user.getWebId(), {
        headers: {
          Authorization: `Bearer ${user.token}`,
          Accept: 'application/ld+json, application/json;q=0.9'
        },
        retry: SAFE_RETRY,
        timeout: DEFAULT_TIMEOUT
      })
      .json<any>()
  }

  static async updateProfile(user: User, actor: Record<string, unknown>) {
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
    return ky
      .post(`${user.endpoint}/api/reply-policies/reply`, {
        headers: { Authorization: `Bearer ${user.token}` },
        json: { objectUri, content, isPublic },
        timeout: DEFAULT_TIMEOUT
        // No retry: not idempotent.
      })
      .json()
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
}
