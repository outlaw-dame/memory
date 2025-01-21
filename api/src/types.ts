import { createInsertSchema } from 'drizzle-typebox'
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

// DB types
export const _createPost = createInsertSchema(posts)
export const _createUser = createInsertSchema(users)
