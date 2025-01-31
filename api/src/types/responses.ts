import { t, type Static } from 'elysia'
import { _selectUsers } from './db'
import { viablePodProviders } from './enums'
import { createSchemaFactory } from 'drizzle-typebox'
import { postsView, users } from '../db/schema'

const { createSelectSchema } = createSchemaFactory({ typeboxInstance: t })

// Auth
// SignIn
export const signinBody = t.Object({
  username: t.String(),
  password: t.String(),
  providerName: viablePodProviders
})
export type SignInBody = Static<typeof signinBody>

export const signinResponse = t.Object({
  token: t.String(),
  user: _selectUsers
})
export type SignInResponse = Static<typeof signinResponse>

export const signUpBody = t.Object({
  username: t.String(),
  password: t.String(),
  email: t.String(),
  providerName: viablePodProviders
})
export type SignUpBody = Static<typeof signUpBody>

// Users
export const selectUser = createSelectSchema(users)

export const followersFollowedResponse = t.Omit(selectUser, ['email'])
export type FollowersFollowedResponse = Static<typeof followersFollowedResponse>

// Posts
export const selectPost = createSelectSchema(postsView)
export type SelectPost = {
  id: number
  content: string
  isPublic: boolean
  createdAt: string
  authorId: number
  author: {
    id: number
    name: string
    webId: string
  }
}
