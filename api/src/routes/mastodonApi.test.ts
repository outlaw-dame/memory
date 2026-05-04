import { afterEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import User from '../decorater/User'
import { getTokenObject } from '../services/jwt'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'
import mastodonApiPlugin from './mastodonApi'
import { db } from '../db/client'

const originalGetProfile = ActivityPod.getProfile
const originalUpdateProfile = ActivityPod.updateProfile
const originalSelect = (db as unknown as Record<string, unknown>).select

function testUser(): User {
  const user = new User()
  user.setUser(1, 'alice', 'pod-token', 'https://pods.example')
  return user
}

async function mintToken(app: { handle: (request: Request) => Promise<Response> }): Promise<string> {
  const response = await app.handle(new Request('http://localhost/test-token'))
  return response.text()
}

afterEach(() => {
  ActivityPod.getProfile = originalGetProfile
  ActivityPod.updateProfile = originalUpdateProfile
  ;(db as unknown as Record<string, unknown>).select = originalSelect
})

describe('Mastodon API routes', () => {
  it('accepts Authorization bearer tokens and updates indexable', async () => {
    const user = testUser()
    let profile: Record<string, unknown> = {
      id: user.getWebId(),
      type: 'Person',
      name: 'Alice',
      indexable: true,
      discoverable: true,
      searchableBy: 'https://www.w3.org/ns/activitystreams#Public'
    }
    let persisted: Record<string, unknown> | null = null

    ActivityPod.getProfile = async () => profile as any
    ActivityPod.updateProfile = async (_user, actor) => {
      persisted = actor
      profile = actor
      return null
    }
    ;(db as unknown as Record<string, unknown>).select = () => {
      const chain = {
        from: () => chain,
        where: () => chain,
        limit: () => Promise.resolve([{
          id: 1,
          name: 'alice',
          email: 'alice@example.com',
          webId: user.getWebId(),
          providerEndpoint: 'https://pods.example',
          podToken: 'pod-token',
          atprotoDid: null,
          atprotoHandle: null,
        }]),
      }
      return chain
    }

    const app = new Elysia({ aot: false })
      .use(setupPlugin)
      .get('/test-token', ({ jwt }) => jwt.sign(getTokenObject(user)))
      .use(mastodonApiPlugin)

    const token = await mintToken(app)
    const response = await app.handle(
      new Request('http://localhost/api/v1/accounts/update_credentials', {
        method: 'PATCH',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ indexable: false, discoverable: false })
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.indexable).toBe(false)
    expect(body.noindex).toBe(true)
    expect(body.discoverable).toBe(false)
    expect(persisted).not.toBeNull()
    const persistedActor = persisted as unknown as Record<string, unknown>
    expect(persistedActor).toMatchObject({
      indexable: false,
      noindex: true,
      discoverable: false
    })
    expect(persistedActor.searchableBy).toBeUndefined()
  })

  it('rejects missing authentication', async () => {
    const app = new Elysia({ aot: false }).use(mastodonApiPlugin)
    const response = await app.handle(new Request('http://localhost/api/v1/accounts/verify_credentials'))

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toMatchObject({ error: expect.any(String) })
  })
})
