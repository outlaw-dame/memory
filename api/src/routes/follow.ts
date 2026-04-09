import Elysia, { t } from 'elysia'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'

const followPlugin = new Elysia({ name: 'follow' })
  .use(setupPlugin)
  .post(
    '/follows',
    async ({ error, body, user }) => {
      const { objectUri } = body
      try {
        await ActivityPod.followActor(user, objectUri)
      } catch (e) {
        console.error('Error while following actor:', e)
        return error(502, 'Pod server follow request failed')
      }
      return { followed: true }
    },
    {
      isSignedIn: true,
      body: t.Object({ objectUri: t.String() }),
      response: {
        200: t.Object({ followed: t.Boolean() }),
        401: t.String(),
        502: t.String()
      },
      detail: 'Follow an ActivityPods actor via FEP-efda resolution'
    }
  )

export default followPlugin
