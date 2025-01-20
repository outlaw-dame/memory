import { text, int, sqliteTable } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users_table', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  user_id: text('handle').notNull(),
  created_at: text('created_at').notNull()
})
