import { t, type Static } from 'elysia'
import { _selectUsers } from './db'
import { viablePodProviders } from './enums'
import { createSchemaFactory } from 'drizzle-typebox'
import { posts, postsView, users } from '../db/schema'

const {createSelectSchema} = createSchemaFactory({typeboxInstance: t})

// Auth
// SignIn
export const signinBody = t.Object({
  username: t.String(),
  password: t.String(),
  providerEndpoint: viablePodProviders
})
export type SignInBody = Static<typeof signinBody>

export const signinResponse = t.Object({
  token: t.String(),
  user: _selectUsers
})
export type SignInResponse = Static<typeof signinResponse>

export const oidcExchangeBody = t.Object({
  accessToken: t.String(),
  webId: t.String({ format: 'uri' }),
  providerEndpoint: viablePodProviders,
  name: t.Optional(t.String()),
  email: t.Optional(t.String())
})
export type OidcExchangeBody = Static<typeof oidcExchangeBody>

export const oidcPrepareBody = t.Object({
  providerEndpoint: viablePodProviders,
  redirectUri: t.String({ format: 'uri' }),
  state: t.String(),
  codeChallenge: t.String()
})
export type OidcPrepareBody = Static<typeof oidcPrepareBody>

export const oidcPrepareResponse = t.Object({
  authorizationUrl: t.String({ format: 'uri' }),
  clientId: t.String()
})
export type OidcPrepareResponse = Static<typeof oidcPrepareResponse>

export const oidcCallbackBody = t.Object({
  providerEndpoint: viablePodProviders,
  redirectUri: t.String({ format: 'uri' }),
  clientId: t.String(),
  code: t.String(),
  codeVerifier: t.String()
})
export type OidcCallbackBody = Static<typeof oidcCallbackBody>

export const signUpBody = t.Object({
  username: t.String(),
  password: t.String(),
  email: t.String(),
  providerEndpoint: viablePodProviders
})
export type SignUpBody = Static<typeof signUpBody>

// Users
export const selectUser = createSelectSchema(users)

// Posts
export const selectPost = createSelectSchema(postsView)
export type SelectPost = {
  id: number;
  content: string;
  isPublic: boolean;
  createdAt: string;
  objectUri?: string | null;
  canonicalUrl?: string | null;
  postType: 'note' | 'article';
  name?: string | null;
  summary?: string | null;
  authorId: number;
  author: {
    id: number;
    name: string;
    webId: string;
  };
}
