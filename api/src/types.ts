import { t } from 'elysia'

export const viablePodProviders = t.Enum({
  'http://localhost:3000': 'http://localhost:3000'
})

export interface PodProviderResponse {
  token: string
  webId: string
  newUser: boolean
}
