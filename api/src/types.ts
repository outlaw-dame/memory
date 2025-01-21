import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { posts, users } from './db/schema'

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

// Query types
export const selectQueryObject = t.Object({
  limit: t.Integer({ default: 10, maximum: 50, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 })
})

// DB types
// Posts
export const _createPost = createInsertSchema(posts)
export const _selectposts = createSelectSchema(posts)

// Users
export const _createUser = createInsertSchema(users)
export const _selectusers = createSelectSchema(users)
