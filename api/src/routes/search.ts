import Elysia, { t } from 'elysia'
import setupPlugin from './setup'
import { db } from '..'
import { hashtags } from '@/db/schema'
import { ilike } from 'drizzle-orm'

const searchRoutes = new Elysia({ name: 'search', prefix: '/search' })
  .use(setupPlugin)
  .guard({
    isSignedIn: true
  })
  .get(
    '/hashtag/:hashtag',
    async ({ params: { hashtag: q } }) => {
      const searchQuery = await db
        .select()
        .from(hashtags)
        .where(ilike(hashtags.name, `%${q}%`))
      console.log(searchQuery)
      return searchQuery
    },
    {
      detail: 'Returns all posts that match the search query',
      isSignedIn: true,
      params: t.Object({
        hashtag: t.String()
      }),
      response: {
        200: t.Array(t.Any())
      }
    }
  )

export default searchRoutes
