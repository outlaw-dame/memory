export const ATTRIBUTION_DOMAIN_LIMIT = 10

function toArray<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value != null ? [value] : []
}

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, '')}`

  try {
    const parsed = new URL(candidate)
    if (parsed.username || parsed.password || !parsed.hostname) return null
    return parsed.hostname.toLowerCase().replace(/\.+$/, '') || null
  } catch {
    return null
  }
}

function parseDomains(value: unknown): { domains: string[]; invalid: boolean } {
  const domains: string[] = []
  let invalid = false

  for (const item of toArray(value)) {
    if (item == null) continue
    if (typeof item !== 'string') {
      invalid = true
      continue
    }

    const trimmed = item.trim()
    if (!trimmed) continue

    const normalized = normalizeDomain(trimmed)
    if (!normalized) {
      invalid = true
      continue
    }

    domains.push(normalized)
  }

  return {
    domains: [...new Set(domains)],
    invalid
  }
}

export function parseActorAttributionDomains(actor: unknown): string[] {
  if (!actor || typeof actor !== 'object' || Array.isArray(actor)) return []
  return parseDomains((actor as Record<string, unknown>).attributionDomains).domains
}

export function validateAttributionDomains(domains: string[]): string | null {
  const parsed = parseDomains(domains)
  if (parsed.invalid) return 'settings.profile.authorAttribution.errors.invalidDomain'
  if (parsed.domains.length > ATTRIBUTION_DOMAIN_LIMIT) {
    return 'settings.profile.authorAttribution.errors.tooMany'
  }
  return null
}

export function buildAttributionDomainsPayload(domains: string[]): string[] | undefined {
  const parsed = parseDomains(domains)
  if (parsed.domains.length === 0) return undefined
  return parsed.domains
}
