import { Profanity } from '@2toad/profanity'
import User from '../decorater/User'
import cors from '@elysiajs/cors'
import jwt from '@elysiajs/jwt'
import Elysia from 'elysia'
import { list } from 'the-big-username-blacklist'

const setupPlugin = new Elysia({ name: 'setup' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret'
    })
  )
  .use(cors())
  .decorate('user', new User())
  .decorate('profanity', () => {
    const profanity = new Profanity({
      languages: ['en', 'de', 'fr', 'ja', 'pt', 'es', 'ru', 'ar', 'ko'],
      wholeWord: false
    })
    profanity.addWords(list)
    return profanity
  })
  .macro({
    isSignedIn: enabled => {
      if (!enabled) return

      return {
        async beforeHandle({ headers: { auth }, jwt, error, user }) {
          const authValue = await jwt.verify(auth)
          if (!authValue) {
            return error(401, 'You must be signed in to do that')
          } else {
            user.loadUser(authValue.user as string)
          }
        }
      }
    }
  })

export default setupPlugin
