export const HASHTAG_RE = /(^|\s)(#[A-Za-z0-9][A-Za-z0-9_]*)/g

export interface TextSegment {
  type: 'text' | 'hashtag'
  value: string
}

export function normalizeHashtag(value: string): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('#')) return null
  const body = trimmed.slice(1)
  if (!/^[A-Za-z0-9][A-Za-z0-9_]*$/.test(body)) return null
  return `#${body.toLowerCase()}`
}

export function splitTextWithHashtags(text: string): TextSegment[] {
  if (!text) return [{ type: 'text', value: '' }]

  const segments: TextSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = HASHTAG_RE.exec(text)) !== null) {
    const leading = match[1] ?? ''
    const hashtag = match[2] ?? ''
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
