import Elysia from 'elysia'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import setupPlugin from './setup'
import User from '../decorater/User'
import { getTokenObject } from '../services/jwt'
import { syncAtprotoIdentity } from '../services/WebIdProfileService'

/**
 * How long (in ms) to wait for the ATProto identity link before issuing the
 * session token without it.  The link will be retried on the next sign-in.
 * Kept short so authentication latency stays acceptable.
 */
const ATPROTO_LINK_DEADLINE_MS = 1_500

const oidcAuthPlugin = new Elysia({ prefix: '/oidc-auth' })
  .use(setupPlugin)
  .post('/callback', async ({ body, jwt, set }) => {
    const fail = (status: number, message: string) => {
      set.status = status
      return message
    }

    const payload = body as Record<string, unknown>

    // -----------------------------------------------------------------------
    // Phase 1 — OIDC Prepare
    // When `code` is absent the client is initiating the flow.  We fetch the
    // provider's OIDC discovery document and construct the authorization URL
    // using the Memory app's stable client_id (its Solid OIDC client document).
    // -----------------------------------------------------------------------
    if (typeof payload.code !== 'string') {
      const providerEndpoint = String(payload.providerEndpoint || '')
      const redirectUri = String(payload.redirectUri || '')
      const state = String(payload.state || '')
      const codeChallenge = String(payload.codeChallenge || '')

      if (!providerEndpoint || !redirectUri || !state || !codeChallenge) {
        return fail(400, 'Missing OIDC prepare parameters')
      }

      try {
        const metadata = await fetch(`${providerEndpoint}/.well-known/openid-configuration`).then(async response => {
          if (!response.ok) {
            throw new Error(await response.text())
          }
          return response.json() as Promise<Record<string, string>>
        })

        // Use the Memory app's stable Solid OIDC client document URL as client_id.
        // The pod provider fetches this document to verify redirect_uris instead of
        // relying on dynamic client registration (which creates a new client ID each
        // time and is not how Solid OIDC apps are supposed to identify themselves).
        const apiUrl = (process.env.API_URL || `http://localhost:${process.env.API_PORT || 8794}`).replace(/\/$/, '')
        const clientId = `${apiUrl}/oauth/client.json`

        const authorizationUrl = new URL(metadata.authorization_endpoint)
        authorizationUrl.searchParams.set('client_id', clientId)
        authorizationUrl.searchParams.set('redirect_uri', redirectUri)
        authorizationUrl.searchParams.set('response_type', 'code')
        authorizationUrl.searchParams.set('scope', 'openid profile webid offline_access')
        authorizationUrl.searchParams.set('code_challenge', codeChallenge)
        authorizationUrl.searchParams.set('code_challenge_method', 'S256')
        authorizationUrl.searchParams.set('state', state)

        return {
          authorizationUrl: authorizationUrl.toString(),
          clientId
        }
      } catch (e) {
        console.error('Error while preparing OIDC login: ', e)
        return fail(500, 'Unable to prepare OIDC login')
      }
    }

    // -----------------------------------------------------------------------
    // Phase 2 — OIDC Callback (authorization code exchange)
    // -----------------------------------------------------------------------
    const providerEndpoint = String(payload.providerEndpoint || '')
    const redirectUri = String(payload.redirectUri || '')
    const clientId = String(payload.clientId || '')
    const code = String(payload.code || '')
    const codeVerifier = String(payload.codeVerifier || '')

    if (!providerEndpoint || !redirectUri || !clientId || !code || !codeVerifier) {
      return fail(400, 'Missing OIDC callback parameters')
    }

    try {
      const metadata = await fetch(`${providerEndpoint}/.well-known/openid-configuration`).then(async response => {
        if (!response.ok) {
          throw new Error(await response.text())
        }
        return response.json() as Promise<Record<string, string>>
      })

      const tokenBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
      })

      const tokens = await fetch(metadata.token_endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenBody
      }).then(async response => {
        if (!response.ok) {
          throw new Error(await response.text())
        }
        return response.json() as Promise<{ access_token: string; id_token?: string }>
      })

      const claims = decodeJwtPayload(tokens.id_token || tokens.access_token)
      const webId = claims.webid || claims.sub || claims.azp

      if (!tokens.access_token || !webId) {
        return fail(400, 'OIDC provider did not return a usable access token')
      }

      // Upsert the local user record keyed on WebID.
      let dbUserRows = await db.select().from(users).where(eq(users.webId, webId))
      if (dbUserRows.length === 0) {
        dbUserRows = await db
          .insert(users)
          .values({
            name: getNameFromWebId(webId),
            email: `${Buffer.from(webId).toString('base64url')}@memory.local`,
            webId,
            providerEndpoint
          })
          .returning()
      }
      let dbUser = dbUserRows[0]

      // -----------------------------------------------------------------------
      // ATProto identity linking
      //
      // Attempt to link the user's ATProto DID/handle by fetching their WebID
      // profile and reading the schema:sameAs / alsoKnownAs triples written by
      // the mastopod federation sidecar.
      //
      // We race against ATPROTO_LINK_DEADLINE_MS so sign-in latency stays
      // acceptable.  If the deadline is exceeded the token is issued without
      // ATProto data; the identity will be linked on the next sign-in.
      // Authentication MUST succeed regardless of whether linking succeeds.
      // -----------------------------------------------------------------------
      const syncPromise = syncAtprotoIdentity(dbUser, webId, tokens.access_token)
      const deadline = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), ATPROTO_LINK_DEADLINE_MS)
      )
      const synced = await Promise.race([syncPromise, deadline])
      if (synced) {
        dbUser = synced
      }

      // -----------------------------------------------------------------------
      // Pod-native token selection
      //
      // ActivityPods verifies outbox-write Bearer tokens against its own RS256
      // key (via auth.jwt.verifyToken), which is different from the OIDC
      // provider's signing key. The OIDC access_token is therefore rejected by
      // the pod for any write operation.
      //
      // If this user has previously signed in via the legacy /signin route,
      // their pod-native JWT is stored in users.pod_token. Use that for pod
      // writes. Fall back to the OIDC access_token only for read operations
      // (WebID profile fetch etc.).
      // -----------------------------------------------------------------------
      const podWriteToken = dbUser.podToken || tokens.access_token

      const tokenObject = getTokenObject(new User(dbUser, podWriteToken))
      const token = await jwt.sign(tokenObject)

      return {
        token,
        user: dbUser
      }
    } catch (e) {
      console.error('Error while completing OIDC login: ', e)
      return fail(500, 'Unable to complete OIDC login')
    }
  })

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function decodeJwtPayload(token: string): Record<string, string> {
  const [, payload] = token.split('.')
  if (!payload) throw new Error('Invalid JWT payload')
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, string>
}

function getNameFromWebId(webId: string): string {
  try {
    const url = new URL(webId)
    const segment = url.pathname.split('/').filter(Boolean).at(-1)
    return segment || url.hostname
  } catch {
    return webId
  }
}

export default oidcAuthPlugin
