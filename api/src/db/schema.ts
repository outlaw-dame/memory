import { relations, eq, sql } from 'drizzle-orm'
import { boolean, text, serial, pgTable as table, timestamp, integer, pgView } from 'drizzle-orm/pg-core'

export const users = table('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
  webId: text('web_id').notNull().unique(),
  providerEndpoint: text('provider_endpoint').notNull(),
})

export const usersRelations = relations(users, ({one}) => ({
  posts: one(posts),
}))

export const posts = table('posts', {
  id: serial().primaryKey(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
})

export const postsView = pgView('posts_view', {
  id: serial().primaryKey(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  authorName: text("author_name").notNull(),
  authorWebId: text('author_web_id').notNull().unique(),
  authorProviderEndpoint: text('author_provider_endpoint').notNull(),
}).as(sql`SELECT
    posts.*,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint
  FROM posts
  INNER JOIN users on posts.author_id = users.id
  WHERE posts.is_public = true`)
