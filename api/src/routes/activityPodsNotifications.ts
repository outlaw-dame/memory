import Elysia, { t } from 'elysia'
import setupPlugin from './setup'
import {
  ensureMemoryInboxWebhook,
  getMemoryAppStatus,
  getUserById,
  listGroupedNotificationsForUser,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationsRead,
} from '../services/ActivityPodsNotifications'
import { localeFromHeaders, translate } from '../i18n'

const activityPodsNotificationsPlugin = new Elysia({ name: 'activitypods-notifications' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true,
  })
  .get('/activitypods/notifications/status', async ({ set, user, headers }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    try {
      return await getMemoryAppStatus(dbUser, user.token)
    } catch (error) {
      console.error('Error while fetching ActivityPods notification status:', error)
      set.status = 502
      return translate(locale, 'notifications.fetchStatusFailed')
    }
  }, {
    response: {
      200: t.Any(),
      404: t.String(),
      502: t.String(),
    },
    detail: 'Return Memory app registration and webhook status for the current ActivityPods user',
  })
  .post('/activitypods/notifications/bootstrap', async ({ set, user, headers }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    try {
      const result = await ensureMemoryInboxWebhook(dbUser, user.token)

      if (!result.status.hasInboxWebhook && result.status.upgradeNeeded) {
        set.status = 409
        return translate(locale, 'notifications.upgradeRequired')
      }

      return result
    } catch (error) {
      console.error('Error while bootstrapping ActivityPods notifications:', error)
      set.status = 502
      return translate(locale, 'notifications.bootstrapFailed')
    }
  }, {
    response: {
      200: t.Any(),
      409: t.String(),
      404: t.String(),
      502: t.String(),
    },
    detail: 'Create the Memory inbox webhook after the app has been authorized on the user pod',
  })
  .get('/activitypods/notifications', async ({ set, user, headers }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    try {
      return await listNotificationsForUser(dbUser.id)
    } catch (error) {
      console.error('Error while listing notifications:', error)
      set.status = 500
      return translate(locale, 'notifications.listFailed')
    }
  }, {
    response: {
      200: t.Any(),
      404: t.String(),
      500: t.String(),
    },
    detail: 'List recent ActivityPods notification deliveries captured by Memory',
  })
  .get('/activitypods/notifications/grouped', async ({ set, user, headers, query }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    const parseBoolean = (value: unknown, fallback = false) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
        if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
      }
      return fallback
    }

    const parseWindowHours = (value: unknown, fallback = 72) => {
      const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
      if (!Number.isFinite(parsed)) return fallback
      return Math.min(24 * 30, Math.max(1, Math.trunc(parsed)))
    }

    try {
      return await listGroupedNotificationsForUser(dbUser.id, {
        includeFollows: parseBoolean(query?.includeFollows, false),
        includeMentions: parseBoolean(query?.includeMentions, false),
        windowHours: parseWindowHours(query?.windowHours, 72),
      })
    } catch (error) {
      console.error('Error while listing grouped notifications:', error)
      set.status = 500
      return translate(locale, 'notifications.listFailed')
    }
  }, {
    response: {
      200: t.Any(),
      404: t.String(),
      500: t.String(),
    },
    detail: 'List grouped notifications (Mastodon-style grouping for boosts/likes)',
  })
  .patch('/activitypods/notifications/:id/read', async ({ set, user, params, headers }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    const id = Number.parseInt(String(params.id), 10)
    if (!Number.isInteger(id) || id <= 0) {
      set.status = 400
      return 'Invalid notification id'
    }

    const updated = await markNotificationRead(dbUser.id, id)
    if (!updated) {
      set.status = 404
      return 'Notification not found'
    }

    return { updated: true }
  }, {
    params: t.Object({ id: t.String() }),
    response: {
      200: t.Object({ updated: t.Boolean() }),
      400: t.String(),
      404: t.String(),
    },
    detail: 'Mark a single notification as read',
  })
  .post('/activitypods/notifications/groups/read', async ({ set, user, headers, body }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    try {
      const updated = await markNotificationsRead(dbUser.id, body.notificationIds)
      return { updated }
    } catch (error) {
      console.error('Error while marking grouped notifications read:', error)
      set.status = 500
      return translate(locale, 'notifications.listFailed')
    }
  }, {
    body: t.Object({ notificationIds: t.Array(t.Number()) }),
    response: {
      200: t.Object({ updated: t.Number() }),
      404: t.String(),
      500: t.String(),
    },
    detail: 'Mark a grouped notification set as read',
  })
  .post('/activitypods/notifications/read-all', async ({ set, user, headers }: any) => {
    const locale = localeFromHeaders(headers)
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return translate(locale, 'common.userNotFound')
    }

    try {
      const updated = await markAllNotificationsRead(dbUser.id)
      return { updated }
    } catch (error) {
      console.error('Error while marking all notifications read:', error)
      set.status = 500
      return translate(locale, 'notifications.listFailed')
    }
  }, {
    response: {
      200: t.Object({ updated: t.Number() }),
      404: t.String(),
      500: t.String(),
    },
    detail: 'Mark all notifications as read',
  })

export default activityPodsNotificationsPlugin
