import { describe, expect, test } from 'bun:test'
import { decodeWebId, encodeWebId } from '@/util/user'
import User from '@/decorater/User'

describe('User Util', () => {
  describe('decodeWebId', () => {
    test('decodeWebId', () => {
      const webId = '@test@memory.'
      const encoded = decodeWebId(webId)

      expect(encoded.username).toBe('test')
      expect(encoded.provider).toBe('memory.')
      expect(encoded.endpoint).toBe('http://localhost:3000')
    })

    test('decodeWebId - with a not viably pod provider', () => {
      const webId = '@test@test.'

      expect(() => {
        decodeWebId(webId)
      }).toThrow('The provider is not a viable pod provider')
    })
  })
  describe('encodeWebId', () => {
    test('encodeWebId', () => {
      const webId = '@test@memory.'
      const encoded = encodeWebId('http://localhost:3000/test')

      expect(encoded).toBe(webId)
    })

    test('encodeWebId - with a memory webId', () => {
      const webId = '@test@memory.'
      const encoded = encodeWebId(webId)

      expect(encoded).toBe(webId)
    })

    test('encodeWebId - with a memory webId that has a invalid provider', () => {
      const invalidMemoryWebId = '@test@test.'
      expect(() => {
        encodeWebId(invalidMemoryWebId)
      }).toThrow('The provider is not a viable pod provider')
    })

    test('encodeWebId - with a corrupted memory webId', () => {
      const corruptedWebId = 'test@memory'
      expect(() => {
        encodeWebId(corruptedWebId)
      }).toThrow('The provider is not a viable pod provider')
    })

    test('encodeWebId - with User object', () => {
      const webId = '@test@memory.'

      const testUser = new User()
      testUser.loadUser(JSON.stringify({ userId: 1, username: 'test', token: 'test', provider: 'memory.' }))
      const encoded = encodeWebId(testUser)
      expect(encoded).toBe(webId)
    })

    test('encodeWebId - with a not viably pod provider webId', () => {
      expect(() => {
        encodeWebId('notValidProvider/test')
      }).toThrow('The provider is not a viable pod provider')
    })

    test('encodeWebId - with a not viably user object', () => {
      expect(() => {
        const invalidUser = new User()
        invalidUser.loadUser(
          JSON.stringify({ userId: 1, username: 'test', token: 'test', provider: 'notAPodProvider.' })
        )
        encodeWebId(invalidUser)
      }).toThrow('The provider is not a viable pod provider')
    })
  })
})
