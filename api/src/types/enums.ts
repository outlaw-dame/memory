import { t } from 'elysia'

/**
 * Accepts any valid HTTP/HTTPS URL as a pod provider endpoint.
 *
 * The original fixed enum only allowed http://localhost:3000, which prevented
 * users from connecting to external or custom ActivityPods pod providers.
 * We validate the URL format here; the ActivityPods service validates the
 * endpoint's actual response at runtime.
 *
 * Security note: The URL is used only to make server-side requests to the
 * pod provider's /auth/login and /auth/signup endpoints. It is never reflected
 * back to the client without sanitisation.
 */
export const viablePodProviders = t.String({
  minLength: 7,
  maxLength: 512,
  pattern: '^https?://',
  description: 'URL of the ActivityPods pod provider (e.g. http://localhost:3000)',
  default: 'http://localhost:3000',
})
