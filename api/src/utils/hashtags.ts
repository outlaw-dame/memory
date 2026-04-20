const HASHTAG_RE = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_][\p{L}\p{N}_]{0,63})/gu

export interface ActivityPubHashtagTag {
  type: 'Hashtag'
  name: string
  href: string
}

export function normalizeHashtag(value: string): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  const match = withHash.match(/^#([\p{L}\p{N}_][\p{L}\p{N}_]{0,63})$/u)
  if (!match) return null

  return `#${match[1].toLowerCase()}`
}

export function extractHashtagsFromText(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return []

  const hashtags = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = HASHTAG_RE.exec(text)) !== null) {
    const token = match[2]
    const normalized = normalizeHashtag(`#${token}`)
    if (normalized) hashtags.add(normalized)
  }

  return [...hashtags]
}

export function extractHashtagsFromFacets(facets: unknown): string[] {
  if (!Array.isArray(facets)) return []

  const hashtags = new Set<string>()

  for (const facet of facets) {
    if (!facet || typeof facet !== 'object') continue

    const features = (facet as Record<string, unknown>).features
    if (!Array.isArray(features)) continue

    for (const feature of features) {
      if (!feature || typeof feature !== 'object') continue

      const tag = (feature as Record<string, unknown>).tag
      const normalized = normalizeHashtag(tag)
      if (normalized) hashtags.add(normalized)
    }
  }

  return [...hashtags]
}

export function mergeHashtags(content: string, hashtags?: string[] | null): string[] {
  const merged = new Set<string>()

  for (const tag of extractHashtagsFromText(content)) merged.add(tag)

  if (Array.isArray(hashtags)) {
    for (const tag of hashtags) {
      const normalized = normalizeHashtag(tag)
      if (normalized) merged.add(normalized)
    }
  }

  return [...merged]
}

export function toActivityPubHashtagTags(hashtags: string[], endpoint: string): ActivityPubHashtagTag[] {
  if (!Array.isArray(hashtags) || hashtags.length === 0) return []

  const base = endpoint.replace(/\/+$/, '')

  return hashtags.map(tag => ({
    type: 'Hashtag',
    name: tag,
    href: `${base}/tags/${encodeURIComponent(tag.slice(1))}`,
  }))
}