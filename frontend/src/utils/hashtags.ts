export const HASHTAG_RE = /(^|[^\p{L}\p{N}_])#([\p{L}\p{N}_][\p{L}\p{N}_]{0,63})/gu

export interface TextSegment {
  type: 'text' | 'hashtag'
  value: string
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

export function splitTextWithHashtags(text: string): TextSegment[] {
  if (!text) return [{ type: 'text', value: '' }]

  const segments: TextSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = HASHTAG_RE.exec(text)) !== null) {
    const leading = match[1] ?? ''
    const hashtag = `#${match[2] ?? ''}`
    const absoluteStart = match.index + leading.length

    if (absoluteStart > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, absoluteStart) })
    }

    segments.push({ type: 'hashtag', value: hashtag })
    lastIndex = absoluteStart + hashtag.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

export function parseHashtagInput(value: string): string[] {
  if (typeof value !== 'string' || value.trim().length === 0) return []

  const normalized = new Set<string>()
  const parts = value.split(/[\s,]+/)
  for (const part of parts) {
    const tag = normalizeHashtag(part.startsWith('#') ? part : `#${part}`)
    if (tag) normalized.add(tag)
  }

  return [...normalized]
}
