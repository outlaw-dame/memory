export const REPOST_RECORD_COLLECTIONS = [
  'app.bsky.feed.repost',
  'canonical.share',
] as const

export type RepostRecordCollection = typeof REPOST_RECORD_COLLECTIONS[number]

export interface RepostRecordInput {
  authorId: string
  authorDisplayName?: string | null
  collection: string
  record: unknown
  createdAt: Date | string | null
  repostUri: string
}

export interface RepostActor {
  actorId: string
  displayName: string
  sourceProtocol: 'activitypub' | 'atproto' | 'canonical'
  boostedAt: Date
  repostUri: string
}

export interface RepostGroup {
  subjectUri: string
  count: number
  boostedAt: Date
  actors: RepostActor[]
  actorLimitExceeded: boolean
  viewerHasReposted: boolean
}

export interface NormalizedRepostRecord extends RepostActor {
  subjectUri: string
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function parseDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date(0)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = normalizeString(value)
    if (normalized) return normalized
  }
  return null
}

function sourceProtocolFor(collection: string, record: Record<string, unknown>): RepostActor['sourceProtocol'] {
  if (record.sourceProtocol === 'activitypub' || record.sourceProtocol === 'atproto') {
    return record.sourceProtocol
  }
  if (collection.startsWith('app.bsky.')) return 'atproto'
  return 'canonical'
}

export function isRepostRecordCollection(collection: string): collection is RepostRecordCollection {
  return REPOST_RECORD_COLLECTIONS.includes(collection as RepostRecordCollection)
}

export function extractRepostSubjectUri(record: unknown): string | null {
  const root = asRecord(record)
  if (!root) return null

  const subject = asRecord(root.subject)
  const object = asRecord(root.object)
  const target = asRecord(root.target)

  return firstString(
    subject?.uri,
    subject?.atUri,
    subject?.id,
    object?.canonicalObjectId,
    object?.atUri,
    object?.activityPubObjectId,
    object?.id,
    target?.uri,
    target?.atUri,
    target?.id,
  )
}

export function normalizeRepostRecord(input: RepostRecordInput): NormalizedRepostRecord | null {
  if (!isRepostRecordCollection(input.collection)) return null

  const record = asRecord(input.record)
  if (!record) return null

  const subjectUri = extractRepostSubjectUri(record)
  if (!subjectUri) return null

  const sourceAccountRef = asRecord(record.sourceAccountRef)
  const actorId = firstString(
    sourceAccountRef?.canonicalAccountId,
    sourceAccountRef?.did,
    sourceAccountRef?.activityPubActorUri,
    sourceAccountRef?.webId,
    sourceAccountRef?.handle,
    input.authorId,
  )
  if (!actorId) return null

  const displayName = firstString(
    sourceAccountRef?.handle,
    sourceAccountRef?.canonicalAccountId,
    input.authorDisplayName,
    sourceAccountRef?.webId,
    sourceAccountRef?.activityPubActorUri,
    actorId,
  ) ?? actorId

  return {
    actorId,
    displayName,
    sourceProtocol: sourceProtocolFor(input.collection, record),
    boostedAt: parseDate(input.createdAt ?? firstString(record.createdAt)),
    repostUri: input.repostUri,
    subjectUri,
  }
}

export function groupRepostsBySubject(
  records: RepostRecordInput[],
  viewerIds: ReadonlySet<string> = new Set(),
  actorLimit = 3,
): Map<string, RepostGroup> {
  const latestBySubjectAndActor = new Map<string, NormalizedRepostRecord>()

  for (const input of records) {
    const normalized = normalizeRepostRecord(input)
    if (!normalized) continue

    const key = `${normalized.subjectUri}\0${normalized.actorId}`
    const existing = latestBySubjectAndActor.get(key)
    if (!existing || normalized.boostedAt > existing.boostedAt) {
      latestBySubjectAndActor.set(key, normalized)
    }
  }

  const actorsBySubject = new Map<string, NormalizedRepostRecord[]>()
  for (const record of latestBySubjectAndActor.values()) {
    const current = actorsBySubject.get(record.subjectUri)
    if (current) current.push(record)
    else actorsBySubject.set(record.subjectUri, [record])
  }

  const viewerIdSet = new Set([...viewerIds].map(value => value.toLowerCase()))
  const groups = new Map<string, RepostGroup>()

  for (const [subjectUri, actors] of actorsBySubject) {
    const sortedActors = [...actors].sort((a, b) => b.boostedAt.getTime() - a.boostedAt.getTime())
    const boostedAt = sortedActors[0]?.boostedAt ?? new Date(0)
    const viewerHasReposted = sortedActors.some(actor => viewerIdSet.has(actor.actorId.toLowerCase()))

    groups.set(subjectUri, {
      subjectUri,
      count: sortedActors.length,
      boostedAt,
      actors: sortedActors.slice(0, actorLimit),
      actorLimitExceeded: sortedActors.length > actorLimit,
      viewerHasReposted,
    })
  }

  return groups
}
