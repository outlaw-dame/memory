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

export const followersResponse = t.Object({
  id: t.Number(),
  username: t.String(),
  webId: t.String()
})
export type FollowersResponse = Static<typeof followersResponse>

export const followUnfollowResponse = t.String()
export type FollowUnfollowResponse = Static<typeof followUnfollowResponse>

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
