import { createHash } from 'node:crypto'
import type User from './decorater/User'
import {
  ProfileAuthorAttributionValidationError,
  normalizeProfileAuthorAttribution
} from './profileAuthorAttribution'
import {
  ProfileDiscoveryValidationError,
  normalizeProfileDiscovery,
  resolveActorDiscoverable,
  resolveActorIndexable
} from './profileDiscovery'

type ActorRecord = Record<string, unknown>

const MAX_FIELD_COUNT = 4
const MAX_FIELD_TEXT_LENGTH = 255
const MAX_ATTRIBUTION_DOMAIN_COUNT = 10

export class MastodonApiValidationError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = 'MastodonApiValidationError'
  }
}

function asRecord(value: unknown): ActorRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as ActorRecord) : null
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : value != null ? [value] : []
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function firstUrl(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue

    try {
      const parsed = new URL(value.trim())
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href
      }
    } catch {
      continue
    }
  }

  return undefined
}

function stableAccountId(actorId: string): string {
  const hex = createHash('sha256').update(actorId).digest('hex').slice(0, 15)
  return BigInt(`0x${hex}`).toString(10)
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function textToHtml(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return `<p>${escapeHtml(trimmed).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />')}</p>`
}

function plainSummary(actor: ActorRecord): string {
  const summary = normalizeString(actor.summary)
  return stripHtml(summary)
}

function extractProfileField(item: unknown): { name: string; value: string; verified_at: string | null } | null {
  const record = asRecord(item)
  if (!record) return null

  const name = normalizeString(record.name)
  if (!name) return null

  const type = toArray(record.type ?? record['@type']).map(String)
  if (type.includes('Link')) {
    const href = firstUrl(record.href, record.url)
    if (!href) return null
    return {
      name,
      value: href,
      verified_at: firstString(record.verifiedAt) ?? null
    }
  }

  if (type.includes('Note')) {
    const content = normalizeString(record.content)
    if (!content) return null
    return {
      name,
      value: content,
      verified_at: null
    }
  }

  const value = normalizeString(record.value ?? record['http://schema.org#value'] ?? record['https://schema.org/value'])
  if (!value) return null

  return {
    name,
    value,
    verified_at: null
  }
}

function extractProfileFields(actor: ActorRecord): Array<{ name: string; value: string; verified_at: string | null }> {
  return toArray(actor.attachment)
    .map(extractProfileField)
    .filter((field): field is { name: string; value: string; verified_at: string | null } => Boolean(field))
    .slice(0, MAX_FIELD_COUNT)
}

function fieldValueToAccountHtml(value: string): string {
  const href = firstUrl(value)
  if (!href) return escapeHtml(value)

  const visible = escapeHtml(href.replace(/^https?:\/\//i, ''))
  return `<a href="${escapeHtml(href)}" rel="me nofollow noopener noreferrer" target="_blank">${visible}</a>`
}

function normalizeDate(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function attributionDomains(actor: ActorRecord): string[] {
  return toArray(actor.attributionDomains)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim())
    .slice(0, MAX_ATTRIBUTION_DOMAIN_COUNT)
}

function usernameFromUser(user: User, actor: ActorRecord): string {
  return firstString(actor.preferredUsername, user.userName)?.replace(/^@+/, '') || 'unknown'
}

export function toMastodonCredentialAccount(actor: ActorRecord, user: User): Record<string, unknown> {
  const actorId = firstString(actor.id, actor['@id'], user.getWebId()) ?? user.getWebId()
  const username = usernameFromUser(user, actor)
  const displayName = normalizeString(actor.name)
  const summary = plainSummary(actor)
  const fields = extractProfileFields(actor)
  const indexable = resolveActorIndexable(actor)
  const discoverable = resolveActorDiscoverable(actor)
  const avatar = firstUrl(
    asRecord(actor.icon)?.url,
    asRecord(actor.icon)?.href,
    typeof actor.icon === 'string' ? actor.icon : undefined
  ) ?? ''
  const header = firstUrl(
    asRecord(actor.image)?.url,
    asRecord(actor.image)?.href,
    typeof actor.image === 'string' ? actor.image : undefined
  ) ?? ''
  const createdAt = normalizeDate(actor.published ?? actor.created_at ?? actor.createdAt, new Date(0).toISOString())

  return {
    id: stableAccountId(actorId),
    username,
    acct: username,
    display_name: displayName,
    locked: Boolean(actor.manuallyApprovesFollowers ?? actor.locked),
    bot: actor.type === 'Application' || actor.type === 'Service',
    group: actor.type === 'Group',
    created_at: createdAt,
    note: textToHtml(summary),
    url: firstUrl(actor.url, actorId) ?? actorId,
    uri: actorId,
    avatar,
    avatar_static: avatar,
    header,
    header_static: header,
    followers_count: 0,
    following_count: 0,
    statuses_count: 0,
    last_status_at: null,
    discoverable,
    indexable,
    noindex: !indexable,
    hide_collections: actor.hideCollections ?? actor.hide_collections ?? null,
    emojis: [],
    fields: fields.map(field => ({
      name: field.name,
      value: fieldValueToAccountHtml(field.value),
      verified_at: field.verified_at
    })),
    roles: [],
    role: {
      id: '-99',
      name: '',
      permissions: '0',
      color: '',
      highlighted: false
    },
    source: {
      privacy: 'public',
      sensitive: false,
      language: '',
      note: summary,
      fields,
      follow_requests_count: 0,
      attribution_domains: attributionDomains(actor),
      hide_collections: actor.hideCollections ?? actor.hide_collections ?? false,
      discoverable,
      indexable
    }
  }
}

export function toMastodonProfile(actor: ActorRecord, user: User): Record<string, unknown> {
  const account = toMastodonCredentialAccount(actor, user)
  const source = asRecord(account.source) ?? {}

  return {
    id: account.id,
    display_name: account.display_name,
    note: source.note ?? '',
    fields: source.fields ?? [],
    avatar: account.avatar || null,
    avatar_static: account.avatar_static || null,
    avatar_description: '',
    header: account.header || null,
    header_static: account.header_static || null,
    header_description: '',
    locked: account.locked,
    bot: account.bot,
    hide_collections: source.hide_collections ?? null,
    discoverable: account.discoverable,
    indexable: account.indexable,
    show_media: true,
    show_media_replies: true,
    show_featured: true,
    attribution_domains: source.attribution_domains ?? [],
    featured_tags: []
  }
}

function collectValues(record: ActorRecord, key: string): unknown[] {
  const value = record[key]
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function extractAttributionDomains(input: ActorRecord): string[] | undefined {
  const values = [
    ...collectValues(input, 'attribution_domains'),
    ...collectValues(input, 'attribution_domains[]')
  ]

  if (values.length === 0) return undefined

  return values
    .flatMap(value => {
      if (Array.isArray(value)) return value
      if (typeof value === 'string' && value.includes(',')) {
        return value.split(',')
      }
      return [value]
    })
    .filter((value): value is string => typeof value === 'string')
}

function getNestedField(record: ActorRecord, path: string[]): unknown {
  let current: unknown = record
  for (const part of path) {
    const currentRecord = asRecord(current)
    if (!currentRecord) return undefined
    current = currentRecord[part]
  }
  return current
}

function extractFieldsAttributes(input: ActorRecord): Array<{ name: string; value: string }> | undefined {
  const raw = input.fields_attributes ?? input.fields ?? extractBracketedFields(input)
  if (raw == null) return undefined

  const items = Array.isArray(raw)
    ? raw
    : asRecord(raw)
      ? Object.values(raw as ActorRecord)
      : []

  const fields = items
    .map(item => {
      const record = asRecord(item)
      if (!record) return null

      const name = normalizeString(record.name)
      const value = normalizeString(record.value)
      if (!name && !value) return null
      if (!name || !value || name.length > MAX_FIELD_TEXT_LENGTH || value.length > MAX_FIELD_TEXT_LENGTH) {
        throw new MastodonApiValidationError(422, 'Invalid profile field')
      }

      return { name, value }
    })
    .filter((field): field is { name: string; value: string } => Boolean(field))

  if (fields.length > MAX_FIELD_COUNT) {
    throw new MastodonApiValidationError(422, `At most ${MAX_FIELD_COUNT} profile fields are supported`)
  }

  return fields
}

function extractBracketedFields(input: ActorRecord): ActorRecord | undefined {
  const fields: Record<string, ActorRecord> = {}

  for (const [key, value] of Object.entries(input)) {
    const match = /^fields_attributes\[([^\]]+)\]\[(name|value)\]$/.exec(key)
    if (!match) continue

    const index = match[1]
    const fieldKey = match[2]
    if (!index || !fieldKey) continue

    fields[index] = {
      ...(fields[index] ?? {}),
      [fieldKey]: value
    }
  }

  return Object.keys(fields).length > 0 ? fields : undefined
}

function attachmentFromFields(fields: Array<{ name: string; value: string }>): unknown[] {
  return fields.map(field => {
    const href = firstUrl(field.value)
    if (href) {
      return {
        type: 'Link',
        name: field.name,
        href,
        rel: ['me']
      }
    }

    return {
      type: 'Note',
      name: field.name,
      content: field.value
    }
  })
}

function rejectUnsupportedMedia(input: ActorRecord): void {
  for (const key of ['avatar', 'header']) {
    if (input[key] != null) {
      throw new MastodonApiValidationError(422, `${key} upload is not supported by this compatibility endpoint`)
    }
  }
}

export function applyMastodonProfileUpdate(
  currentActor: ActorRecord,
  input: ActorRecord,
  user: User
): ActorRecord {
  rejectUnsupportedMedia(input)

  let nextActor: ActorRecord = {
    ...currentActor,
    id: user.getWebId(),
    '@id': user.getWebId()
  }

  const hasDisplayName = Object.prototype.hasOwnProperty.call(input, 'display_name')
  if (hasDisplayName) {
    const displayName = normalizeString(input.display_name)
    nextActor.name = displayName
    nextActor['foaf:name'] = displayName
  }

  const hasNote = Object.prototype.hasOwnProperty.call(input, 'note')
  if (hasNote) {
    const note = normalizeString(input.note)
    nextActor.summary = note
  }

  for (const key of ['indexable', 'noindex', 'discoverable', 'hide_collections']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const targetKey = key === 'hide_collections' ? 'hideCollections' : key
      nextActor[targetKey] = input[key]
    }
  }

  const sourceIndexable = getNestedField(input, ['source', 'indexable']) ?? input['source[indexable]']
  if (sourceIndexable !== undefined) {
    nextActor.indexable = sourceIndexable
  }
  const sourceDiscoverable = getNestedField(input, ['source', 'discoverable']) ?? input['source[discoverable]']
  if (sourceDiscoverable !== undefined) {
    nextActor.discoverable = sourceDiscoverable
  }

  const attributionDomains = extractAttributionDomains(input)
  if (attributionDomains !== undefined) {
    nextActor.attributionDomains = attributionDomains
  }

  const fields = extractFieldsAttributes(input)
  if (fields !== undefined) {
    nextActor.attachment = attachmentFromFields(fields)
  }

  try {
    nextActor = normalizeProfileDiscovery(nextActor, {
      existingActor: currentActor
    })
    nextActor = normalizeProfileAuthorAttribution(nextActor, {
      existingActor: currentActor
    })
  } catch (error) {
    if (error instanceof ProfileDiscoveryValidationError) {
      throw new MastodonApiValidationError(422, error.translationKey)
    }
    if (error instanceof ProfileAuthorAttributionValidationError) {
      throw new MastodonApiValidationError(422, error.translationKey)
    }
    throw error
  }

  return nextActor
}
