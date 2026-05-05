import { drizzle } from 'drizzle-orm/node-postgres'

export const db = drizzle({ connection: process.env.DB_URL || '', casing: 'snake_case' })
