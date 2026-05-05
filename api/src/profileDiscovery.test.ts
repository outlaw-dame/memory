import { describe, expect, it } from 'bun:test'
import {
  ProfileDiscoveryValidationError,
  normalizeProfileDiscovery,
  resolveActorDiscoverable,
  resolveActorIndexable
} from './profileDiscovery'

const AS_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public'

describe('profile discovery normalization', () => {
  it('normalizes a public indexing opt-in', () => {
    const actor = normalizeProfileDiscovery({
      id: 'https://pods.example/alice',
      indexable: 'true',
      noindex: 'false',
      discoverable: 'true'
    })

    expect(actor.indexable).toBe(true)
    expect(actor.noindex).toBe(false)
    expect(actor.discoverable).toBe(true)
    expect(resolveActorIndexable(actor)).toBe(true)
    expect(resolveActorDiscoverable(actor)).toBe(true)
  })

  it('removes public searchableBy when indexing is disabled', () => {
    const actor = normalizeProfileDiscovery({
      id: 'https://pods.example/alice',
      indexable: false,
      searchableBy: [AS_PUBLIC, 'https://pods.example/users/alice']
    })

    expect(actor.indexable).toBe(false)
    expect(actor.noindex).toBe(true)
    expect(actor.searchableBy).toBe('https://pods.example/users/alice')
    expect(resolveActorIndexable(actor)).toBe(false)
  })

  it('preserves existing discovery flags when a profile update omits them', () => {
    const actor = normalizeProfileDiscovery(
      {
        id: 'https://pods.example/alice',
        name: 'Alice'
      },
      {
        existingActor: {
          id: 'https://pods.example/alice',
          indexable: true,
          noindex: false,
          discoverable: false
        }
      }
    )

    expect(actor.indexable).toBe(true)
    expect(actor.noindex).toBe(false)
    expect(actor.discoverable).toBe(false)
  })

  it('rejects contradictory indexable and noindex values', () => {
    expect(() =>
      normalizeProfileDiscovery({
        indexable: true,
        noindex: true
      })
    ).toThrow(ProfileDiscoveryValidationError)
  })

  it('rejects invalid boolean strings', () => {
    expect(() =>
      normalizeProfileDiscovery({
        indexable: 'sometimes'
      })
    ).toThrow(ProfileDiscoveryValidationError)
  })
})

