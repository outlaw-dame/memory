import Elysia, { t } from 'elysia'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'

// ---------------------------------------------------------------------------
// Shared validation helpers
// ---------------------------------------------------------------------------

/** Validates that a string is an absolute https:// URL. */
const isAbsoluteHttpsUrl = (value: string): boolean => {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const replyPlugin = new Elysia({ name: 'reply' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  .post(
    '/replies/resolve',
    async ({ error, body, user }: any) => {
      if (!isAbsoluteHttpsUrl(body.objectUri)) {
        return error(400, 'objectUri must be an absolute https:// URL')
      }
      try {
        return await ActivityPod.resolveReplyPolicy(user, body.objectUri)
      } catch (e) {
        console.error('Error while resolving reply policy:', e)
        return error(502, 'Pod server reply policy request failed')
      }
    },
    {
      body: t.Object({
        objectUri: t.String({ minLength: 9, maxLength: 2048 })
      }),
      response: {
        200: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Resolve ActivityPub reply policy for an object'
    }
  )
  .post(
    '/replies',
    async ({ error, body, user }: any) => {
      if (!isAbsoluteHttpsUrl(body.objectUri)) {
        return error(400, 'objectUri must be an absolute https:// URL')
      }
      // Strip C0/C1 control characters before forwarding
      // eslint-disable-next-line no-control-regex
      const content = (body.content as string).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim()
      if (content.length === 0) {
        return error(400, 'Reply content must not be empty')
      }
      try {
        return await ActivityPod.replyToObject(user, body.objectUri, content, body.isPublic ?? true)
      } catch (e) {
        console.error('Error while submitting reply:', e)
        return error(502, 'Pod server reply request failed')
      }
    },
    {
      body: t.Object({
        objectUri: t.String({ minLength: 9, maxLength: 2048 }),
        content: t.String({ minLength: 1, maxLength: 5000 }),
        isPublic: t.Optional(t.Boolean())
      }),
      response: {
        200: t.Any(),
        202: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Submit an ActivityPub reply, using pending approval automatically when required'
    }
  )

export default replyPlugin
