import type User from "@/decorater/User"
import type { JWTPayloadSpec } from "@elysiajs/jwt"

export interface TokenObject {
  user: string
}

export function getTokenObject(user: User): Record<string, string | number> & JWTPayloadSpec {
    return {
      user: JSON.stringify(user)
    }
  }
