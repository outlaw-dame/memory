import { getLocale } from '../i18n'

export function getApiBaseUrl(): string {
  const configuredBaseUrl = (import.meta.env.VITE_API_URL || '/api').trim()
  if (/^https?:\/\//i.test(configuredBaseUrl)) {
    return configuredBaseUrl.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    return new URL(configuredBaseUrl, window.location.origin).toString().replace(/\/$/, '')
  }

  return configuredBaseUrl
}

export function buildApiHeaders(
  options: {
    authToken?: string
    includeJsonContentType?: boolean
    headers?: HeadersInit
  } = {}
): Record<string, string> {
  const merged = new Headers(options.headers)

  if (options.includeJsonContentType && !merged.has('Content-Type')) {
    merged.set('Content-Type', 'application/json')
  }

  merged.set('Accept-Language', getLocale())

  if (options.authToken) {
    merged.set('auth', options.authToken)
  }

  return Object.fromEntries(merged.entries())
}
