import Elysia, { t } from 'elysia'
import { getMemoryApplicationDocument, getRequiredAccessNeedGroupDocument, getUserById, recordNotificationDelivery, verifyWebhookTarget } from '../services/ActivityPodsNotifications'

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
  .post('/activitypods/webhooks/inbox/:userId', async ({ params, query, body, request, set }) => {
    const userId = Number.parseInt(String(params.userId), 10)
    if (!Number.isInteger(userId) || userId <= 0) {
      set.status = 400
      return 'Invalid user id'
    }

    const targetUser = await getUserById(userId)
    if (!targetUser) {
      set.status = 404
      return 'Unknown webhook target user'
    }

    const signature = typeof query.signature === 'string' ? query.signature : undefined
    const isValid = await verifyWebhookTarget(userId, signature)
    if (!isValid) {
      set.status = 401
      return 'Unauthorized'
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
          return 'Payload too large'
        }
        parsedBody = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : null
      } catch {
        parsedBody = null
      }
    }

    if (!parsedBody) {
      set.status = 400
      return 'Invalid notification payload'
    }

    const result = await recordNotificationDelivery(userId, parsedBody)
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