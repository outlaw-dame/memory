import User from '../decorater/User'
import cors from '@elysiajs/cors'
import jwt from '@elysiajs/jwt'
import Elysia from 'elysia'

const setupPlugin = new Elysia({ name: 'setup' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret'
    })
  )
  .use(cors())
  .decorate('user', new User())

export default setupPlugin
