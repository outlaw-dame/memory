import Elysia, { t } from 'elysia'
import { fetchLinkPreview } from '../services/LinkPreviewService'

const linkPreviewPlugin = new Elysia({ name: 'link-preview' })
  .get(
    '/link-preview',
    async ({ query, error }) => {
      try {
        return await fetchLinkPreview(query.url)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch link preview'
        const status = /url|http\(s\)|private|local/i.test(message) ? 400 : 502
        return error(status, message)
      }
    },
    {
      query: t.Object({
        url: t.String({ minLength: 8, maxLength: 4096 })
      }),
      response: {
        200: t.Object({
          url: t.String(),
          title: t.String(),
          description: t.Optional(t.String()),
          image: t.Optional(t.String()),
          domain: t.String(),
          authorName: t.Optional(t.String()),
          authorUrl: t.Optional(t.String()),
        }),
        400: t.String(),
        502: t.String(),
      },
      detail: 'Fetches Open Graph metadata for a URL to power link previews',
      isSignedIn: true,
    },
  )

export default linkPreviewPlugin
