import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getLocale, setLocale } from '../i18n'
import { buildApiHeaders, getApiBaseUrl } from './http'

const storage = new Map<string, string>()

function installWindowShim() {
  const localStorageShim: Storage = {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key) ?? null : null
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
    removeItem(key: string) {
      storage.delete(key)
    },
    clear() {
      storage.clear()
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null
    },
    get length() {
      return storage.size
    }
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: localStorageShim
    }
  })

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: localStorageShim
  })
}

function uninstallWindowShim() {
  Reflect.deleteProperty(globalThis as typeof globalThis & Record<string, unknown>, 'window')
  Reflect.deleteProperty(globalThis as typeof globalThis & Record<string, unknown>, 'localStorage')
}

describe('HTTP i18n helpers', () => {
  beforeEach(() => {
    storage.clear()
    installWindowShim()
    setLocale('en')
  })

  afterEach(() => {
    uninstallWindowShim()
  })

  it('defaults to same-origin api routing when no override is present', () => {
    expect(getApiBaseUrl()).toBe('/api')
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
