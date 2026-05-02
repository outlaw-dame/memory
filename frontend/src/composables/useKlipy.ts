/**
 * useKlipy — Klipy GIF API composable
 *
 * Wraps the Klipy GIFs API (https://api.klipy.com).
 * App key is read from VITE_KLIPY_APP_KEY.
 * customer_id should be a stable per-user identifier.
 */

const BASE = 'https://api.klipy.com'
const APP_KEY = import.meta.env.VITE_KLIPY_APP_KEY as string

function resolveKlipyAppKey(): string {
  const key = typeof APP_KEY === 'string' ? APP_KEY.trim() : ''
  return key
}

function assertConfigured(appKey: string): void {
  if (!appKey) {
    throw new Error('Klipy API key is missing. Set VITE_KLIPY_APP_KEY.')
  }
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

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function klipyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
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

  /**
   * Trending GIFs — updated throughout the day.
   */
  async function trending(page = 1, perPage = 24): Promise<KlipyPage> {
    assertConfigured(appKey)
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      customer_id: customerId,
      format_filter: 'webp,gif',
    })
    return klipyFetch<KlipyPage>(`/api/v1/${appKey}/gifs/trending?${params}`)
  }

  /**
   * Search GIFs by keyword.
   */
  async function search(q: string, page = 1, perPage = 24): Promise<KlipyPage> {
    assertConfigured(appKey)
    const params = new URLSearchParams({
      q,
      page: String(page),
      per_page: String(perPage),
      customer_id: customerId,
      format_filter: 'webp,gif',
      content_filter: 'medium',
    })
    return klipyFetch<KlipyPage>(`/api/v1/${appKey}/gifs/search?${params}`)
  }

  /**
   * Recently used GIFs for this customer.
   */
  async function recent(page = 1, perPage = 24): Promise<KlipyPage> {
    assertConfigured(appKey)
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    })
    return klipyFetch<KlipyPage>(`/api/v1/${appKey}/gifs/recent/${customerId}?${params}`)
  }

  /**
   * GIF categories / browse tags.
   */
  async function categories(locale?: string): Promise<KlipyCategory[]> {
    assertConfigured(appKey)
    const params = locale ? `?locale=${locale}` : ''
    const result = await klipyFetch<KlipyCategory[]>(`/api/v1/${appKey}/gifs/categories${params}`)
    return Array.isArray(result) ? result : []
  }

  /**
   * Track a GIF share (call when user inserts a GIF into a post).
   * Fire-and-forget — errors are silently swallowed.
   */
  async function trackShare(slug: string): Promise<void> {
    if (!appKey) return
    try {
      await fetch(`${BASE}/api/v1/${appKey}/gifs/share/${slug}`, { method: 'POST' })
    } catch {
      // non-critical
    }
  }

  /**
   * Remove a GIF from the user's recent history.
   */
  async function removeRecent(slug: string): Promise<void> {
    assertConfigured(appKey)
    const params = new URLSearchParams({ slug })
    await fetch(
      `${BASE}/api/v1/${appKey}/gifs/recent/${customerId}?${params}`,
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
