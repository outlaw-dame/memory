import { boolean, text, serial, pgTable as table } from 'drizzle-orm/pg-core'

export const users = table('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
  webId: text('web_id').notNull().unique()
})

export const posts = table('posts', {
  id: serial().primaryKey(),
  content: text().notNull(),
  created_at: text().notNull(),
  public: boolean().notNull()
})
