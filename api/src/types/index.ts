import { t } from 'elysia'

export const viablePodProviders = t.Enum({
  'http://localhost:3000': 'http://localhost:3000'
})

export interface PodProviderLoginResponse {
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
