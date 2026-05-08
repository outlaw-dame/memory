import { passesSafeBrowsing } from '../utils/safeBrowsing'

const PREVIEW_CACHE_TTL_MS = 15 * 60 * 1000
const MAX_HTML_BYTES = 256_000
const NETWORK_TIMEOUT_MS = 4500

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

const PRIVATE_IP_PATTERN = /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(1[89])\.|192\.0\.[02]\.|192\.88\.99\.|203\.0\.113\.|224\.|2[3-5]\d\.)/

// Detect a hostname that is a bare IPv4 / IPv6 / decimal-encoded IP we should reject.
// (Bare numeric hostnames that resolve to private space, e.g. http://2130706433/ → 127.0.0.1.)
const NUMERIC_HOSTNAME = /^(0x[0-9a-f]+|[0-9]+)$/i

function isBlockedIpv6(host: string): boolean {
  // URL parser strips the surrounding [] — sanitize and lower-case.
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h.includes(':')) return false
  if (h === '::' || h === '::1') return true // unspecified, loopback
  if (h.startsWith('fe80:') || h.startsWith('fe80::')) return true // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true // unique local fc00::/7
  if (h.startsWith('ff')) return true // multicast
  if (h.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — treat embedded address conservatively.
    return true
  }
  return false
}

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

export function sanitizeHttpUrl(raw: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('url must be a non-empty string')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error('url must be an absolute URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('only http(s) URLs are supported')
  }

  if (parsed.username || parsed.password) {
    throw new Error('URL credentials are not allowed')
  }

  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === '[::1]' || host === '[::]') {
    throw new Error('private or local addresses are not allowed')
  }
  if (PRIVATE_IP_PATTERN.test(host)) {
    throw new Error('private or local addresses are not allowed')
  }
  if (isBlockedIpv6(host)) {
    throw new Error('private or local addresses are not allowed')
  }
  if (NUMERIC_HOSTNAME.test(host)) {
    // Reject decimal/hex IP encodings that bypass dotted-quad checks.
    throw new Error('numeric host encodings are not allowed')
  }

  return parsed.toString()
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

export async function fetchLinkPreview(inputUrl: string): Promise<LinkPreviewResult> {
  const url = sanitizeHttpUrl(inputUrl)
  const cached = cache.get(url)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  if (!(await passesSafeBrowsing(url))) {
    throw new Error('url failed safe browsing check')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'MemoryLinkPreviewBot/1.0 (+https://memory.local)'
      }
    })

    const finalUrl = sanitizeHttpUrl(response.url || url)

    // Re-check the post-redirect URL against Safe Browsing when it differs from the
    // submitted URL — redirects can land on a previously unchecked target.
    if (finalUrl !== url && !(await passesSafeBrowsing(finalUrl))) {
      throw new Error('url failed safe browsing check')
    }

    if (!response.ok) {
      throw new Error(`upstream returned status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.toLowerCase().includes('text/html')) {
      const preview = fallbackPreview(finalUrl)
      cache.set(url, { value: preview, expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS })
      return preview
    }

    const fullHtml = await response.text()
    const html = fullHtml.length > MAX_HTML_BYTES ? fullHtml.slice(0, MAX_HTML_BYTES) : fullHtml

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
    clearTimeout(timeout)
  }
}
