import { t } from 'elysia'

export const viablePodProviders = t.Enum({
  'http://localhost:3000': 'http://localhost:3000'
})

export interface EndpointResponse {
  token: string
  webId: string
  newUser: boolean
}
