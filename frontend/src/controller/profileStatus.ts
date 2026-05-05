export type ActorStatusDraft = {
  content: string
  endTimeLocal: string
  linkName: string
  linkUrl: string
}

export const STATUS_CHAR_LIMIT = 100

const segmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

const emptyDraft = (): ActorStatusDraft => ({
  content: '',
  endTimeLocal: '',
  linkName: '',
  linkUrl: ''
})

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export function countStatusCharacters(value: string): number {
  if (!value) return 0
  if (segmenter) {
    return Array.from(segmenter.segment(value)).length
  }
  return Array.from(value).length
}

function normalizeHttpUrl(value: string): string | null {
  if (!value.trim()) return null

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

function toDateTimeLocalValue(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return ''
  }

  const offsetMs = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function parseActorStatusDraft(value: unknown): ActorStatusDraft {
  const status = asRecord(value)
  if (!status) return emptyDraft()

  const attachment = asRecord(status.attachment)
  const linkUrl = normalizeString(attachment?.href ?? attachment?.url)

  return {
    content: normalizeString(status.content),
    endTimeLocal: toDateTimeLocalValue(status.endTime),
    linkName: normalizeString(attachment?.name),
    linkUrl
  }
}

export function validateActorStatusDraft(draft: ActorStatusDraft): string | null {
  const content = draft.content.trim()
  const linkUrl = draft.linkUrl.trim()
  const endTimeLocal = draft.endTimeLocal.trim()
  const hasAnyValue = Boolean(content || linkUrl || endTimeLocal || draft.linkName.trim())

  if (!hasAnyValue) {
    return null
  }

  if (!content) {
    return 'settings.profile.status.errors.required'
  }

  if (countStatusCharacters(content) > STATUS_CHAR_LIMIT) {
    return 'settings.profile.status.errors.tooLong'
  }

  if (endTimeLocal) {
    const parsed = new Date(endTimeLocal)
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return 'settings.profile.status.errors.invalidExpiration'
    }
  }

  if (linkUrl && !normalizeHttpUrl(linkUrl)) {
    return 'settings.profile.status.errors.invalidLink'
  }

  return null
}

export function buildActorStatusPayload(draft: ActorStatusDraft): Record<string, unknown> | undefined {
  const content = draft.content.trim()
  const linkName = draft.linkName.trim()
  const linkUrl = draft.linkUrl.trim()
  const endTimeLocal = draft.endTimeLocal.trim()
  const normalizedLinkUrl = linkUrl ? normalizeHttpUrl(linkUrl) : null

  if (!content && !linkName && !linkUrl && !endTimeLocal) {
    return undefined
  }

  const payload: Record<string, unknown> = {
    content
  }

  if (endTimeLocal) {
    payload.endTime = new Date(endTimeLocal).toISOString()
  }

  if (normalizedLinkUrl) {
    payload.attachment = {
      type: 'Link',
      href: normalizedLinkUrl,
      ...(linkName ? { name: linkName } : {})
    }
  }

  return payload
}

export function clearActorStatusDraft(): ActorStatusDraft {
  return emptyDraft()
}
