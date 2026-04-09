import User from '../decorater/User'
import cors from '@elysiajs/cors'
import jwt from '@elysiajs/jwt'
import Elysia from 'elysia'

const JWT_SECRET = process.env.JWT_SECRET || 'secret'

const setupPlugin = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET
    })
  )
  .use(cors())
  .derive(({ set }) => ({
    error: (status: number, message: string) => {
      set.status = status as any
      return message
    }
  }))
  .decorate('user', new User())

export default setupPlugin
