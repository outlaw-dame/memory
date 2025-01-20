import { Elysia } from 'elysia'
import { drizzle } from 'drizzle-orm/bun-sqlite'

const db = drizzle(process.env.DB_FILE_NAME || 'db.sqlite')

export const app = new Elysia().get('/', ({}) => 'Hello world!').listen(8796)

console.log('Listening on port 8796')
