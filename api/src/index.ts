import { Elysia } from 'elysia'
import { _createPost, _selectUsers } from './types'
import { postsPlugin, authPlugin, oidcAuthPlugin, oidcClientPlugin, setupPlugin, atBridgePlugin, followPlugin, replyPlugin, actorMetadataPlugin, profilePlugin, conversationsPlugin, activityPodsAppPublicPlugin, activityPodsNotificationsPlugin } from './routes'
import atBridgeWebhookPlugin from './routes/atBridgeWebhook'
import { db } from './db/client'
import { applyLocaleHeaders, localeFromHeaders, translate } from './i18n'

export { db }

const publicRoutes = new Elysia({ aot: false })
  .use(setupPlugin)
  .use(authPlugin)
  .use(oidcAuthPlugin)
  .use(oidcClientPlugin)
  .use(activityPodsAppPublicPlugin)

const protectedRoutes = new Elysia({ aot: false })
  .use(setupPlugin)
  .onBeforeHandle(async ({ headers, jwt, user }: any) => {
    const token = (headers as any)['auth']
    if (token) {
      const authValue = await jwt.verify(token)
      if (authValue) {
        user.loadUser(JSON.parse(authValue.user as string))
      }
    }
  })
  .macro({
    isSignedIn: enabled => {
      if (!enabled) return

      return {
        async beforeHandle({ headers, jwt, set, user }) {
          const locale = localeFromHeaders(headers)
          applyLocaleHeaders(set, locale)
          const auth = headers.auth
          const authValue = await jwt.verify(auth)
          if (!authValue) {
            set.status = 401
            return translate(locale, 'common.mustBeSignedIn')
          } else {
            user.loadUser(JSON.parse(authValue.user as string))
          }
        }
      }
    }
  })
  .use(postsPlugin)
  .use(atBridgePlugin)
  .use(atBridgeWebhookPlugin)
  .use(followPlugin)
  .use(replyPlugin)
  .use(actorMetadataPlugin)
  .use(profilePlugin)
  .use(conversationsPlugin)
  .use(activityPodsNotificationsPlugin)

export const app = new Elysia({ aot: false })
  // Top-level health check — used by Docker healthcheck and the Mastopod harness
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .use(publicRoutes)
  .use(protectedRoutes)
  .listen(process.env.API_PORT || 8796)

console.info(`Listening on port ${process.env.API_PORT}`)

export type App = typeof app
