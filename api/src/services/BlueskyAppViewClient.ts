const DEFAULT_PUBLIC_APPVIEW_ORIGIN = 'https://public.api.bsky.app'
const DEFAULT_PRIVATE_APPVIEW_ORIGIN = 'https://api.bsky.app'
const DEFAULT_REQUEST_TIMEOUT_MS = 4000
const DEFAULT_MAX_RETRIES = 2
const DEFAULT_BATCH_SIZE = 25

const ALLOWED_PUBLIC_HOSTS = new Set(['public.api.bsky.app', 'api.bsky.app'])

export interface BlueskyProfileView {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  banner?: string
  followersCount?: number
  followsCount?: number
  postsCount?: number
}

export interface BlueskyAppViewClientOptions {
  publicOrigin?: string
  requestTimeoutMs?: number
  maxRetries?: number
  batchSize?: number
  fetchImpl?: typeof fetch
}

export interface BlueskyAppViewClientLogger {
  warn(message: string, meta?: Record<string, unknown>): void
}

const NOOP_LOGGER: BlueskyAppViewClientLogger = {
  warn: () => undefined,
}

function validateAllowedOrigin(raw: string | undefined, fallback: string): string {
  const value = raw?.trim() || fallback
  let url: URL
  try {
    url = new URL(value)
  } catch (err) {
    throw new Error(`Invalid Bluesky AppView origin: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (url.protocol !== 'https:') throw new Error('Bluesky AppView origin must use https://')
  if (url.username || url.password) throw new Error('Bluesky AppView origin must not include credentials')
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Bluesky AppView origin must not include path, query, or fragment')
  }
  if (!ALLOWED_PUBLIC_HOSTS.has(url.hostname)) {
    throw new Error(`Bluesky AppView host is not allowed: ${url.hostname}`)
  }

  return url.origin
}

function parsePositiveInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function uniqueDids(dids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const did of dids) {
    const trimmed = did.trim()
    if (!trimmed.startsWith('did:') || seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
  }
  return result
}

function backoffDelayMs(attempt: number): number {
  return Math.min(1500, 200 * (2 ** attempt) + Math.floor(Math.random() * 75))
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

export class BlueskyAppViewClient {
  private readonly publicXrpcBase: string
  private readonly requestTimeoutMs: number
  private readonly maxRetries: number
  private readonly batchSize: number
  private readonly fetchImpl: typeof fetch

  constructor(
    options: BlueskyAppViewClientOptions = {},
    private readonly logger: BlueskyAppViewClientLogger = NOOP_LOGGER,
  ) {
    const origin = validateAllowedOrigin(options.publicOrigin, DEFAULT_PUBLIC_APPVIEW_ORIGIN)
    this.publicXrpcBase = `${origin}/xrpc`
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env, logger?: BlueskyAppViewClientLogger): BlueskyAppViewClient {
    return new BlueskyAppViewClient({
      publicOrigin: env.BSKY_PUBLIC_APPVIEW_ORIGIN || env.BSKY_APPVIEW_ORIGIN || DEFAULT_PUBLIC_APPVIEW_ORIGIN,
      requestTimeoutMs: parsePositiveInteger(env.BSKY_APPVIEW_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS, 500, 15000),
      maxRetries: parsePositiveInteger(env.BSKY_APPVIEW_MAX_RETRIES, DEFAULT_MAX_RETRIES, 0, 5),
      batchSize: parsePositiveInteger(env.BSKY_APPVIEW_PROFILE_BATCH_SIZE, DEFAULT_BATCH_SIZE, 1, 25),
    }, logger)
  }

  static defaultPrivateOrigin(): string {
    return DEFAULT_PRIVATE_APPVIEW_ORIGIN
  }

  async getProfiles(dids: string[]): Promise<BlueskyProfileView[]> {
    const actors = uniqueDids(dids)
    if (actors.length === 0) return []

    const profiles: BlueskyProfileView[] = []
    for (let i = 0; i < actors.length; i += this.batchSize) {
      const batch = actors.slice(i, i + this.batchSize)
      const params = batch.map(did => `actors[]=${encodeURIComponent(did)}`).join('&')
      const data = await this.getJson<{ profiles?: BlueskyProfileView[] }>(`/app.bsky.actor.getProfiles?${params}`)
      for (const profile of data.profiles ?? []) {
        if (profile?.did && profile.handle) profiles.push(profile)
      }
    }
    return profiles
  }

  private async getJson<T>(pathAndQuery: string): Promise<T> {
    const url = `${this.publicXrpcBase}${pathAndQuery}`
    let lastError: unknown = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs)
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        clearTimeout(timeout)

        if (!response.ok) {
          if (attempt < this.maxRetries && isRetryableStatus(response.status)) {
            await delay(backoffDelayMs(attempt))
            continue
          }
          throw new Error(`Bluesky AppView request failed with HTTP ${response.status}`)
        }

        return await response.json() as T
      } catch (err) {
        clearTimeout(timeout)
        lastError = err
        if (attempt >= this.maxRetries) break
        await delay(backoffDelayMs(attempt))
      }
    }

    this.logger.warn('Bluesky AppView request exhausted retries', {
      path: pathAndQuery.split('?')[0],
      error: lastError instanceof Error ? lastError.message : String(lastError),
    })
    throw lastError instanceof Error ? lastError : new Error('Bluesky AppView request failed')
  }
}
