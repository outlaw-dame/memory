import Elysia, { t } from 'elysia'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'

const profilePlugin = new Elysia({ name: 'profile' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  .get(
    '/profile',
    async ({ set, user }: any) => {
      if (!user?.endpoint || !user?.userName) {
        set.status = 401
        return 'You must be signed in to do that'
      }
      try {
        return await ActivityPod.getProfile(user)
      } catch (e) {
        console.error('Error while fetching profile:', e)
        set.status = 502
        return 'Pod server profile request failed'
      }
    },
    {
      response: {
        200: t.Any(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Fetch the authenticated ActivityPub actor profile'
    }
  )
  .put(
    '/profile',
    async ({ set, body, user }: any) => {
      if (!user?.endpoint || !user?.userName) {
        set.status = 401
        return 'You must be signed in to do that'
      }
      if (!body.actor || typeof body.actor !== 'object' || Array.isArray(body.actor)) {
        set.status = 400
        return 'actor must be an object'
      }

      const actor = {
        ...body.actor,
        id: user.getWebId(),
        '@id': user.getWebId()
      }

      try {
        await ActivityPod.updateProfile(user, actor)
        return await ActivityPod.getProfile(user)
      } catch (e) {
        console.error('Error while updating profile:', e)
        set.status = 502
        return 'Pod server profile update failed'
      }
    },
    {
      body: t.Object({
        actor: t.Any()
      }),
      response: {
        200: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Update the authenticated ActivityPub actor profile'
    }
  )

export default profilePlugin