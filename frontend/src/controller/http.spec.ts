import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocale, setLocale } from '@/i18n'
import { buildApiHeaders, getApiBaseUrl } from './http'

describe('HTTP i18n helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the configured API base URL when present', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.memory.test')

    expect(getApiBaseUrl()).toBe('https://api.memory.test')
  })

  it('adds the selected locale and auth token to API headers', () => {
    setLocale('es-MX')

    const headers = buildApiHeaders({
      authToken: 'token-123',
      includeJsonContentType: true,
      headers: {
        'X-Trace-Id': 'trace-1'
      }
    })

    expect(getLocale()).toBe('es')
    expect(headers['accept-language']).toBe('es')
    expect(headers['content-type']).toBe('application/json')
    expect(headers.auth).toBe('token-123')
    expect(headers['x-trace-id']).toBe('trace-1')
  })

  it('omits auth when no token is provided', () => {
    const headers = buildApiHeaders()

    expect(headers['accept-language']).toBe('en')
    expect(headers.auth).toBeUndefined()
  })
})
