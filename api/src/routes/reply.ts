import Elysia, { t } from 'elysia'
import { eq } from 'drizzle-orm'
import ActivityPod from '../services/ActivityPod'
import { db } from '../db/client'
import { posts } from '../db/schema'
import setupPlugin from './setup'
import { localeFromHeaders, translate } from '../i18n'
import { mergeHashtags } from '../utils/hashtags'

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
    async ({ body, user, headers, error }: any) => {
      const locale = localeFromHeaders(headers)
      if (!isAbsoluteHttpsUrl(body.objectUri)) {
        return error(400, translate(locale, 'reply.objectUriHttps'))
      }
      try {
        return await ActivityPod.resolveReplyPolicy(user, body.objectUri)
      } catch (e) {
        console.error('Error while resolving reply policy:', e)
        return error(502, translate(locale, 'reply.resolveFailed'))
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
    async ({ body, user, headers, error }: any) => {
      const locale = localeFromHeaders(headers)
      if (!isAbsoluteHttpsUrl(body.objectUri)) {
        return error(400, translate(locale, 'reply.objectUriHttps'))
      }
      // Strip C0/C1 control characters before forwarding
      // eslint-disable-next-line no-control-regex
      const content = (body.content as string).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim()
      if (content.length === 0) {
        return error(400, translate(locale, 'reply.contentEmpty'))
      }
      try {
        const replyResult = await ActivityPod.replyToObject(user, body.objectUri, content, body.isPublic ?? true)
        const replyObjectUri = typeof replyResult.replyObjectUri === 'string' ? replyResult.replyObjectUri : null

        if (replyObjectUri) {
          const [parentPost] = await db
            .select({
              objectUri: posts.objectUri,
              replyRootUri: posts.replyRootUri,
            })
            .from(posts)
            .where(eq(posts.objectUri, body.objectUri))
            .limit(1)

          const replyRootUri = parentPost?.replyRootUri ?? parentPost?.objectUri ?? body.objectUri

          await db.insert(posts).values({
            authorId: user.userId,
            content,
            hashtags: mergeHashtags(content),
            isPublic: body.isPublic ?? true,
            objectUri: replyObjectUri,
            replyParentUri: body.objectUri,
            replyRootUri,
            postType: 'note',
            canonicalUrl: null,
            name: null,
            summary: null,
          })
        }

        return replyResult
      } catch (e) {
        console.error('Error while submitting reply:', e)
        return error(502, translate(locale, 'reply.submitFailed'))
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
