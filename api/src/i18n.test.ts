import { describe, expect, test } from 'bun:test'
import { applyLocaleHeaders, localeFromHeaders, resolveLocale, translate } from './i18n'

describe('i18n helpers', () => {
  test('resolves supported locale prefixes from Accept-Language', () => {
    expect(resolveLocale('es-MX,es;q=0.9,en;q=0.8')).toBe('es')
    expect(localeFromHeaders({ 'accept-language': 'en-US,en;q=0.9' })).toBe('en')
  })

  test('falls back to English when locale or message key is unknown', () => {
    expect(resolveLocale('fr-CA,fr;q=0.9')).toBe('en')
    expect(translate('es', 'missing.key')).toBe('missing.key')
  })

  test('applies locale-aware response headers', () => {
    const set = { headers: {} as Record<string, string | number | undefined> }
    applyLocaleHeaders(set, 'es')

    expect(set.headers['content-language']).toBe('es')
    expect(set.headers.vary).toContain('Accept-Language')
  })
})
