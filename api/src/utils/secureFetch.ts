/**
 * `secureFetch` — outbound HTTP(S) request with full URL hygiene.
 *
 * Pipeline (per call, and per redirect hop):
 *   1. `sanitizeHttpUrl` — scheme / userinfo / private IP literal / numeric host.
 *   2. `assertPublicHost` — DNS lookup; every A/AAAA record must be public.
 *   3. `passesSafeBrowsing` — Google Safe Browsing v5alpha1 (no-op when
 *      `GOOGLE_SAFE_BROWSING_API_KEY` is unset).
 *   4. `fetch(url, { redirect: 'manual' })` — manual redirect handling so
 *      every Location target is re-validated through steps 1–3 before the
 *      next hop is issued.
 *
 * Returns the final `Response` together with the validated final URL.
 * Throws `UrlGuardError` for guard rejections, or the underlying fetch
 * error (e.g. `AbortError`) for transport failures.
 */

import { sanitizeHttpUrl, assertPublicHost, UrlGuardError } from './urlGuards'
import { passesSafeBrowsing } from './safeBrowsing'

export interface SecureFetchOptions extends RequestInit {
  timeoutMs?: number
  maxRedirects?: number
  /** Skip the Safe Browsing call (e.g. internal trusted services). */
  skipSafeBrowsing?: boolean
}

export interface SecureFetchResult {
  response: Response
  finalUrl: string
}

const DEFAULT_TIMEOUT_MS = 4_500
const DEFAULT_MAX_REDIRECTS = 5

async function validateAndCheck(url: string, skipSafeBrowsing: boolean): Promise<string> {
  const sanitized = sanitizeHttpUrl(url)
  await assertPublicHost(new URL(sanitized).hostname)
  if (!skipSafeBrowsing && !(await passesSafeBrowsing(sanitized))) {
    throw new UrlGuardError('parse', 'url failed safe browsing check')
  }
  return sanitized
}

export async function secureFetch(
  rawUrl: string,
  options: SecureFetchOptions = {},
): Promise<SecureFetchResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    skipSafeBrowsing = false,
    signal: callerSignal,
    redirect: _ignoredRedirect, // we always handle redirects manually
    ...restInit
  } = options

  let currentUrl = await validateAndCheck(rawUrl, skipSafeBrowsing)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('secureFetch timeout')), timeoutMs)
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason)
    else callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), { once: true })
  }

  try {
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const response = await fetch(currentUrl, {
        ...restInit,
        redirect: 'manual',
        signal: controller.signal,
      })

      const status = response.status
      const isRedirect = status === 301 || status === 302 || status === 303 || status === 307 || status === 308
      const location = response.headers.get('location')
      if (isRedirect && location) {
        // Resolve relative redirects against the current URL, then re-validate.
        let nextUrl: string
        try {
          nextUrl = new URL(location, currentUrl).toString()
        } catch {
          throw new UrlGuardError('parse', 'redirect Location header is not a valid URL')
        }
        // Drain the response body so the connection can be released.
        try {
          await response.body?.cancel()
        } catch {
          // ignore
        }
        currentUrl = await validateAndCheck(nextUrl, skipSafeBrowsing)
        continue
      }

      return { response, finalUrl: currentUrl }
    }

    throw new UrlGuardError('parse', `too many redirects (>${maxRedirects})`)
  } finally {
    clearTimeout(timeout)
  }
}
