const AS_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public'
const SEARCHABLE_BY_IRI = 'http://fedibird.com/ns#searchableBy'
const TOOT_INDEXABLE_IRI = 'http://joinmastodon.org/ns#indexable'
const TOOT_INDEXABLE_SHORT = 'toot:indexable'

const AS_PUBLIC_ALIASES = new Set([AS_PUBLIC, 'as:Public', 'Public'])
const INDEXABLE_KEYS = ['indexable', TOOT_INDEXABLE_IRI, TOOT_INDEXABLE_SHORT] as const
const SEARCHABLE_BY_KEYS = ['searchableBy', SEARCHABLE_BY_IRI] as const

type ActorRecord = Record<string, unknown>

export class ProfileDiscoveryValidationError extends Error {
  constructor(public readonly translationKey: string) {
    super(translationKey)
    this.name = 'ProfileDiscoveryValidationError'
  }
}

function asActorRecord(value: unknown): ActorRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ActorRecord) : null
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value != null ? [value] : []
}

function normalizeIri(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return AS_PUBLIC_ALIASES.has(trimmed) ? AS_PUBLIC : trimmed
}

function extractUriFromNode(value: unknown): string | null {
  const direct = normalizeIri(value)
  if (direct) return direct

  const record = asActorRecord(value)
  if (!record) return null

  return normalizeIri(record.id ?? record['@id'] ?? record.href)
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
    return null
  }
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  return null
}

function getBooleanProperty(
  actor: ActorRecord | null,
  key: string,
  translationKey: string
): { explicit: boolean; value: boolean | null } {
  if (!actor || !Object.prototype.hasOwnProperty.call(actor, key)) {
    return { explicit: false, value: null }
  }

  const parsed = parseBoolean(actor[key])
  if (parsed === null) {
    throw new ProfileDiscoveryValidationError(translationKey)
  }

  return { explicit: true, value: parsed }
}

function getIndexableProperty(
  actor: ActorRecord | null
): { explicit: boolean; value: boolean | null } {
  if (!actor) return { explicit: false, value: null }

  for (const key of INDEXABLE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(actor, key)) continue

    const parsed = parseBoolean(actor[key])
    if (parsed === null) {
      throw new ProfileDiscoveryValidationError('profile.discoveryIndexableInvalid')
    }

    return { explicit: true, value: parsed }
  }

  return { explicit: false, value: null }
}

function resolveSearchableBy(value: unknown): string[] {
  const values = toArray(value)
    .map(entry => extractUriFromNode(entry))
    .filter((entry): entry is string => typeof entry === 'string')

  return [...new Set(values)]
}

function getSearchableBy(actor: ActorRecord | null): string[] {
  if (!actor) return []

  for (const key of SEARCHABLE_BY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(actor, key)) {
      return resolveSearchableBy(actor[key])
    }
  }

  return []
}

function setSearchableBy(actor: ActorRecord, searchableBy: string[]): void {
  delete actor[SEARCHABLE_BY_IRI]

  if (searchableBy.length === 0) {
    delete actor.searchableBy
    return
  }

  actor.searchableBy = searchableBy.length === 1 ? searchableBy[0] : searchableBy
}

function stripPublicSearchableBy(actor: ActorRecord): void {
  const searchableBy = getSearchableBy(actor).filter(value => value !== AS_PUBLIC)
  setSearchableBy(actor, searchableBy)
}

export function resolveActorIndexable(actor: unknown): boolean {
  const record = asActorRecord(actor)
  if (!record) return false

  const indexable = getIndexableProperty(record)
  if (indexable.explicit && indexable.value !== null) {
    return indexable.value
  }

  const noindex = getBooleanProperty(record, 'noindex', 'profile.discoveryNoindexInvalid')
  if (noindex.explicit && noindex.value !== null) {
    return !noindex.value
  }

  return getSearchableBy(record).includes(AS_PUBLIC)
}

export function resolveActorDiscoverable(actor: unknown): boolean | null {
  const record = asActorRecord(actor)
  if (!record) return null

  const discoverable = getBooleanProperty(record, 'discoverable', 'profile.discoveryDiscoverableInvalid')
  return discoverable.explicit ? discoverable.value : null
}

export function normalizeProfileDiscovery(
  actor: ActorRecord,
  options: {
    existingActor?: unknown
  } = {}
): ActorRecord {
  const existingActor = asActorRecord(options.existingActor)
  const nextActor: ActorRecord = { ...actor }

  const requestedIndexable = getIndexableProperty(nextActor)
  const requestedNoindex = getBooleanProperty(nextActor, 'noindex', 'profile.discoveryNoindexInvalid')

  if (
    requestedIndexable.explicit &&
    requestedNoindex.explicit &&
    requestedIndexable.value !== null &&
    requestedNoindex.value !== null &&
    requestedIndexable.value === requestedNoindex.value
  ) {
    throw new ProfileDiscoveryValidationError('profile.discoveryFlagsConflict')
  }

  const existingIndexable = resolveActorIndexable(existingActor)
  const effectiveIndexable = requestedIndexable.explicit
    ? requestedIndexable.value === true
    : requestedNoindex.explicit
      ? requestedNoindex.value !== true
      : existingActor
        ? existingIndexable
        : resolveActorIndexable(nextActor)

  nextActor.indexable = effectiveIndexable
  nextActor.noindex = !effectiveIndexable
  delete nextActor[TOOT_INDEXABLE_IRI]
  delete nextActor[TOOT_INDEXABLE_SHORT]

  const requestedDiscoverable = getBooleanProperty(
    nextActor,
    'discoverable',
    'profile.discoveryDiscoverableInvalid'
  )
  const existingDiscoverable = resolveActorDiscoverable(existingActor)
  if (requestedDiscoverable.explicit) {
    nextActor.discoverable = requestedDiscoverable.value
  } else if (existingDiscoverable !== null) {
    nextActor.discoverable = existingDiscoverable
  } else {
    delete nextActor.discoverable
  }

  if (!effectiveIndexable) {
    stripPublicSearchableBy(nextActor)
  }

  return nextActor
}

