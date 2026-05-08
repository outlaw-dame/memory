import { describe, expect, test } from 'bun:test'
import {
  getAttributionDomainLimit,
  normalizeProfileAuthorAttribution,
  ProfileAuthorAttributionValidationError
} from './profileAuthorAttribution'

describe('profile author attribution normalization', () => {
  test('normalizes domains to lowercase hostnames and deduplicates them', () => {
    const actor = normalizeProfileAuthorAttribution({
      name: 'Alice',
      attributionDomains: [
        'Example.com',
        'https://news.example.com/articles/1',
        'example.com'
      ]
    })

    expect(actor.attributionDomains).toEqual(['example.com', 'news.example.com'])
  })

  test('preserves existing attribution domains when the field is omitted', () => {
    const actor = normalizeProfileAuthorAttribution(
      {
        name: 'Alice'
      },
      {
        existingActor: {
          attributionDomains: ['example.com']
        }
      }
    )

    expect(actor.attributionDomains).toEqual(['example.com'])
  })

  test('rejects invalid domain entries', () => {
    expect(() =>
      normalizeProfileAuthorAttribution({
        attributionDomains: ['javascript:alert(1)']
      })
    ).toThrow(ProfileAuthorAttributionValidationError)
  })

  test('rejects more than the supported number of domains', () => {
    expect(() =>
      normalizeProfileAuthorAttribution({
        attributionDomains: Array.from(
          { length: getAttributionDomainLimit() + 1 },
          (_, index) => `site-${index}.example.com`
        )
      })
    ).toThrow(ProfileAuthorAttributionValidationError)
  })
})
