export interface PodProviderSignInResponse {
  token: string
  webId: string
  newUser: boolean
}

export interface MediaAttachmentInput {
  id?: string
  type: 'Image' | 'Video'
  mediaType: string
  url: string
  name?: string
  previewUrl?: string
  state?: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'expired' | 'deleted'
}

export interface PublicMediaAttachment {
  id: string
  state: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'expired' | 'deleted'
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

export interface NoteCreateRequest {
  '@context': string | Record<string, unknown> | Array<string | Record<string, unknown>>
  type: string
  attributedTo: string
  content: string
  tag?: Array<
    | { type: 'Hashtag'; name: string; href: string }
    | { type: 'Mention'; href: string; name?: string }
  >
  attachment?: Array<{
    type: string
    mediaType?: string
    url: string
    name?: string
  }>
  inReplyTo?: string
  name?: string
  summary?: string
  url?: string | Record<string, unknown> | Array<string | Record<string, unknown>>
  to: string[]
  /** FEP-c16b: true when `content` is FEP-c16b-compliant MFM-rendered HTML */
  htmlMfm?: boolean
  /** FEP-c16b: raw source before MFM rendering */
  source?: { content: string; mediaType: string }
  /**
   * ActivityStreams 2.0 `target` property — used for wall posts.
   * When present, identifies the actor URI of the profile whose wall this post
   * is being written on (following Friendica's AP wall implementation pattern).
   * The outer `Create` activity will carry this as the `target` when sent to
   * the ActivityPods outbox.
   */
  target?: string
}

// Export all Types from diffrent files
export * from './responses'
export * from './db'
export * from './enums'
