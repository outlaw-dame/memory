/**
 * Google Safe Browsing v5alpha1 integration for the Memory API.
 *
 * Mirrors the contract used by the ActivityPods backend
 * (pod-provider/backend/utils/opengraph.js) and the Fedify sidecar
 * (mastopod-federation-architecture/fedify-sidecar/src/utils/opengraph.ts):
 *
 *   - `GOOGLE_SAFE_BROWSING_API_KEY` (preferred) or `SAFE_BROWSING_API_KEY`
 *     supplies the API key. When neither is set the check is disabled and
 *     the function returns `true`.
 *   - `SAFE_BROWSING_FAIL_CLOSED=1` flips the default fail-open behavior on
 *     transport / parse errors so that ambiguous results block the URL.
 *   - 2.5s request timeout via `AbortSignal.timeout` (Bun + Node 20+).
 *   - Threats array on the response (any non-empty `threats[]`) means the
 *     URL is flagged.
 */

const SAFE_BROWSING_TIMEOUT_MS = 2_500
const SAFE_BROWSING_ENDPOINT = 'https://safebrowsing.googleapis.com/v5alpha1/urls:search'

interface SafeBrowsingThreatsResponse {
  threats?: unknown
}

function getApiKey(): string | null {
  const primary = process.env.GOOGLE_SAFE_BROWSING_API_KEY
  if (primary && primary.trim().length > 0) return primary.trim()
  const fallback = process.env.SAFE_BROWSING_API_KEY
  if (fallback && fallback.trim().length > 0) return fallback.trim()
  return null
}

function failClosed(): boolean {
  const v = process.env.SAFE_BROWSING_FAIL_CLOSED
  return v === '1' || v === 'true'
}

/**
 * Returns `true` when the URL is safe (or check disabled), `false` when the
 * Safe Browsing API reports threats (or fail-closed and an error occurred).
 *
 * Never throws; on transport errors it logs at `console.warn` and returns
 * the configured default (open by default, closed when SAFE_BROWSING_FAIL_CLOSED).
 */
export async function passesSafeBrowsing(targetUrl: string): Promise<boolean> {
  const key = getApiKey()
  if (!key) return true

  let parsed: URL
  try {
    parsed = new URL(targetUrl)
  } catch {
    // Caller should have sanitized; treat malformed input as unsafe.
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const url = `${SAFE_BROWSING_ENDPOINT}?urls=${encodeURIComponent(parsed.toString())}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-goog-api-key': key,
      },
      signal: AbortSignal.timeout(SAFE_BROWSING_TIMEOUT_MS),
    })

    if (!response.ok) {
      // Treat upstream errors per fail-open / fail-closed policy.
      console.warn(`[safeBrowsing] upstream status ${response.status}; ${failClosed() ? 'blocking' : 'allowing'} url`)
      return !failClosed()
    }

    let body: SafeBrowsingThreatsResponse
    try {
      body = (await response.json()) as SafeBrowsingThreatsResponse
    } catch {
      return !failClosed()
    }
    if (!body || typeof body !== 'object') return !failClosed()
    const threats = body.threats
    if (Array.isArray(threats) && threats.length > 0) return false
    return true
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown'
    console.warn(`[safeBrowsing] check failed (${reason}); ${failClosed() ? 'blocking' : 'allowing'} url`)
    return !failClosed()
  }
}
