import { t, type Static } from 'elysia'
import { _selectUsers } from './db'
import { viablePodProviders } from '.'

// Auth
// Login
export const loginBody = t.Object({
  username: t.String(),
  password: t.String(),
  providerEndpoint: viablePodProviders
})
export type LoginBody = Static<typeof loginBody>

export const loginResponse = t.Object({
  token: t.String(),
  user: _selectUsers
})
export type LoginResponse = Static<typeof loginResponse>

export const signUpBody = t.Object({
  username: t.String(),
  password: t.String(),
  email: t.String(),
  providerEndpoint: viablePodProviders
})
export type SignUpBody = Static<typeof signUpBody>
