import Elysia, { t } from 'elysia'
import { applyLocaleHeaders, localeFromHeaders, translate } from '../i18n'
import { getMemoryApplicationDocument, getRequiredAccessNeedGroupDocument, getUserById, maybePersistDirectMessage, recordNotificationDelivery, verifyWebhookTarget } from '../services/ActivityPodsNotifications'

const activityPodsAppPublicPlugin = new Elysia({ name: 'activitypods-app-public' })
  .get('/activitypods/app', ({ set }) => {
    set.headers['Content-Type'] = 'application/ld+json'
    set.headers['Access-Control-Allow-Origin'] = '*'
    return getMemoryApplicationDocument()
  })
  .get('/activitypods/access-needs/required', ({ set }) => {
    set.headers['Content-Type'] = 'application/ld+json'
    set.headers['Access-Control-Allow-Origin'] = '*'
    return getRequiredAccessNeedGroupDocument()
  })
  .post('/activitypods/webhooks/inbox/:userId', async ({ params, query, body, request, headers, set }) => {
    const locale = localeFromHeaders(headers)
    applyLocaleHeaders(set, locale)

    const userId = Number.parseInt(String(params.userId), 10)
    if (!Number.isInteger(userId) || userId <= 0) {
      set.status = 400
      return translate(locale, 'activitypods.webhooks.invalidUserId')
    }

    const targetUser = await getUserById(userId)
    if (!targetUser) {
      set.status = 404
      return translate(locale, 'activitypods.webhooks.unknownTargetUser')
    }

    const signature = typeof query.signature === 'string' ? query.signature : undefined
    const isValid = await verifyWebhookTarget(userId, signature)
    if (!isValid) {
      set.status = 401
      return translate(locale, 'activitypods.webhooks.unauthorized')
    }

    let parsedBody =
      typeof body === 'string'
        ? (() => {
            try {
              return JSON.parse(body) as Record<string, unknown>
            } catch {
              return null
            }
          })()
        : body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : null

    if (!parsedBody) {
      try {
        const rawText = await request.text()
        if (rawText.length > 200_000) {
          set.status = 413
          return translate(locale, 'activitypods.webhooks.payloadTooLarge')
        }
        parsedBody = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null
      } catch {
        parsedBody = null
      }
    }

    if (!parsedBody) {
      set.status = 400
      return translate(locale, 'activitypods.webhooks.invalidPayload')
    }

    const result = await recordNotificationDelivery(userId, parsedBody)

    // Best-effort: if the activity is a direct Note, persist into local chat DB.
    // This runs after recording so delivery is never blocked by DM logic errors.
    maybePersistDirectMessage(userId, parsedBody).catch(err => {
      console.error('[InboxWebhook] DM persist error:', err instanceof Error ? err.message : String(err))
    })

    return {
      duplicate: result.duplicate,
      received: true,
    }
  }, {
    body: t.Any(),
    query: t.Object({
      signature: t.String(),
    }),
    response: {
      200: t.Object({
        duplicate: t.Boolean(),
        received: t.Boolean(),
      }),
      400: t.String(),
      401: t.String(),
      404: t.String(),
      413: t.String(),
    },
  })

export default activityPodsAppPublicPlugin
