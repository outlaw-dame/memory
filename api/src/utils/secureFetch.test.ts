import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { secureFetch } from './secureFetch'
import { UrlGuardError } from './urlGuards'

const ENV_KEYS = ['GOOGLE_SAFE_BROWSING_API_KEY', 'SAFE_BROWSING_API_KEY', 'SAFE_BROWSING_FAIL_CLOSED'] as const
const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}
const originalFetch = globalThis.fetch

function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

beforeEach(() => {
  for (const k of ENV_KEYS) originalEnv[k] = process.env[k]
  // Disable Safe Browsing for these tests so they run against a fake transport only.
  setEnv('GOOGLE_SAFE_BROWSING_API_KEY', undefined)
  setEnv('SAFE_BROWSING_API_KEY', undefined)
})

afterEach(() => {
  for (const k of ENV_KEYS) setEnv(k, originalEnv[k])
  globalThis.fetch = originalFetch
})

function makeRedirect(location: string, status = 302): Response {
  return new Response(null, { status, headers: { location } })
}

describe('secureFetch', () => {
  test('rejects javascript: and other non-http(s) schemes', async () => {
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('x')
    }) as typeof fetch
    await expect(secureFetch('javascript:alert(1)')).rejects.toBeInstanceOf(UrlGuardError)
    expect(called).toBe(false)
  })

  test('rejects URLs with userinfo before issuing fetch', async () => {
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('x')
    }) as typeof fetch
    await expect(secureFetch('https://attacker:pw@example.com/')).rejects.toBeInstanceOf(UrlGuardError)
    expect(called).toBe(false)
  })

  test('rejects literal private IP hosts before issuing fetch', async () => {
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('x')
    }) as typeof fetch
    await expect(secureFetch('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(UrlGuardError)
    expect(called).toBe(false)
  })

  test('follows redirects manually and re-validates each hop', async () => {
    const calls: string[] = []
    globalThis.fetch = (async (url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString()
      calls.push(u)
      if (u === 'https://example.com/start') return makeRedirect('https://example.com/middle')
      if (u === 'https://example.com/middle') return makeRedirect('/final', 301)
      if (u === 'https://example.com/final') return new Response('ok', { status: 200 })
      return new Response('unexpected', { status: 500 })
    }) as typeof fetch

    const { response, finalUrl } = await secureFetch('https://example.com/start')
    expect(response.status).toBe(200)
    expect(finalUrl).toBe('https://example.com/final')
    expect(calls).toEqual([
      'https://example.com/start',
      'https://example.com/middle',
      'https://example.com/final',
    ])
  })

  test('rejects redirects pointing to private IP literals', async () => {
    globalThis.fetch = (async (url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString()
      if (u === 'https://example.com/start') return makeRedirect('http://169.254.169.254/admin')
      return new Response('should-not-reach', { status: 200 })
    }) as typeof fetch
    await expect(secureFetch('https://example.com/start')).rejects.toThrow(/private|local/i)
  })

  test('rejects redirects to non-http(s) schemes', async () => {
    globalThis.fetch = (async () => makeRedirect('file:///etc/passwd')) as typeof fetch
    await expect(secureFetch('https://example.com/')).rejects.toThrow(/http\(s\)/)
  })

  test('caps total redirects', async () => {
    let n = 0
    globalThis.fetch = (async () => {
      n += 1
      return makeRedirect(`https://example.com/${n}`)
    }) as typeof fetch
    await expect(secureFetch('https://example.com/0', { maxRedirects: 3 })).rejects.toThrow(/too many redirects/i)
    expect(n).toBe(4) // initial + 3 redirects
  })

  test('returns the response unchanged for non-redirect statuses', async () => {
    globalThis.fetch = (async () => new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } })) as typeof fetch
    const { response, finalUrl } = await secureFetch('https://example.com/page')
    expect(await response.text()).toBe('hello')
    expect(finalUrl).toBe('https://example.com/page')
  })

  test('honors caller-provided AbortSignal', async () => {
    const ac = new AbortController()
    ac.abort(new Error('caller aborted'))
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      // Bun fetch will throw on aborted signal — emulate that.
      if (init?.signal?.aborted) throw init.signal.reason ?? new Error('aborted')
      return new Response('x')
    }) as typeof fetch
    await expect(secureFetch('https://example.com/', { signal: ac.signal })).rejects.toThrow()
  })

  test('runs Safe Browsing on every redirect hop when configured', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    const sbCalls: string[] = []
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString()
      if (u.startsWith('https://safebrowsing.googleapis.com/')) {
        sbCalls.push(u)
        return new Response(JSON.stringify({ threats: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (u === 'https://example.com/a') return makeRedirect('https://example.com/b')
      if (u === 'https://example.com/b') return new Response('ok', { status: 200 })
      return new Response('unexpected', { status: 500 })
    }) as typeof fetch

    await secureFetch('https://example.com/a')
    expect(sbCalls.length).toBe(2) // initial URL + 1 redirect
  })

  test('blocks initial url when Safe Browsing reports threats', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    globalThis.fetch = (async (url: string | URL) => {
      const u = typeof url === 'string' ? url : url.toString()
      if (u.startsWith('https://safebrowsing.googleapis.com/')) {
        return new Response(JSON.stringify({ threats: [{ threatType: 'MALWARE' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      throw new Error('should not be reached')
    }) as typeof fetch
    await expect(secureFetch('https://example.com/')).rejects.toThrow(/safe browsing/i)
  })
})
