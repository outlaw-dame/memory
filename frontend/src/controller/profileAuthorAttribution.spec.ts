import { describe, expect, it } from 'vitest'
import {
  ATTRIBUTION_DOMAIN_LIMIT,
  buildAttributionDomainsPayload,
  parseActorAttributionDomains,
  validateAttributionDomains
} from './profileAuthorAttribution'

describe('profileAuthorAttribution', () => {
  it('parses normalized attribution domains from an actor payload', () => {
    expect(
      parseActorAttributionDomains({
        attributionDomains: ['Example.com', 'https://news.example.com/articles/1']
      })
    ).toEqual(['example.com', 'news.example.com'])
  })

  it('reports invalid domains', () => {
    expect(validateAttributionDomains(['javascript:alert(1)'])).toBe(
      'settings.profile.authorAttribution.errors.invalidDomain'
    )
  })

  it('reports when more than the supported number of domains is configured', () => {
    expect(
      validateAttributionDomains(
        Array.from({ length: ATTRIBUTION_DOMAIN_LIMIT + 1 }, (_, index) => `site-${index}.example.com`)
      )
    ).toBe('settings.profile.authorAttribution.errors.tooMany')
  })

  it('builds a sanitized payload for save requests', () => {
    expect(
      buildAttributionDomainsPayload(['Example.com', 'https://news.example.com/articles/1'])
    ).toEqual(['example.com', 'news.example.com'])
  })
})
