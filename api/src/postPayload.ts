import type User from './decorater/User'
import type { MediaAttachmentInput, NoteCreateRequest } from './types'
import { mergeHashtags, toActivityPubHashtagTags } from './utils/hashtags'
import { FEP_C16B_CONTEXT, looksLikeMfm, renderMfmToHtml } from './utils/mfm'

export type MemoryPostType = 'note' | 'article'

export interface BuildOutboxPostInput {
  user: User
  content: string
  hashtags?: string[] | null
  isPublic: boolean
  postType?: MemoryPostType
  name?: string | null
  summary?: string | null
  attachments?: MediaAttachmentInput[] | null
}

const MAX_MEDIA_ATTACHMENTS = 8

const MEDIA_EXTENSION_MIME_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  png: 'image/png',
  webm: 'video/webm',
  webp: 'image/webp',
}

const SUPPORTED_ATTACHMENT_MEDIA_TYPES = /^(image\/(avif|gif|jpeg|png|webp)|video\/(mp4|quicktime|webm))$/

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function plainTextToHtmlParagraphs(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').trim()
  if (!normalized) return ''

  return normalized
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function extractMediaAttachments(content: string): NonNullable<NoteCreateRequest['attachment']> | undefined {
  const attachments: NonNullable<NoteCreateRequest['attachment']> = []
  const seen = new Set<string>()
  const urlPattern = /https?:\/\/[^\s<>()"']+/gi
  const matches = content.match(urlPattern) || []

  for (const rawUrl of matches) {
    if (attachments.length >= MAX_MEDIA_ATTACHMENTS) break

    const normalized = normalizeMediaUrl(rawUrl)
    if (!normalized || seen.has(normalized.url)) continue

    seen.add(normalized.url)
    attachments.push({
      type: normalized.mediaType.startsWith('video/') ? 'Video' : 'Image',
      mediaType: normalized.mediaType,
      url: normalized.url,
    })
  }

  return attachments.length > 0 ? attachments : undefined
}

function mergeMediaAttachments(
  content: string,
  explicitAttachments: MediaAttachmentInput[] | null | undefined
): NonNullable<NoteCreateRequest['attachment']> | undefined {
  const merged: NonNullable<NoteCreateRequest['attachment']> = []
  const seen = new Set<string>()

  for (const attachment of explicitAttachments || []) {
    const normalized = normalizeExplicitMediaAttachment(attachment)
    if (!normalized || seen.has(normalized.url)) continue
    seen.add(normalized.url)
    merged.push(normalized)
  }

  for (const attachment of extractMediaAttachments(content) || []) {
    if (seen.has(attachment.url)) continue
    seen.add(attachment.url)
    merged.push(attachment)
  }

  return merged.length > 0 ? merged.slice(0, MAX_MEDIA_ATTACHMENTS) : undefined
}

function normalizeExplicitMediaAttachment(attachment: MediaAttachmentInput): NonNullable<NoteCreateRequest['attachment']>[number] | null {
  if (!attachment || typeof attachment !== 'object') return null
  const mediaType = typeof attachment.mediaType === 'string' ? attachment.mediaType.trim().toLowerCase() : ''
  if (!SUPPORTED_ATTACHMENT_MEDIA_TYPES.test(mediaType)) return null

  try {
    const parsed = new URL(attachment.url)
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) return null
    return {
      type: mediaType.startsWith('video/') ? 'Video' : 'Image',
      mediaType,
      url: parsed.toString(),
      ...(typeof attachment.name === 'string' && attachment.name.trim() ? { name: attachment.name.trim().slice(0, 160) } : {}),
    }
  } catch {
    return null
  }
}

function normalizeMediaUrl(rawUrl: string): { url: string; mediaType: string } | null {
  try {
    const parsed = new URL(rawUrl.replace(/[.,;:!?]+$/g, ''))
    if (parsed.username || parsed.password) return null

    const extension = parsed.pathname.split('/').pop()?.split('.').pop()?.toLowerCase()
    if (!extension) return null

    const mediaType = MEDIA_EXTENSION_MIME_TYPES[extension]
    if (!mediaType) return null

    parsed.hash = ''
    return { url: parsed.toString(), mediaType }
  } catch {
    return null
  }
}

export function buildOutboxPost({
  user,
  content,
  hashtags,
  isPublic,
  postType = 'note',
  name,
  summary,
  attachments,
}: BuildOutboxPostInput): NoteCreateRequest {
  const addressats = [`${user.endpoint}/${user.userName}/followers`]
  if (isPublic) addressats.push('https://www.w3.org/ns/activitystreams#Public')

  const normalizedName = normalizeOptionalText(name)
  const normalizedSummary = normalizeOptionalText(summary)
  const hasMfm = looksLikeMfm(content)
  const normalizedHashtags = mergeHashtags(content, hashtags)
  const activityPubTags = toActivityPubHashtagTags(normalizedHashtags, user.endpoint)
  const mediaAttachments = mergeMediaAttachments(content, attachments)

  if (postType === 'article') {
    const post: NoteCreateRequest = {
      '@context': hasMfm
        ? ['https://www.w3.org/ns/activitystreams', FEP_C16B_CONTEXT]
        : 'https://www.w3.org/ns/activitystreams',
      type: 'https://www.w3.org/ns/activitystreams#Article',
      attributedTo: `${user.endpoint}/${user.userName}`,
      content,
      to: addressats,
      ...(activityPubTags.length > 0 ? { tag: activityPubTags } : {}),
      ...(mediaAttachments ? { attachment: mediaAttachments } : {}),
      source: {
        content,
        mediaType: hasMfm ? 'text/x.misskeymarkdown' : 'text/markdown',
      },
    }

    if (normalizedName) post.name = normalizedName
    if (normalizedSummary) post.summary = plainTextToHtmlParagraphs(normalizedSummary)

    return post
  }

  const renderedContent = hasMfm ? renderMfmToHtml(content) : content
  const post: NoteCreateRequest = {
    '@context': hasMfm
      ? ['https://www.w3.org/ns/activitystreams', FEP_C16B_CONTEXT]
      : 'https://www.w3.org/ns/activitystreams',
    type: 'https://www.w3.org/ns/activitystreams#Note',
    attributedTo: `${user.endpoint}/${user.userName}`,
    content: renderedContent,
    to: addressats,
    ...(activityPubTags.length > 0 ? { tag: activityPubTags } : {}),
    ...(mediaAttachments ? { attachment: mediaAttachments } : {}),
    ...(hasMfm && {
      htmlMfm: true,
      source: { content, mediaType: 'text/x.misskeymarkdown' },
    }),
  }

  if (normalizedName) post.name = normalizedName

  return post
}
