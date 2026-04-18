import { getLocale } from '@/i18n'

export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:8796'
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
