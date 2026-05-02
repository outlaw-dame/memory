import type { LinkPreviewData } from '@/components/PostLinkPreview.vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'

type CacheEntry = {
  value: LinkPreviewData | null
  expiresAt: number
}

const CACHE_TTL_MS = 15 * 60 * 1000
const cache = new Map<string, CacheEntry>()

const URL_PATTERN = /(https?:\/\/[^\s<>")]+[^\s<>,.!?;:")])/i

export function extractFirstHttpUrl(text: string): string | null {
  if (typeof text !== 'string' || text.trim().length === 0) return null
  const match = text.match(URL_PATTERN)
  return match?.[1] ?? null
}

function normalizePreview(value: unknown): LinkPreviewData | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  if (typeof record.url !== 'string' || typeof record.title !== 'string') return null

  const preview: LinkPreviewData = {
    url: record.url,
    title: record.title,
  }

  if (typeof record.description === 'string') preview.description = record.description
  if (typeof record.image === 'string') preview.image = record.image
  if (typeof record.domain === 'string') preview.domain = record.domain
  if (typeof record.authorName === 'string') preview.authorName = record.authorName
  if (typeof record.authorUrl === 'string') preview.authorUrl = record.authorUrl

  return preview
}

export async function fetchLinkPreview(url: string, authToken?: string | null): Promise<LinkPreviewData | null> {
  if (typeof url !== 'string' || url.trim().length === 0) return null

  const cached = cache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/link-preview?url=${encodeURIComponent(url)}`,
      {
        method: 'GET',
        headers: buildApiHeaders({
          authToken: authToken || undefined,
          includeJsonContentType: false,
        }),
      },
    )

    if (!response.ok) {
      cache.set(url, { value: null, expiresAt: Date.now() + 60_000 })
      return null
    }

    const payload = await response.json()
    const normalized = normalizePreview(payload)
    cache.set(url, { value: normalized, expiresAt: Date.now() + CACHE_TTL_MS })
    return normalized
  } catch {
    cache.set(url, { value: null, expiresAt: Date.now() + 60_000 })
    return null
  }
}
