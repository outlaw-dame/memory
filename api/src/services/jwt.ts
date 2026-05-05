import type User from "../decorater/User"
import type { JWTPayloadSpec } from "@elysiajs/jwt"

export interface TokenObject {
  user: string
  sessionVersion: number
}

export const SESSION_TOKEN_VERSION = 2

export function isCurrentSessionToken(value: unknown): value is TokenObject {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return payload.sessionVersion === SESSION_TOKEN_VERSION && typeof payload.user === 'string'
}

export function getTokenObject(user: User): Record<string, string | number> & JWTPayloadSpec {
    const sessionUser = {
      userId: user.userId,
      userName: user.userName,
      endpoint: user.endpoint,
      webId: user.getWebId(),
      atprotoDid: user.atprotoDid,
      atprotoHandle: user.atprotoHandle,
    }

    return {
      user: JSON.stringify(sessionUser),
      sessionVersion: SESSION_TOKEN_VERSION,
    }
  }
