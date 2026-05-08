import type { App } from '#api/index.ts'
import type { CreateUser as ApiCreateUser, SelectUsers, SignUpBody } from '#api/types'

// Enums
export type ProviderEndpoints = SignUpBody['providerEndpoint']

// Table entries
type DbUser = SelectUsers
export type User = Omit<DbUser, 'podToken'>

/** FEP-9967: poll options for a new Question post. */
export interface CreatePollOption {
  name: string
}

/** FEP-9967: poll data attached to a new post. */
export interface CreatePoll {
  mode: 'oneOf' | 'anyOf'
  options: CreatePollOption[]
  /** ISO 8601 end time; absent = no expiry. */
  endTime?: string | null
}

export interface MediaAttachmentInput {
  id?: string
  type: 'Image' | 'Video'
  mediaType: string
  url: string
  name?: string
  previewUrl?: string
  state?: MediaAttachmentState
}

export type MediaAttachmentState = 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'expired' | 'deleted'

export interface PublicMediaAttachment {
  id: string
  state: MediaAttachmentState
  type: 'Image' | 'Video' | 'Audio' | 'Document'
  kind: 'image' | 'gif' | 'video' | 'audio' | 'unknown'
  mediaType: string
  url: string | null
  sourceUrl: string | null
  canonicalUrl: string | null
  previewUrl: string | null
  thumbnailUrl: string | null
  gatewayUrl: string | null
  filebaseCid: string | null
  digestMultibase: string | null
  size: number
  width: number | null
  height: number | null
  durationMs: number | null
  altText: string | null
  blurhash: string | null
  errorCode: string | null
  errorMessage: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MediaUploadResponse {
  id: string
  state: MediaAttachmentState
  url: string
  mediaType: string
  size: number
  media: PublicMediaAttachment
  attachment: MediaAttachmentInput
}

export interface MediaUploadStatusResponse {
  media: PublicMediaAttachment
}

// Create Objects
export interface CreatePost {
  content: string
  hashtags?: string[]
  isPublic: boolean
  postType?: 'note' | 'article'
  name?: string
  summary?: string
  objectUri?: string | null
  attachments?: MediaAttachmentInput[]
  attachmentIds?: string[]
  idempotencyKey?: string
  /** When set, the post is published as a Question (FEP-9967 poll). */
  poll?: CreatePoll | null
}
export type CreateUser = ApiCreateUser

// Route Responses

export type { App }
