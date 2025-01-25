export interface PodProviderSignInResponse {
  token: string
  webId: string
  newUser: boolean
}

export interface NoteCreateRequest {
  '@context': string
  type: string
  attributedTo: string
  content: string
  to: string[]
}

// Export all Types from diffrent files
export * from './responses'
export * from './db'
export * from './enums'
