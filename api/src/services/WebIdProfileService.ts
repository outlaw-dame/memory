/**
 * WebIdProfileService
 *
 * Resolves the ATProto identity linked to a Solid/ActivityPods WebID by
 * fetching the user's WebID profile document and parsing the identity-linking
 * triples injected by the mastopod federation sidecar (WebIdProjectionService).
 *
 * The sidecar writes two kinds of links:
 *   schema:sameAs  <at://did:plc:xxxxx>   (the ATProto DID)
 *   foaf:account   <at://alice.pod.example>  (the ATProto handle)
 *
 * It also mirrors the DID in alsoKnownAs on the ActivityPub actor document,
 * so we check that field as a fallback.
 *
 * Security notes:
 *   - The webIdUrl comes from a signed OIDC id_token issued by the pod
 *     provider; it is trusted enough to use as a fetch target.
 *   - We validate every candidate DID/handle before storing to prevent
 *     injection of malformed values into the database.
 *   - Content from the remote document is never evaluated as code; it is only
 *     parsed as JSON and then compared against allow-list patterns.
 *   - Fetch errors are swallowed — this service MUST NOT block authentication.
 */

import ky, { type Options as KyOptions } from 'ky'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { atIdentities } from '../db/atBridgeSchema'
import type { SelectUsers } from '../types'

// ---------------------------------------------------------------------------
// Constants & validation patterns
// ---------------------------------------------------------------------------

/**
 * W3C DID Core syntax: did:<method>:<method-specific-id>
 * - method: one or more lowercase alpha characters
 * - method-specific-id: base58/hex chars, colons, dots, hyphens, underscores,
 *   percent-encoded sequences
 * Max total length: 2048 chars (matches the at_identities.did column).
 */
const DID_RE = /^did:[a-z][a-z0-9]*:[a-zA-Z0-9._:%-]+$/

/**
 * ATProto handles are valid DNS hostnames (RFC 1123).
 * Each label: 1–63 chars, [a-zA-Z0-9-], no leading/trailing hyphen.
 * Max total length: 253 chars (DNS limit).
 */
const HANDLE_RE = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/

const DID_MAX_LEN = 2048
const HANDLE_MAX_LEN = 512

/** Fetch retry config: up to 3 attempts with exponential backoff (~0.3 / 0.6 / 1.2 s). */
const PROFILE_RETRY: KyOptions['retry'] = {
  limit: 3,
  methods: ['get'],
  statusCodes: [429, 500, 502, 503, 504],
  backoffLimit: 5_000
}

/** Hard timeout per attempt — profile fetches are non-critical. */
const PROFILE_TIMEOUT_MS = 5_000

// ---------------------------------------------------------------------------
// Public surface
// ---------------------------------------------------------------------------

export interface AtprotoIdentity {
  did: string
  handle: string | null
}

/**
 * Resolve the ATProto identity linked to a WebID profile.
 *
 * Fetches the WebID document (JSON-LD) with exponential backoff and parses
 * the schema:sameAs / foaf:account / alsoKnownAs predicates.
 *
 * Returns null if:
 *  - The WebID URL is not a valid http/https URL
 *  - The remote document cannot be fetched or parsed
 *  - No valid ATProto DID is found in the document
 *
 * NEVER throws — callers must not handle exceptions from this function.
 */
export async function resolveAtprotoIdentityFromWebId(
  webIdUrl: string,
  accessToken: string
): Promise<AtprotoIdentity | null> {
  const fetchUrl = stripFragment(webIdUrl)
  if (!fetchUrl) return null

  let doc: Record<string, unknown>
  try {
    doc = await ky
      .get(fetchUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/ld+json, application/json;q=0.8'
        },
        retry: PROFILE_RETRY,
        timeout: PROFILE_TIMEOUT_MS
      })
      .json<Record<string, unknown>>()
  } catch (err) {
    // Network errors, timeouts, and non-2xx responses — non-fatal.
    console.warn('[WebIdProfileService] Profile fetch failed, ATProto link deferred:', fetchUrl, String(err))
    return null
  }

  try {
    return parseAtprotoIdentity(doc)
  } catch (err) {
    console.warn('[WebIdProfileService] Profile parse failed:', String(err))
    return null
  }
}

/**
 * Synchronise the ATProto identity for a local user.
 *
 * If the user already has an atprotoDid stored, returns the existing record
 * immediately (no remote fetch needed — the identity is already linked).
 *
 * If the user has no DID yet, resolves the WebID profile and writes:
 *   1. users.atprotoDid / users.atprotoHandle
 *   2. at_identities.local_user_id  (upsert)
 *
 * Returns the (possibly updated) user row, or null if the link could not be
 * established (sign-in must still succeed in that case).
 *
 * NEVER throws.
 */
export async function syncAtprotoIdentity(
  existingUser: SelectUsers,
  webIdUrl: string,
  accessToken: string
): Promise<SelectUsers | null> {
  try {
    // Fast path: already linked.
    if (existingUser.atprotoDid) {
      return existingUser
    }

    const identity = await resolveAtprotoIdentityFromWebId(webIdUrl, accessToken)
    if (!identity) return null

    // Write identity into users table.
    const updated = await db
      .update(users)
      .set({
        atprotoDid: identity.did,
        atprotoHandle: identity.handle ?? null
      })
      .where(eq(users.id, existingUser.id))
      .returning()

    if (!updated[0]) return null

    // Upsert at_identities to establish the local_user_id link.
    await db
      .insert(atIdentities)
      .values({
        did: identity.did,
        handle: identity.handle ?? null,
        localUserId: existingUser.id,
        isActive: true,
        resolvedAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: atIdentities.did,
        set: {
          handle: identity.handle ?? null,
          localUserId: existingUser.id,
          updatedAt: new Date()
        }
      })

    console.info(
      `[WebIdProfileService] Linked ATProto identity for user ${existingUser.id}: did=${identity.did} handle=${identity.handle ?? '(none)'}`
    )

    return updated[0]
  } catch (err) {
    // DB errors, unexpected issues — non-fatal.
    console.error('[WebIdProfileService] syncAtprotoIdentity failed:', String(err))
    return null
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip the fragment identifier from a URL so we can fetch the document.
 * e.g. "https://pod.example/alice/profile/card#me" → "https://pod.example/alice/profile/card"
 * Returns null if the input is not a valid http/https URL.
 */
function stripFragment(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    u.hash = ''
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Parse a JSON-LD profile document and extract the ATProto DID and handle.
 *
 * Handles compacted, prefixed, and fully-qualified predicate forms:
 *   "sameAs"                     (schema.org base context)
 *   "schema:sameAs"              (prefixed)
 *   "http://schema.org/sameAs"   (expanded)
 *   "foaf:account"               (FOAF prefix)
 *   "http://xmlns.com/foaf/0.1/account"
 *   "alsoKnownAs"                (ActivityPub / AS2)
 *   "as:alsoKnownAs"
 *
 * Walks array-of-strings, array-of-objects (@value / @id), and plain strings.
 * Returns null if no valid ATProto DID is found.
 */
function parseAtprotoIdentity(doc: Record<string, unknown>): AtprotoIdentity | null {
  const sameAsValues = extractLdValues(doc,
    'sameAs',
    'schema:sameAs',
    'http://schema.org/sameAs'
  )

  const accountValues = extractLdValues(doc,
    'foaf:account',
    'http://xmlns.com/foaf/0.1/account'
  )

  const alsoKnownAsValues = extractLdValues(doc,
    'alsoKnownAs',
    'as:alsoKnownAs',
    'https://www.w3.org/ns/activitystreams#alsoKnownAs'
  )

  const allValues = [...sameAsValues, ...alsoKnownAsValues, ...accountValues]

  const did = extractDid(allValues)
  if (!did) return null

  const handle = extractHandle([...accountValues, ...alsoKnownAsValues, ...sameAsValues])

  return { did, handle }
}

/**
 * Extract all string values for one or more JSON-LD predicate keys from a
 * document node.  Handles:
 *   "key": "value"
 *   "key": ["value1", "value2"]
 *   "key": [{"@value": "value"}, {"@id": "value"}]
 */
function extractLdValues(doc: Record<string, unknown>, ...keys: string[]): string[] {
  const results: string[] = []
  for (const key of keys) {
    const raw = doc[key]
    if (raw == null) continue
    const items = Array.isArray(raw) ? raw : [raw]
    for (const item of items) {
      if (typeof item === 'string') {
        results.push(item)
      } else if (item !== null && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const v = obj['@value'] ?? obj['@id']
        if (typeof v === 'string') results.push(v)
      }
    }
  }
  return results
}

/**
 * Find the first valid ATProto DID in a list of URI strings.
 * Accepts both bare DIDs ("did:plc:xxxxx") and at:-schemed URIs
 * ("at://did:plc:xxxxx").
 */
function extractDid(values: string[]): string | null {
  for (const v of values) {
    // Normalise: strip "at://" prefix if present
    const candidate = v.startsWith('at://did:') ? v.slice(5) : v
    if (
      candidate.length <= DID_MAX_LEN &&
      DID_RE.test(candidate)
    ) {
      return candidate
    }
  }
  return null
}

/**
 * Find the first valid ATProto handle in a list of URI strings.
 * Only matches "at://"-prefixed values where the suffix is NOT a DID
 * (i.e. it's a DNS handle like "alice.pod.example").
 */
function extractHandle(values: string[]): string | null {
  for (const v of values) {
    if (!v.startsWith('at://')) continue
    const candidate = v.slice(5) // strip "at://"
    if (candidate.startsWith('did:')) continue // that's a DID URI, not a handle
    if (
      candidate.length <= HANDLE_MAX_LEN &&
      HANDLE_RE.test(candidate)
    ) {
      return candidate
    }
  }
  return null
}
