import type User from '@/decorater/User'
import { podProviderEndpoint, ViablePodProvider } from '@/types'

/**
 * Encodes a webId to a partial User object
 * @param {string} webId - The webId to encode (e.g. @test@memory.)
 * @returns
 */
export function decodeWebId(webId: string): {
  username: string
  provider: string
  endpoint: string
} {
  const [username, provider] = webId.split('@').slice(1)

  if (!Object.keys(podProviderEndpoint).includes(provider)) throw new Error('The provider is not a viable pod provider')

  return {
    username: username,
    provider: provider,
    endpoint: podProviderEndpoint[provider as ViablePodProvider]
  }
}

/**
 * Decodes a User object to a webId
 * @param {User} string - The username of the user
 * @returns {string} - The webId of the user
 */
export function encodeWebId(user: User): string
export function encodeWebId(providerWebId: string): string
export function encodeWebId(user_or_providerWebId: User | string): string {
  if (typeof user_or_providerWebId === 'string') {
    const username = user_or_providerWebId.split('/').pop()
    const endpoint = user_or_providerWebId.split('/').slice(0, -1).join('/')
    let name = ''
    Object.entries(podProviderEndpoint).forEach(([providerName, providerEndpoint]) => {
      if (providerEndpoint === endpoint) {
        name = providerName
      }
    })
    if (name === '') {
      //check if provided webId is already a memory webId
      const split = user_or_providerWebId.split('@')
      if (split.length === 3) {
        // check if provider is valid
        if (!Object.keys(podProviderEndpoint).includes(split[2]))
          throw new Error('The provider is not a viable pod provider')
        return user_or_providerWebId
      }
      throw new Error('The provider is not a viable pod provider')
    }
    return `@${username}@${name}`
  } else {
    if (!Object.keys(podProviderEndpoint).includes(user_or_providerWebId.provider))
      throw new Error('The provider is not a viable pod provider')
    return `@${user_or_providerWebId.username}@${user_or_providerWebId.provider}`
  }
}
