import Elysia, { t } from 'elysia'
import User from '../decorater/User'
import ActivityPod from '../services/ActivityPod'
import { localeFromHeaders, translate } from '../i18n'
import setupPlugin from './setup'
import { hydrateUserPodToken } from '../services/PodTokenService'
import { isCurrentSessionToken } from '../services/jwt'
import {
  MastodonApiValidationError,
  applyMastodonProfileUpdate,
  toMastodonCredentialAccount,
  toMastodonProfile
} from '../mastodonAccount'

type AuthenticatedContext = {
  user: User
}

function bearerToken(headers: Record<string, string | undefined>): string {
  const authorization = headers.authorization
  if (typeof authorization === 'string') {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
    if (match?.[1]) return match[1].trim()
  }

  return typeof headers.auth === 'string' ? headers.auth.trim() : ''
}

async function authenticate(
  headers: Record<string, string | undefined>,
  jwt: { verify: (token: string) => Promise<unknown> }
): Promise<AuthenticatedContext | null> {
  const token = bearerToken(headers)
  if (!token) return null

  const verified = await jwt.verify(token)
  if (!isCurrentSessionToken(verified)) return null

  try {
    const parsed = JSON.parse(verified.user) as User
    const user = new User()
    user.loadUser(parsed)
    await hydrateUserPodToken(user)
    if (!user.endpoint || !user.userName || !user.token) return null
    return { user }
  } catch {
    return null
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function mastodonError(set: { status?: number | string }, status: number, message: string): { error: string } {
  set.status = status
  return { error: message }
}

const mastodonApiPlugin = new Elysia({ name: 'mastodonApi' })
  .use(setupPlugin)
  .get(
    '/api/v1/accounts/verify_credentials',
    async ({ set, headers, jwt }: any) => {
      const locale = localeFromHeaders(headers)
      const auth = await authenticate(headers, jwt)
      if (!auth) {
        return mastodonError(set, 401, translate(locale, 'common.mustBeSignedIn'))
      }

      try {
        const actor = await ActivityPod.getProfile(auth.user)
        return toMastodonCredentialAccount(actor, auth.user)
      } catch (error) {
        console.error('Error while fetching Mastodon credential account:', error)
        return mastodonError(set, 502, translate(locale, 'profile.fetchFailed'))
      }
    },
    {
      response: {
        200: t.Any(),
        401: t.Object({ error: t.String() }),
        502: t.Object({ error: t.String() })
      },
      detail: { description: 'Mastodon-compatible credential account response' }
    }
  )
  .patch(
    '/api/v1/accounts/update_credentials',
    async ({ set, body, query, headers, jwt }: any) => {
      const locale = localeFromHeaders(headers)
      const auth = await authenticate(headers, jwt)
      if (!auth) {
        return mastodonError(set, 401, translate(locale, 'common.mustBeSignedIn'))
      }

      let currentProfile: Record<string, unknown>
      try {
        currentProfile = await ActivityPod.getProfile(auth.user)
      } catch (error) {
        console.error('Error while fetching profile for Mastodon account update:', error)
        return mastodonError(set, 502, translate(locale, 'profile.currentFetchFailed'))
      }

      try {
        const updateInput = {
          ...asRecord(query),
          ...asRecord(body)
        }
        const actor = applyMastodonProfileUpdate(currentProfile, updateInput, auth.user)
        await ActivityPod.updateProfile(auth.user, actor)
        const updated = await ActivityPod.getProfile(auth.user)
        return toMastodonCredentialAccount(updated, auth.user)
      } catch (error) {
        if (error instanceof MastodonApiValidationError) {
          return mastodonError(set, error.status, error.message)
        }

        console.error('Error while updating Mastodon credential account:', error)
        return mastodonError(set, 502, translate(locale, 'profile.updateFailed'))
      }
    },
    {
      body: t.Any(),
      response: {
        200: t.Any(),
        401: t.Object({ error: t.String() }),
        422: t.Object({ error: t.String() }),
        502: t.Object({ error: t.String() })
      },
      detail: { description: 'Mastodon-compatible account credential update' }
    }
  )
  .get(
    '/api/v1/profile',
    async ({ set, headers, jwt }: any) => {
      const locale = localeFromHeaders(headers)
      const auth = await authenticate(headers, jwt)
      if (!auth) {
        return mastodonError(set, 401, translate(locale, 'common.mustBeSignedIn'))
      }

      try {
        const actor = await ActivityPod.getProfile(auth.user)
        return toMastodonProfile(actor, auth.user)
      } catch (error) {
        console.error('Error while fetching Mastodon profile:', error)
        return mastodonError(set, 502, translate(locale, 'profile.fetchFailed'))
      }
    },
    {
      response: {
        200: t.Any(),
        401: t.Object({ error: t.String() }),
        502: t.Object({ error: t.String() })
      },
      detail: { description: 'Mastodon-compatible profile response' }
    }
  )
  .patch(
    '/api/v1/profile',
    async ({ set, body, query, headers, jwt }: any) => {
      const locale = localeFromHeaders(headers)
      const auth = await authenticate(headers, jwt)
      if (!auth) {
        return mastodonError(set, 401, translate(locale, 'common.mustBeSignedIn'))
      }

      let currentProfile: Record<string, unknown>
      try {
        currentProfile = await ActivityPod.getProfile(auth.user)
      } catch (error) {
        console.error('Error while fetching profile for Mastodon profile update:', error)
        return mastodonError(set, 502, translate(locale, 'profile.currentFetchFailed'))
      }

      try {
        const updateInput = {
          ...asRecord(query),
          ...asRecord(body)
        }
        const actor = applyMastodonProfileUpdate(currentProfile, updateInput, auth.user)
        await ActivityPod.updateProfile(auth.user, actor)
        const updated = await ActivityPod.getProfile(auth.user)
        return toMastodonProfile(updated, auth.user)
      } catch (error) {
        if (error instanceof MastodonApiValidationError) {
          return mastodonError(set, error.status, error.message)
        }

        console.error('Error while updating Mastodon profile:', error)
        return mastodonError(set, 502, translate(locale, 'profile.updateFailed'))
      }
    },
    {
      body: t.Any(),
      response: {
        200: t.Any(),
        401: t.Object({ error: t.String() }),
        422: t.Object({ error: t.String() }),
        502: t.Object({ error: t.String() })
      },
      detail: { description: 'Mastodon-compatible profile update' }
    }
  )

export default mastodonApiPlugin
