import type { App } from '#api/index.ts'
import type { _createUser, _selectUsers, signinResponse, viablePodProviders } from '#api/types'
import type { Static } from '@sinclair/typebox'

// Enums
export type ProviderEndpoints = Static<typeof viablePodProviders>

// Table entries
export type User = Static<typeof _selectUsers>

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

// Create Objects
export interface CreatePost {
  content: string
  isPublic: boolean
  postType?: 'note' | 'article'
  name?: string
  summary?: string
  objectUri?: string | null
  /** When set, the post is published as a Question (FEP-9967 poll). */
  poll?: CreatePoll | null
}
export type CreateUser = Static<typeof _createUser>

// Route Responses

export type { App }
