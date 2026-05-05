import { describe, expect, it } from 'bun:test'
import User from './decorater/User'
import {
  MastodonApiValidationError,
  applyMastodonProfileUpdate,
  toMastodonCredentialAccount
} from './mastodonAccount'

function testUser(): User {
  const user = new User()
  user.setUser(1, 'alice', 'pod-token', 'https://pods.example')
  return user
}

describe('Mastodon account compatibility', () => {
  it('returns credential account discovery flags', () => {
    const account = toMastodonCredentialAccount(
      {
        id: 'https://pods.example/alice',
        type: 'Person',
        name: 'Alice',
        summary: '<script>alert(1)</script>Hello',
        indexable: false,
        discoverable: false
      },
      testUser()
    )

    expect(account.indexable).toBe(false)
    expect(account.noindex).toBe(true)
    expect(account.discoverable).toBe(false)
    expect(account.note).toBe('<p>alert(1)Hello</p>')
    expect((account.source as Record<string, unknown>).indexable).toBe(false)
  })

  it('updates indexable and discoverable from Mastodon input', () => {
    const actor = applyMastodonProfileUpdate(
      {
        id: 'https://pods.example/alice',
        name: 'Alice',
        indexable: true,
        discoverable: true,
        searchableBy: 'https://www.w3.org/ns/activitystreams#Public'
      },
      {
        indexable: 'false',
        discoverable: 'false'
      },
      testUser()
    )

    expect(actor.indexable).toBe(false)
    expect(actor.noindex).toBe(true)
    expect(actor.discoverable).toBe(false)
    expect(actor.searchableBy).toBeUndefined()
  })

  it('accepts Mastodon bracketed profile fields', () => {
    const actor = applyMastodonProfileUpdate(
      {
        id: 'https://pods.example/alice',
        name: 'Alice',
        indexable: true
      },
      {
        'fields_attributes[10][name]': 'Website',
        'fields_attributes[10][value]': 'https://example.com'
      },
      testUser()
    )

    expect(actor.attachment).toEqual([
      {
        type: 'Link',
        name: 'Website',
        href: 'https://example.com/',
        rel: ['me']
      }
    ])
  })

  it('rejects contradictory indexable and noindex updates', () => {
    expect(() =>
      applyMastodonProfileUpdate(
        {
          id: 'https://pods.example/alice',
          name: 'Alice'
        },
        {
          indexable: 'true',
          noindex: 'true'
        },
        testUser()
      )
    ).toThrow(MastodonApiValidationError)
  })
})
