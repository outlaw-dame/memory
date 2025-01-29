import { relations, sql } from 'drizzle-orm'
import { boolean, text, serial, pgTable as table, timestamp, integer, pgView } from 'drizzle-orm/pg-core'

export const users = table('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
  displayName: text('display_name').notNull().unique(),
  webId: text('web_id').notNull().unique(),
  email: text('email').notNull().unique(),
  providerName: text('provider_name').notNull() // This is done so there is no import here. It crashes the drizzle:push command
})

export const usersRelations = relations(users, ({one}) => ({
  posts: one(posts),
}))

export const posts = table('posts', {
  id: serial().primaryKey(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull()
})

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  })
}))

// Views
export const postsView = pgView('posts_view', {
  id: serial().primaryKey(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
  authorName: text('author_name').notNull(),
  authorWebId: text('author_web_id').notNull().unique(),
  authorProviderEndpoint: text('author_provider_endpoint').notNull()
}).as(sql`SELECT
    posts.*,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_name as author_provider_name
  FROM posts
  INNER JOIN users on posts.author_id = users.id
  WHERE posts.is_public = true`)
