export interface PodProviderSignInResponse {
  token: string
  webId: string
  newUser: boolean
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
}

// Export all Types from diffrent files
export * from './responses'
export * from './db'
export * from './enums'
