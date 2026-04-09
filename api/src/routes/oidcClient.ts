import Elysia from 'elysia'

/**
 * Serves the Solid OIDC client registration document for the Memory app.
 *
 * ActivityPods (and Solid OIDC compliant providers) support "client_id as URL":
 * instead of dynamic client registration the app publishes a stable JSON-LD
 * document at a well-known URL and passes that URL as the `client_id` in every
 * authorization request.  The pod provider fetches this document to verify that
 * the redirect_uri in the request is listed here.
 *
 * See: https://solidproject.org/TR/oidc#clientids-document
 * See: pod-provider/backend/config/oidc-adapter.js (Client.find handler)
 */
const oidcClientPlugin = new Elysia({ prefix: '/oauth' }).get('/client.json', ({ set }) => {
  const apiUrl = (process.env.API_URL || `http://localhost:${process.env.API_PORT || 8794}`).replace(/\/$/, '')
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/$/, '')

  const clientId = `${apiUrl}/oauth/client.json`

  set.headers['Content-Type'] = 'application/ld+json'
  set.headers['Access-Control-Allow-Origin'] = '*'
  set.headers['Cache-Control'] = 'public, max-age=3600'

  return {
    '@context': 'https://www.w3.org/ns/solid/oidc-context.jsonld',
    client_id: clientId,
    client_name: 'Memory',
    redirect_uris: [`${frontendUrl}/auth/callback`],
    post_logout_redirect_uris: [frontendUrl],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    scope: 'openid profile webid offline_access'
  }
})

export default oidcClientPlugin
