import type User from './decorater/User'
import type { NoteCreateRequest } from './types'
import { FEP_C16B_CONTEXT, looksLikeMfm, renderMfmToHtml } from './utils/mfm'

export type MemoryPostType = 'note' | 'article'

export interface BuildOutboxPostInput {
  user: User
  content: string
  isPublic: boolean
  postType?: MemoryPostType
  name?: string | null
  summary?: string | null
}

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

export function buildOutboxPost({
  user,
  content,
  isPublic,
  postType = 'note',
  name,
  summary,
}: BuildOutboxPostInput): NoteCreateRequest {
  const addressats = [`${user.endpoint}/${user.userName}/followers`]
  if (isPublic) addressats.push('https://www.w3.org/ns/activitystreams#Public')

  const normalizedName = normalizeOptionalText(name)
  const normalizedSummary = normalizeOptionalText(summary)
  const hasMfm = looksLikeMfm(content)

  if (postType === 'article') {
    const post: NoteCreateRequest = {
      '@context': hasMfm
        ? ['https://www.w3.org/ns/activitystreams', FEP_C16B_CONTEXT]
        : 'https://www.w3.org/ns/activitystreams',
      type: 'https://www.w3.org/ns/activitystreams#Article',
      attributedTo: `${user.endpoint}/${user.userName}`,
      content,
      to: addressats,
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
    ...(hasMfm && {
      htmlMfm: true,
      source: { content, mediaType: 'text/x.misskeymarkdown' },
    }),
  }

  if (normalizedName) post.name = normalizedName

  return post
}
