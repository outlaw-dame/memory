function sanitizeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null

  try {
    const parsed = new URL(value)
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

export function deriveArticleCanonicalUrl(objectUri: string | null | undefined): string | null {
  const normalized = sanitizeHttpUrl(objectUri)
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    const match = parsed.pathname.match(/^\/posts\/([^/]+)\/?$/)
    if (!match?.[1]) return null
    return `${parsed.origin}/posts/${match[1]}/share`
  } catch {
    return null
  }
}
