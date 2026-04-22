import { t } from 'elysia'

function normalizeProviderEndpoint(value: string | undefined): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (trimmed.length === 0) return null

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

const configuredProviderEndpoints = [
  process.env.POD_PROVIDER_BASE_URL,
  process.env.ACTIVITYPUB_PROXY_BASE_URL,
  ...(process.env.MEMORY_POD_PROVIDER_ENDPOINTS?.split(',') ?? []),
]
  .map(value => normalizeProviderEndpoint(value))
  .filter((value): value is string => value !== null)

const providerEndpoints = Array.from(new Set([
  'http://localhost:3000',
  ...configuredProviderEndpoints,
]))

export const viablePodProviders = t.Enum(
  Object.fromEntries(providerEndpoints.map(value => [value, value])) as Record<string, string>
)
