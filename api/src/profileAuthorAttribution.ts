const MAX_ATTRIBUTION_DOMAINS = 10
const MAX_DOMAIN_LENGTH = 255

type ActorRecord = Record<string, unknown>

export class ProfileAuthorAttributionValidationError extends Error {
  constructor(public readonly translationKey: string) {
    super(translationKey)
    this.name = 'ProfileAuthorAttributionValidationError'
  }
}

function asActorRecord(value: unknown): ActorRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ActorRecord) : null
}

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
    const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '')
    if (!hostname || hostname.length > MAX_DOMAIN_LENGTH) return null
    return hostname
  } catch {
    return null
  }
}

function getRawAttributionDomains(
  actor: ActorRecord,
): { explicit: boolean; value: unknown } {
  if (Object.prototype.hasOwnProperty.call(actor, 'attributionDomains')) {
    return { explicit: true, value: actor.attributionDomains }
  }

  return { explicit: false, value: undefined }
}

function parseNormalizedDomains(value: unknown): { domains: string[]; invalid: boolean } {
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

function extractExistingDomains(actor: unknown): string[] {
  const record = asActorRecord(actor)
  if (!record) return []
  return parseNormalizedDomains(record.attributionDomains).domains
}

export function normalizeProfileAuthorAttribution(
  actor: ActorRecord,
  options: {
    existingActor?: unknown
  } = {}
): ActorRecord {
  const nextActor: ActorRecord = { ...actor }
  const { explicit, value } = getRawAttributionDomains(actor)

  if (!explicit) {
    const existingDomains = extractExistingDomains(options.existingActor)
    if (existingDomains.length > 0) {
      nextActor.attributionDomains = existingDomains
    } else {
      delete nextActor.attributionDomains
    }
    return nextActor
  }

  const parsed = parseNormalizedDomains(value)
  if (parsed.invalid) {
    throw new ProfileAuthorAttributionValidationError('profile.attributionDomainsInvalid')
  }
  if (parsed.domains.length > MAX_ATTRIBUTION_DOMAINS) {
    throw new ProfileAuthorAttributionValidationError('profile.attributionDomainsTooMany')
  }

  if (parsed.domains.length > 0) {
    nextActor.attributionDomains = parsed.domains
  } else {
    delete nextActor.attributionDomains
  }

  return nextActor
}

export function getAttributionDomainLimit(): number {
  return MAX_ATTRIBUTION_DOMAINS
}
