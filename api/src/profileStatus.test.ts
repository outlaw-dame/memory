import { describe, expect, test } from 'bun:test'
import {
  ProfileStatusValidationError,
  getStatusCharacterLimit,
  normalizeProfileActorUpdate
} from './profileStatus'

describe('profile status normalization', () => {
  test('creates a new ActorStatus from a draft payload', () => {
    const actor = normalizeProfileActorUpdate(
      {
        name: 'Alice',
        status: {
          content: 'Heads down shipping rich presence',
          endTime: '2030-01-01T12:00',
          attachment: {
            type: 'Link',
            name: 'Sprint board',
            href: 'https://example.com/sprint'
          }
        }
      },
      {
        actorId: 'https://pods.example/users/alice'
      }
    )

    expect(actor.id).toBe('https://pods.example/users/alice')
    expect(actor.status).toMatchObject({
      type: 'ActorStatus',
      attributedTo: 'https://pods.example/users/alice',
      content: 'Heads down shipping rich presence',
      endTime: '2030-01-01T12:00:00.000Z',
      attachment: {
        type: 'Link',
        name: 'Sprint board',
        href: 'https://example.com/sprint'
      }
    })
    expect((actor.status as Record<string, unknown>).id).toEqual(expect.stringContaining('/statuses/'))
    expect((actor.status as Record<string, unknown>).published).toEqual(expect.any(String))
  })

  test('preserves the existing canonical status object when content is unchanged', () => {
    const existingActor = {
      id: 'https://pods.example/users/alice',
      status: {
        type: 'ActorStatus',
        id: 'https://pods.example/users/alice/statuses/current',
        attributedTo: 'https://pods.example/users/alice',
        published: '2029-12-31T00:00:00.000Z',
        content: 'Heads down shipping rich presence',
        endTime: '2030-01-01T12:00:00.000Z',
        attachment: {
          type: 'Link',
          name: 'Sprint board',
          href: 'https://example.com/sprint'
        }
      },
      statusHistory: 'https://pods.example/users/alice/statusHistory'
    }

    const actor = normalizeProfileActorUpdate(
      {
        status: {
          content: 'Heads down shipping rich presence',
          endTime: '2030-01-01T12:00',
          attachment: {
            href: 'https://example.com/sprint',
            name: 'Sprint board'
          }
        },
        statusHistory: 'https://attacker.example/not-allowed'
      },
      {
        actorId: 'https://pods.example/users/alice',
        existingActor
      }
    )

    expect(actor.status).toBe(existingActor.status)
    expect(actor.statusHistory).toBe(existingActor.statusHistory)
  })

  test('clears the current status when the draft is empty', () => {
    const actor = normalizeProfileActorUpdate(
      {
        status: {
          content: '   '
        }
      },
      {
        actorId: 'https://pods.example/users/alice',
        existingActor: {
          status: {
            type: 'ActorStatus',
            id: 'https://pods.example/users/alice/statuses/current',
            published: '2029-12-31T00:00:00.000Z',
            content: 'Existing'
          },
          statusHistory: 'https://pods.example/users/alice/statusHistory'
        }
      }
    )

    expect(actor.status).toBeUndefined()
    expect(actor.statusHistory).toBe('https://pods.example/users/alice/statusHistory')
  })

  test('rejects status content that exceeds the local character limit', () => {
    expect(() =>
      normalizeProfileActorUpdate(
        {
          status: {
            content: 'x'.repeat(getStatusCharacterLimit() + 1)
          }
        },
        {
          actorId: 'https://pods.example/users/alice'
        }
      )
    ).toThrow(ProfileStatusValidationError)
  })

  test('rejects non-http rich presence links', () => {
    expect(() =>
      normalizeProfileActorUpdate(
        {
          status: {
            content: 'Listening to a test track',
            attachment: {
              href: 'javascript:alert(1)'
            }
          }
        },
        {
          actorId: 'https://pods.example/users/alice'
        }
      )
    ).toThrow(ProfileStatusValidationError)
  })
})
