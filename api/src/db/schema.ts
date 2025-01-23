import { relations } from 'drizzle-orm'
import { boolean, text, serial, pgTable as table, timestamp, integer } from 'drizzle-orm/pg-core'

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
