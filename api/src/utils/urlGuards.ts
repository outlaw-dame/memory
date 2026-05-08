/**
 * URL hygiene primitives shared across the Memory API.
 *
 * Two layers of defence:
 *   1. **Static sanitization** (`sanitizeHttpUrl`) — fast, synchronous parse
 *      that rejects non-http(s), userinfo, loopback / private IPv4 + IPv6
 *      literals, decimal-encoded IP hostnames, and reserved/doc/multicast
 *      ranges.  Used everywhere a URL is read from user input or remote
 *      JSON before being stored or fetched.
 *   2. **Live DNS validation** (`assertPublicHost`) — async lookup that
 *      ensures *every* returned A/AAAA record points outside the private
 *      ranges enforced by sanitization.  Used by `secureFetch` immediately
 *      before issuing the network request to mitigate DNS-rebind attacks.
 *
 * NOTE on residual rebind risk: Bun's built-in `fetch` does not expose an
 * agent / dispatcher hook to pin the connection to the resolved IP, so a
 * narrow TOCTOU window remains between the `lookup()` and the kernel's
 * resolver inside `fetch()`. The window is small and well-formed attacks
 * are not common against Bun, but a future hardening pass should pin the
 * connection (e.g. via undici Agent with `connect: { lookup }`) when the
 * sidecar moves to a Node-only runtime.
 */

import { lookup } from 'node:dns/promises'

interface LookupAddress {
  address: string
  family: number
}

export class UrlGuardError extends Error {
  code: 'parse' | 'scheme' | 'credentials' | 'private' | 'numeric' | 'dns'
  constructor(code: UrlGuardError['code'], message: string) {
    super(message)
    this.code = code
    this.name = 'UrlGuardError'
  }
}

// Combined IPv4 blocklist:
//   0.0.0.0/8 (this network), 10/8 (RFC1918),
//   100.64/10 (CGNAT, narrowed),
//   127/8 (loopback), 169.254/16 (link-local),
//   172.16/12 (RFC1918), 192.0.0/24 + 192.0.2/24 (IETF doc),
//   192.88.99/24 (deprecated 6to4), 192.168/16 (RFC1918),
//   198.18/15 (benchmarking), 203.0.113/24 (doc),
//   224/4 (multicast 224-239), 240/4 narrowed (240-255).
const PRIVATE_IPV4_PATTERN =
  /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(1[89])\.|192\.0\.[02]\.|192\.88\.99\.|203\.0\.113\.|22[4-9]\.|2[3-5]\d\.)/

// Decimal / hex encodings of the host (e.g. 2130706433 → 127.0.0.1).
const NUMERIC_HOSTNAME = /^(0x[0-9a-f]+|[0-9]+)$/i

export function isBlockedIpv4Literal(ip: string): boolean {
  return PRIVATE_IPV4_PATTERN.test(ip)
}

export function isBlockedIpv6Literal(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!h.includes(':')) return false
  if (h === '::' || h === '::1') return true // unspecified, loopback
  if (h.startsWith('fe80:') || h.startsWith('fe80::')) return true // link-local
  if (h.startsWith('fc') || h.startsWith('fd')) return true // unique local fc00::/7
  if (h.startsWith('ff')) return true // multicast
  if (h.startsWith('::ffff:')) return true // IPv4-mapped IPv6
  return false
}

/**
 * Synchronous sanitization. Throws `UrlGuardError` when the URL is unsafe.
 * Returns the canonical absolute URL on success.
 */
export function sanitizeHttpUrl(raw: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new UrlGuardError('parse', 'url must be a non-empty string')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new UrlGuardError('parse', 'url must be an absolute URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UrlGuardError('scheme', 'only http(s) URLs are supported')
  }

  if (parsed.username || parsed.password) {
    throw new UrlGuardError('credentials', 'URL credentials are not allowed')
  }

  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host === '[::1]' || host === '[::]') {
    throw new UrlGuardError('private', 'private or local addresses are not allowed')
  }
  if (PRIVATE_IPV4_PATTERN.test(host)) {
    throw new UrlGuardError('private', 'private or local addresses are not allowed')
  }
  if (isBlockedIpv6Literal(host)) {
    throw new UrlGuardError('private', 'private or local addresses are not allowed')
  }
  if (NUMERIC_HOSTNAME.test(host)) {
    throw new UrlGuardError('numeric', 'numeric host encodings are not allowed')
  }

  return parsed.toString()
}

/**
 * Resolve the host via DNS and assert that *every* returned IP is public.
 * Mitigates the common case of DNS-rebinding where a hostname is
 * cosmetically public but the A/AAAA record points at 169.254.169.254
 * or other private space.
 *
 * Skips DNS for IP-literal hosts (already validated by `sanitizeHttpUrl`).
 */
export async function assertPublicHost(host: string): Promise<void> {
  const lower = host.toLowerCase()

  // IPv4 literal — already validated upstream.
  if (/^[0-9.]+$/.test(lower)) return
  // IPv6 literal — already validated upstream.
  if (lower.includes(':')) return

  let addresses: LookupAddress[]
  try {
    addresses = await lookup(host, { all: true, verbatim: true })
  } catch (err) {
    throw new UrlGuardError('dns', `dns lookup failed: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  if (addresses.length === 0) {
    throw new UrlGuardError('dns', 'host did not resolve to any address')
  }

  for (const a of addresses) {
    if (a.family === 4) {
      if (isBlockedIpv4Literal(a.address)) {
        throw new UrlGuardError('private', `host resolved to private IPv4 address`)
      }
    } else if (a.family === 6) {
      if (isBlockedIpv6Literal(a.address)) {
        throw new UrlGuardError('private', `host resolved to private IPv6 address`)
      }
    }
  }
}

/**
 * Pure-validation predicate for places that *store* URLs without fetching
 * them (e.g. cached AP actor avatar/banner URLs that the browser will
 * later request).  Returns `true` only when the URL passes the same
 * scheme/credential/private-IP checks as `sanitizeHttpUrl`.
 *
 * Bounded length is enforced separately by callers.
 */
export function isPublicHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    sanitizeHttpUrl(value)
    return true
  } catch {
    return false
  }
}
