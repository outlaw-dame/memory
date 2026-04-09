import Elysia, { t } from 'elysia'
import setupPlugin from './setup'
import { ensureMemoryInboxWebhook, getMemoryAppStatus, getUserById, listNotificationsForUser } from '../services/ActivityPodsNotifications'

const activityPodsNotificationsPlugin = new Elysia({ name: 'activitypods-notifications' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true,
  })
  .get('/activitypods/notifications/status', async ({ set, user }: any) => {
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return 'User not found'
    }

    try {
      return await getMemoryAppStatus(dbUser, user.token)
    } catch (error) {
      console.error('Error while fetching ActivityPods notification status:', error)
      set.status = 502
      return 'Unable to fetch ActivityPods app status'
    }
  }, {
    response: {
      200: t.Any(),
      404: t.String(),
      502: t.String(),
    },
    detail: 'Return Memory app registration and webhook status for the current ActivityPods user',
  })
  .post('/activitypods/notifications/bootstrap', async ({ set, user }: any) => {
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return 'User not found'
    }

    try {
      const result = await ensureMemoryInboxWebhook(dbUser, user.token)

      if (!result.status.hasInboxWebhook && result.status.upgradeNeeded) {
        set.status = 409
        return 'Pod requires application authorization upgrade before webhook activation'
      }

      return result
    } catch (error) {
      console.error('Error while bootstrapping ActivityPods notifications:', error)
      set.status = 502
      return 'Unable to bootstrap ActivityPods notifications'
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
  .get('/activitypods/notifications', async ({ set, user }: any) => {
    const dbUser = await getUserById(user.userId)
    if (!dbUser) {
      set.status = 404
      return 'User not found'
    }

    try {
      return await listNotificationsForUser(dbUser.id)
    } catch (error) {
      console.error('Error while listing notifications:', error)
      set.status = 500
      return 'Unable to list notifications'
    }
  }, {
    response: {
      200: t.Any(),
      404: t.String(),
      500: t.String(),
    },
    detail: 'List recent ActivityPods notification deliveries captured by Memory',
  })

export default activityPodsNotificationsPlugin