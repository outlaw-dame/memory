import { sanitizeHttpUrl as sharedSanitizeHttpUrl } from '../utils/urlGuards'
import { secureFetch } from '../utils/secureFetch'

const PREVIEW_CACHE_TTL_MS = 15 * 60 * 1000
const MAX_HTML_BYTES = 256_000
const NETWORK_TIMEOUT_MS = 4500

/**
 * Re-export the shared sanitizer under the legacy name so existing
 * tests/imports keep working. The synchronous guard semantics are identical.
 */
export function sanitizeHttpUrl(raw: string): string {
  return sharedSanitizeHttpUrl(raw)
}

export interface LinkPreviewResult {
  url: string
  title: string
  description?: string
  image?: string
  domain: string
  authorName?: string
  authorUrl?: string
}

type CacheEntry = {
  value: LinkPreviewResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function sanitizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = normalizeWhitespace(decodeEntities(value))
  return normalized.length > 0 ? normalized : null
}

function readMeta(html: string, key: string, attr: 'property' | 'name' = 'property'): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`<meta[^>]+${attr}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i')
  const reverseRegex = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${escaped}["'][^>]*>`, 'i')
  const match = html.match(regex) || html.match(reverseRegex)
  return sanitizeText(match?.[1])
}

function readTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return sanitizeText(match?.[1])
}

function resolveRelativeUrl(candidate: string | null, base: string): string | null {
  if (!candidate) return null
  try {
    const resolved = new URL(candidate, base)
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null
    return resolved.toString()
  } catch {
    return null
  }
}

function inferDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function fallbackPreview(url: string): LinkPreviewResult {
  return {
    url,
    title: inferDomain(url),
    domain: inferDomain(url),
  }
}

async function readCappedTextBody(response: Response, maxBytes: number): Promise<string> {
  const body = response.body
  if (!body) return ''

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done || !value) break

      if (bytesRead >= maxBytes) {
        break
      }

      const remaining = maxBytes - bytesRead
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value
      text += decoder.decode(chunk, { stream: true })
      bytesRead += chunk.byteLength

      if (chunk.byteLength < value.byteLength) {
        break
      }
    }
  } finally {
    try { await reader.cancel() } catch { /* ignore */ }
  }

  text += decoder.decode()
  return text
}

export async function fetchLinkPreview(inputUrl: string): Promise<LinkPreviewResult> {
  const url = sanitizeHttpUrl(inputUrl)
  const cached = cache.get(url)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  // `secureFetch` runs sanitize → DNS-public-resolution → Safe Browsing on
  // the initial URL and on every redirect hop, so we don't repeat those
  // checks here.
  const { response, finalUrl } = await secureFetch(url, {
    method: 'GET',
    timeoutMs: NETWORK_TIMEOUT_MS,
    headers: {
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'MemoryLinkPreviewBot/1.0 (+https://memory.local)'
    },
  })

  try {
    if (!response.ok) {
      throw new Error(`upstream returned status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('text/html')) {
      const preview = fallbackPreview(finalUrl)
      cache.set(url, { value: preview, expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS })
      return preview
    }

    const html = await readCappedTextBody(response, MAX_HTML_BYTES)

    const title = readMeta(html, 'og:title')
      || readMeta(html, 'twitter:title', 'name')
      || readTitle(html)
      || inferDomain(finalUrl)

    const description = readMeta(html, 'og:description')
      || readMeta(html, 'twitter:description', 'name')
      || readMeta(html, 'description', 'name')
      || undefined

    const image = resolveRelativeUrl(
      readMeta(html, 'og:image')
        || readMeta(html, 'twitter:image', 'name'),
      finalUrl,
    ) || undefined

    const authorName = readMeta(html, 'article:author')
      || readMeta(html, 'author', 'name')
      || undefined

    const authorUrl = resolveRelativeUrl(readMeta(html, 'article:author:url'), finalUrl) || undefined

    const preview: LinkPreviewResult = {
      url: finalUrl,
      title,
      ...(description ? { description } : {}),
      ...(image ? { image } : {}),
      domain: inferDomain(finalUrl),
      ...(authorName ? { authorName } : {}),
      ...(authorUrl ? { authorUrl } : {}),
    }

    cache.set(url, {
      value: preview,
      expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
    })

    return preview
  } finally {
    // Drain any remaining body so the connection is released.
    try { await response.body?.cancel() } catch { /* ignore */ }
  }
}
