/**
 * useKlipy — Klipy GIF API composable
 *
 * Wraps the Klipy GIFs API (https://api.klipy.com).
 * App key is read from VITE_KLIPY_APP_KEY.
 * customer_id should be a stable per-user identifier.
 */

const BASE = 'https://api.klipy.com'
const APP_KEY = import.meta.env.VITE_KLIPY_APP_KEY as string
const REQUEST_TIMEOUT_MS = 8_000
const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 250

function resolveKlipyAppKey(): string {
  const key = typeof APP_KEY === 'string' ? APP_KEY.trim() : ''
  return key
}

function assertConfigured(appKey: string): void {
  if (!appKey) {
    throw new Error('Klipy API key is missing. Set VITE_KLIPY_APP_KEY.')
  }
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value.trim())
}

function normalizePage(value: number): string {
  return String(Number.isFinite(value) && value > 0 ? Math.floor(value) : 1)
}

function normalizePerPage(value: number, max = 50, min = 1): string {
  const normalized = Number.isFinite(value) && value > 0 ? Math.floor(value) : 24
  return String(Math.min(Math.max(normalized, min), max))
}

function isRetryableKlipyStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function klipyRequest(path: string, options?: RequestInit): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${BASE}${path}`, {
        ...options,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })

      if (!isRetryableKlipyStatus(response.status) || attempt === MAX_RETRIES) {
        return response
      }

      lastError = new Error(`Klipy API retryable status: ${response.status}`)
    } catch (error) {
      lastError = error
      if (attempt === MAX_RETRIES) {
        throw error
      }
    } finally {
      clearTimeout(timeout)
    }

    const backoffMs = RETRY_BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 100)
    await delay(backoffMs)
  }

  throw lastError instanceof Error ? lastError : new Error('Klipy API request failed')
}

export function isKlipyConfigured(): boolean {
  return resolveKlipyAppKey().length > 0
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KlipyMedia {
  url: string
  width: number
  height: number
  size: number
}

export interface KlipyFileTier {
  gif?: KlipyMedia
  webp?: KlipyMedia
  jpg?: KlipyMedia
  mp4?: KlipyMedia
  webm?: KlipyMedia
}

export interface KlipyGif {
  id: number
  slug: string
  title: string
  type: string
  tags: string[]
  blur_preview: string
  file: {
    hd: KlipyFileTier
    md: KlipyFileTier
    sm: KlipyFileTier
    xs: KlipyFileTier
  }
}

export interface KlipyPage {
  data: KlipyGif[]
  current_page: number
  per_page: number
  has_next: boolean
}

export interface KlipyCategory {
  slug: string
  title: string
  preview?: string
}

interface KlipyCategoriesEnvelope {
  locale?: string
  categories?: Array<{
    category?: string
    query?: string
    preview_url?: string
  }>
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function klipyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await klipyRequest(path, options)
  if (!res.ok) throw new Error(`Klipy API error: ${res.status}`)
  const json = await res.json()
  // Trending/search/recent/items wrap in { result, data: { data, ... } }
  // Categories return { result, data: [...] }
  return json.data as T
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useKlipy(customerId: string) {
  const appKey = resolveKlipyAppKey()
  const encodedAppKey = encodePathSegment(appKey)
  const encodedCustomerId = encodePathSegment(customerId || 'guest')

  /**
   * Trending GIFs — updated throughout the day.
   */
  async function trending(page = 1, perPage = 24): Promise<KlipyPage> {
    assertConfigured(appKey)
    const params = new URLSearchParams({
      page: normalizePage(page),
      per_page: normalizePerPage(perPage),
      customer_id: customerId,
      format_filter: 'webp,gif',
    })
    return klipyFetch<KlipyPage>(`/api/v1/${encodedAppKey}/gifs/trending?${params}`)
  }

  /**
   * Search GIFs by keyword.
   */
  async function search(q: string, page = 1, perPage = 24): Promise<KlipyPage> {
    assertConfigured(appKey)
    const params = new URLSearchParams({
      q: q.trim(),
      page: normalizePage(page),
      per_page: normalizePerPage(perPage, 50, 8),
      customer_id: customerId,
      format_filter: 'webp,gif',
      content_filter: 'medium',
    })
    return klipyFetch<KlipyPage>(`/api/v1/${encodedAppKey}/gifs/search?${params}`)
  }

  /**
   * Recently used GIFs for this customer.
   */
  async function recent(page = 1, perPage = 24): Promise<KlipyPage> {
    assertConfigured(appKey)
    const params = new URLSearchParams({
      page: normalizePage(page),
      per_page: normalizePerPage(perPage, 32),
    })
    return klipyFetch<KlipyPage>(`/api/v1/${encodedAppKey}/gifs/recent/${encodedCustomerId}?${params}`)
  }

  /**
   * GIF categories / browse tags.
   */
  async function categories(locale?: string): Promise<KlipyCategory[]> {
    assertConfigured(appKey)
    const normalizedLocale = typeof locale === 'string' ? locale.trim() : ''
    const params = normalizedLocale ? `?${new URLSearchParams({ locale: normalizedLocale })}` : ''
    const result = await klipyFetch<KlipyCategoriesEnvelope>(`/api/v1/${encodedAppKey}/gifs/categories${params}`)
    const items = Array.isArray(result?.categories) ? result.categories : []
    return items
      .map(item => {
        const label = typeof item.category === 'string' && item.category.trim().length > 0
          ? item.category.trim()
          : (typeof item.query === 'string' && item.query.trim().length > 0 ? item.query.trim() : null)
        if (!label) return null

        const normalized: KlipyCategory = {
          slug: (typeof item.query === 'string' && item.query.trim().length > 0 ? item.query.trim() : label),
          title: label,
        }

        if (typeof item.preview_url === 'string') {
          normalized.preview = item.preview_url
        }

        return normalized
      })
      .filter((item): item is KlipyCategory => item !== null)
  }

  /**
   * Track a GIF share (call when user inserts a GIF into a post).
   * Fire-and-forget — errors are silently swallowed.
   */
  async function trackShare(slug: string, q?: string): Promise<void> {
    if (!appKey) return
    const normalizedSlug = slug.trim()
    if (!normalizedSlug) return
    try {
      await klipyRequest(`/api/v1/${encodedAppKey}/gifs/share/${encodePathSegment(normalizedSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          ...(typeof q === 'string' && q.trim().length > 0 ? { q: q.trim() } : {}),
        }),
      })
    } catch {
      // non-critical
    }
  }

  /**
   * Remove a GIF from the user's recent history.
   */
  async function removeRecent(slug: string): Promise<void> {
    assertConfigured(appKey)
    const normalizedSlug = slug.trim()
    if (!normalizedSlug) return
    const params = new URLSearchParams({ slug: normalizedSlug })
    await klipyRequest(
      `/api/v1/${encodedAppKey}/gifs/recent/${encodedCustomerId}?${params}`,
      { method: 'DELETE' },
    )
  }

  return { trending, search, recent, categories, trackShare, removeRecent }
}

/**
 * Pick the best thumbnail URL for a KlipyGif.
 * Prefers sm.webp → sm.gif → md.webp → md.gif.
 */
export function getThumbUrl(gif: KlipyGif): string {
  return (
    gif.file.sm?.webp?.url ??
    gif.file.sm?.gif?.url ??
    gif.file.md?.webp?.url ??
    gif.file.md?.gif?.url ??
    ''
  )
}

/**
 * Pick the best full-size URL for embedding in a post.
 * Prefer GIF first so downstream pipelines can preserve GIF semantics.
 */
export function getEmbedUrl(gif: KlipyGif): string {
  return (
    gif.file.md?.gif?.url ??
    gif.file.md?.webp?.url ??
    gif.file.hd?.gif?.url ??
    ''
  )
}
