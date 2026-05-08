import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { passesSafeBrowsing } from './safeBrowsing'

const ENV_KEYS = [
  'GOOGLE_SAFE_BROWSING_API_KEY',
  'SAFE_BROWSING_API_KEY',
  'SAFE_BROWSING_FAIL_CLOSED',
] as const

const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}
const originalFetch = globalThis.fetch

function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}

beforeEach(() => {
  for (const k of ENV_KEYS) originalEnv[k] = process.env[k]
})

afterEach(() => {
  for (const k of ENV_KEYS) setEnv(k, originalEnv[k])
  globalThis.fetch = originalFetch
})

describe('passesSafeBrowsing', () => {
  test('returns true when no API key is configured (disabled)', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', undefined)
    setEnv('SAFE_BROWSING_API_KEY', undefined)
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    expect(await passesSafeBrowsing('https://example.com/')).toBe(true)
    expect(called).toBe(false)
  })

  test('returns true when API responds with no threats', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url.toString()
      expect(u).toContain('safebrowsing.googleapis.com')
      expect(u).toContain('urls=https%3A%2F%2Fexample.com%2F')
      const headers = new Headers(init?.headers)
      expect(headers.get('x-goog-api-key')).toBe('test-key')
      return new Response(JSON.stringify({ threats: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    expect(await passesSafeBrowsing('https://example.com/')).toBe(true)
  })

  test('returns false when API reports any threats', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ threats: [{ threatType: 'MALWARE' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch
    expect(await passesSafeBrowsing('https://bad.example.com/')).toBe(false)
  })

  test('fail-open by default on transport error', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    setEnv('SAFE_BROWSING_FAIL_CLOSED', undefined)
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as typeof fetch
    expect(await passesSafeBrowsing('https://example.com/')).toBe(true)
  })

  test('fail-closed mode blocks on transport error', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    setEnv('SAFE_BROWSING_FAIL_CLOSED', '1')
    globalThis.fetch = (async () => {
      throw new Error('network down')
    }) as typeof fetch
    expect(await passesSafeBrowsing('https://example.com/')).toBe(false)
  })

  test('fail-closed mode blocks on HTTP error status', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    setEnv('SAFE_BROWSING_FAIL_CLOSED', '1')
    globalThis.fetch = (async () => new Response('boom', { status: 500 })) as typeof fetch
    expect(await passesSafeBrowsing('https://example.com/')).toBe(false)
  })

  test('fails closed on malformed JSON when configured', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    setEnv('SAFE_BROWSING_FAIL_CLOSED', '1')
    globalThis.fetch = (async () =>
      new Response('not-json', { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
    expect(await passesSafeBrowsing('https://example.com/')).toBe(false)
  })

  test('rejects non-http(s) URLs', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'test-key')
    expect(await passesSafeBrowsing('javascript:alert(1)')).toBe(false)
    expect(await passesSafeBrowsing('file:///etc/passwd')).toBe(false)
  })

  test('GOOGLE_SAFE_BROWSING_API_KEY takes precedence over SAFE_BROWSING_API_KEY', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', 'preferred-key')
    setEnv('SAFE_BROWSING_API_KEY', 'fallback-key')
    let observed = ''
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      observed = new Headers(init?.headers).get('x-goog-api-key') ?? ''
      return new Response(JSON.stringify({ threats: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    await passesSafeBrowsing('https://example.com/')
    expect(observed).toBe('preferred-key')
  })

  test('falls back to SAFE_BROWSING_API_KEY when primary missing', async () => {
    setEnv('GOOGLE_SAFE_BROWSING_API_KEY', undefined)
    setEnv('SAFE_BROWSING_API_KEY', 'fallback-key')
    let observed = ''
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      observed = new Headers(init?.headers).get('x-goog-api-key') ?? ''
      return new Response(JSON.stringify({ threats: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }) as typeof fetch
    await passesSafeBrowsing('https://example.com/')
    expect(observed).toBe('fallback-key')
  })
})
