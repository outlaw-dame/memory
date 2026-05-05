const STATUS_CHAR_LIMIT = 100
const MAX_STATUS_CONTENT_GRAPHEMES = 100
const MAX_STATUS_TEXT_LENGTH = 400
const MAX_STATUS_LINK_LABEL_LENGTH = 200
const MAX_STATUS_ID_LENGTH = 4096

type ActorRecord = Record<string, unknown>

export class ProfileStatusValidationError extends Error {
  constructor(public readonly translationKey: string) {
    super(translationKey)
    this.name = 'ProfileStatusValidationError'
  }
}

type NormalizedStatusDraft = {
  content: string
  endTime?: string
  attachment?: {
    type: 'Link'
    href: string
    name?: string
  }
}

const segmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

function countGraphemes(value: string): number {
  if (!value) return 0
  if (segmenter) {
    return Array.from(segmenter.segment(value)).length
  }
  return Array.from(value).length
}

function asActorRecord(value: unknown): ActorRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ActorRecord) : null
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null

  try {
    const parsed = new URL(value.trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.href
  } catch {
    return null
  }
}

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function sanitizeStatusAttachment(value: unknown): NormalizedStatusDraft['attachment'] | undefined {
  if (value == null) return undefined

  const attachment = asActorRecord(value)
  if (!attachment) {
    throw new ProfileStatusValidationError('profile.statusAttachmentInvalid')
  }

  const href = normalizeHttpUrl(attachment.href ?? attachment.url)
  if (!href) {
    throw new ProfileStatusValidationError('profile.statusAttachmentUrlInvalid')
  }

  const name = normalizeString(attachment.name)
  if (name.length > MAX_STATUS_LINK_LABEL_LENGTH) {
    throw new ProfileStatusValidationError('profile.statusAttachmentInvalid')
  }

  return {
    type: 'Link',
    href,
    ...(name ? { name } : {})
  }
}

function normalizeStatusDraft(
  value: unknown,
  options: {
    allowPastEndTime?: boolean
  } = {}
): NormalizedStatusDraft | null {
  if (value == null) return null

  const status = asActorRecord(value)
  if (!status) {
    throw new ProfileStatusValidationError('profile.statusMustBeObject')
  }

  const content = normalizeString(status.content)
  const endTime = status.endTime == null ? undefined : normalizeIsoDate(status.endTime)
  if (status.endTime != null && !endTime) {
    throw new ProfileStatusValidationError('profile.statusEndTimeInvalid')
  }
  if (!options.allowPastEndTime && endTime && new Date(endTime).getTime() <= Date.now()) {
    throw new ProfileStatusValidationError('profile.statusEndTimePast')
  }

  const attachment = sanitizeStatusAttachment(status.attachment)
  const isEmpty = !content && !endTime && !attachment
  if (isEmpty) {
    return null
  }

  if (!content) {
    throw new ProfileStatusValidationError('profile.statusContentRequired')
  }
  if (content.length > MAX_STATUS_TEXT_LENGTH || countGraphemes(content) > MAX_STATUS_CONTENT_GRAPHEMES) {
    throw new ProfileStatusValidationError('profile.statusContentTooLong')
  }

  return {
    content,
    ...(endTime ? { endTime } : {}),
    ...(attachment ? { attachment } : {})
  }
}

function normalizeStatusIdentity(value: unknown): { id: string; published: string } | null {
  const status = asActorRecord(value)
  if (!status) return null

  const id = normalizeString(status.id ?? status['@id'])
  const published = normalizeIsoDate(status.published)
  if (!id || id.length > MAX_STATUS_ID_LENGTH || !published) {
    return null
  }

  return { id, published }
}

function statusDraftsEqual(left: NormalizedStatusDraft | null, right: NormalizedStatusDraft | null): boolean {
  if (left == null || right == null) {
    return left === right
  }

  return (
    left.content === right.content &&
    (left.endTime ?? '') === (right.endTime ?? '') &&
    (left.attachment?.href ?? '') === (right.attachment?.href ?? '') &&
    (left.attachment?.name ?? '') === (right.attachment?.name ?? '')
  )
}

function buildStatusId(actorId: string): string {
  const base = actorId.replace(/#.*$/, '').replace(/\/+$/, '')
  return `${base}/statuses/${crypto.randomUUID()}`
}

function preserveStatusHistory(inputActor: ActorRecord, existingActor?: ActorRecord | null): void {
  delete inputActor.statusHistory

  if (existingActor && Object.prototype.hasOwnProperty.call(existingActor, 'statusHistory')) {
    inputActor.statusHistory = existingActor.statusHistory
  }
}

export function normalizeProfileActorUpdate(
  actor: ActorRecord,
  options: {
    actorId: string
    existingActor?: unknown
    now?: Date
  }
): ActorRecord {
  const existingActor = asActorRecord(options.existingActor)
  const nextActor: ActorRecord = {
    ...actor,
    id: options.actorId,
    '@id': options.actorId
  }

  preserveStatusHistory(nextActor, existingActor)

  const nextDraft = normalizeStatusDraft(actor.status)
  const existingDraft = normalizeStatusDraft(existingActor?.status, {
    allowPastEndTime: true
  })

  if (nextDraft == null) {
    delete nextActor.status
    return nextActor
  }

  if (existingActor?.status && statusDraftsEqual(nextDraft, existingDraft)) {
    nextActor.status = existingActor.status
    return nextActor
  }

  const now = (options.now ?? new Date()).toISOString()
  const existingIdentity = normalizeStatusIdentity(existingActor?.status)

  nextActor.status = {
    type: 'ActorStatus',
    id: statusDraftsEqual(nextDraft, existingDraft) && existingIdentity ? existingIdentity.id : buildStatusId(options.actorId),
    attributedTo: options.actorId,
    published: statusDraftsEqual(nextDraft, existingDraft) && existingIdentity ? existingIdentity.published : now,
    content: nextDraft.content,
    ...(nextDraft.endTime ? { endTime: nextDraft.endTime } : {}),
    ...(nextDraft.attachment ? { attachment: nextDraft.attachment } : {})
  }

  return nextActor
}

export function getStatusCharacterLimit(): number {
  return STATUS_CHAR_LIMIT
}
