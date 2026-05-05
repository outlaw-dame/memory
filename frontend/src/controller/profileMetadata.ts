export interface ProfileField {
  name: string
  value: string
  kind: 'text' | 'link'
  relMe: boolean
  verified?: boolean
  verificationReason?: string
  verifiedAt?: string
}

const LEGACY_PROPERTY_VALUE_TYPES = new Set([
  'PropertyValue',
  'schema:PropertyValue',
  'http://schema.org#PropertyValue',
  'https://schema.org/PropertyValue'
])

const LEGACY_VALUE_KEYS = ['value', 'http://schema.org#value', 'https://schema.org/value']

const toArray = <T>(value: T | T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : value != null ? [value] : []

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const splitRel = (rel: unknown): string[] =>
  toArray(rel)
    .flatMap(value => (typeof value === 'string' ? value.split(/\s+/) : []))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)

const hasRelMe = (rel: unknown): boolean => splitRel(rel).includes('me')

const normalizeUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  try {
    const parsed = new URL(value.trim())
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.href
  } catch {
    return null
  }
}

const extractLegacyValue = (item: Record<string, unknown>): string => {
  for (const key of LEGACY_VALUE_KEYS) {
    if (typeof item[key] === 'string' && item[key].trim()) {
      return item[key].trim()
    }
  }
  return ''
}

const inferFieldFromLegacyValue = (name: string, value: string): ProfileField => {
  const normalizedHref = normalizeUrl(value)
  if (normalizedHref) {
    return {
      name,
      value: normalizedHref,
      kind: 'link',
      relMe: /\brel\s*=\s*['"][^'"]*\bme\b/i.test(value)
    }
  }

  return {
    name,
    value,
    kind: 'text',
    relMe: false
  }
}

export const attachmentToProfileField = (item: unknown): ProfileField | null => {
  if (!item || typeof item !== 'object') return null

  const record = item as Record<string, unknown>
  const name = normalizeString(record.name)
  if (!name) return null

  const types = toArray(record.type || record['@type'])

  if (types.includes('Note')) {
    const content = normalizeString(record.content)
    if (!content) return null
    return { name, value: content, kind: 'text', relMe: false }
  }

  if (types.includes('Link')) {
    const href = normalizeUrl(record.href || record.url)
    if (!href) return null

    return {
      name,
      value: href,
      kind: 'link',
      relMe: hasRelMe(record.rel),
      verified: Boolean(record.verified),
      verificationReason: normalizeString(record.verificationReason) || undefined,
      verifiedAt: normalizeString(record.verifiedAt) || undefined
    }
  }

  if (types.some(type => LEGACY_PROPERTY_VALUE_TYPES.has(String(type)))) {
    const value = extractLegacyValue(record)
    if (!value) return null
    return inferFieldFromLegacyValue(name, value)
  }

  return null
}

export const extractProfileFields = (attachment: unknown): ProfileField[] =>
  toArray(attachment)
    .map(attachmentToProfileField)
    .filter((field): field is ProfileField => Boolean(field))

export const createEmptyProfileField = (): ProfileField => ({
  name: '',
  value: '',
  kind: 'text',
  relMe: false
})

export const mergeProfileFieldsIntoAttachment = (existingAttachment: unknown, metadataFields: ProfileField[]) => {
  const preserved = toArray(existingAttachment).filter(item => !attachmentToProfileField(item))

  const generated = toArray(metadataFields)
    .map(field => ({
      name: normalizeString(field?.name),
      value: normalizeString(field?.value),
      kind: field?.kind === 'link' ? 'link' : 'text',
      relMe: Boolean(field?.relMe)
    }))
    .filter(field => field.name && field.value)
    .map(field => {
      if (field.kind === 'link') {
        const href = normalizeUrl(field.value)
        if (!href) {
          throw new Error(`Invalid URL for metadata field "${field.name}"`)
        }

        return {
          type: 'Link',
          name: field.name,
          href,
          ...(field.relMe ? { rel: ['me'] } : {})
        }
      }

      return {
        type: 'Note',
        name: field.name,
        content: field.value
      }
    })

  return [...preserved, ...generated]
}