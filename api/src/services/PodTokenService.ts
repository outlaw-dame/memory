import { eq } from 'drizzle-orm'
import User from '../decorater/User'
import { db } from '../db/client'
import { users } from '../db/schema'
import type { SelectUsers } from '../types'
import {
  decryptToken,
  encryptToken,
  shouldReencryptSecret,
} from './TokenVault'

export type PublicUser = Omit<SelectUsers, 'podToken'>

export function toPublicUser(user: SelectUsers): PublicUser {
  const { podToken: _podToken, ...publicUser } = user
  return publicUser
}

async function opportunisticallyReencryptPodToken(userId: number, storedToken: string, plainToken: string) {
  if (!shouldReencryptSecret(storedToken)) return

  try {
    await db
      .update(users)
      .set({ podToken: encryptToken(plainToken) })
      .where(eq(users.id, userId))
  } catch (error) {
    console.warn('[PodTokenService] Unable to re-encrypt legacy Pod token', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function decryptPodTokenForUser(user: SelectUsers): Promise<string | null> {
  const token = decryptToken(user.podToken)
  if (token && user.podToken) {
    await opportunisticallyReencryptPodToken(user.id, user.podToken, token)
  }
  return token
}

export async function hydrateUserPodToken(user: User): Promise<void> {
  if (!user.userId) {
    user.token = ''
    return
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.userId))
    .limit(1)

  if (!dbUser) {
    user.token = ''
    return
  }

  user.userName = dbUser.name
  user.endpoint = dbUser.providerEndpoint
  user.webId = dbUser.webId
  user.atprotoDid = dbUser.atprotoDid ?? null
  user.atprotoHandle = dbUser.atprotoHandle ?? null
  user.token = (await decryptPodTokenForUser(dbUser)) ?? ''
}
