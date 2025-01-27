import type { App } from '#api/index.ts'
import type { _createUser, _selectUsers, signinResponse, viablePodProviders } from '#api/types'
import type { Static } from '@sinclair/typebox'

// Enums
export type ProviderEndpoints = Static<typeof viablePodProviders>

// Table entries
export type User = Static<typeof _selectUsers>

// Create Objects
export interface CreatePost {
  content: string
  isPublic: boolean
}
export type CreateUser = Static<typeof _createUser>

// Route Responses

export type { App }
