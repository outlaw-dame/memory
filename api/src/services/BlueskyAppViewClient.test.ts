import { describe, expect, it } from 'bun:test'
import { BlueskyAppViewClient } from './BlueskyAppViewClient'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('BlueskyAppViewClient', () => {
  it('rejects unsafe AppView origins', () => {
    expect(() => new BlueskyAppViewClient({ publicOrigin: 'http://public.api.bsky.app' })).toThrow(/https/)
    expect(() => new BlueskyAppViewClient({ publicOrigin: 'https://example.com' })).toThrow(/not allowed/)
    expect(() => new BlueskyAppViewClient({ publicOrigin: 'https://user:pass@public.api.bsky.app' })).toThrow(/credentials/)
    expect(() => new BlueskyAppViewClient({ publicOrigin: 'https://public.api.bsky.app/xrpc' })).toThrow(/path/)
  })

  it('deduplicates DIDs, batches profile requests, and returns profile views', async () => {
    const requestedUrls: string[] = []
    const client = new BlueskyAppViewClient({
      batchSize: 1,
      fetchImpl: (async (url: string | URL | Request) => {
        requestedUrls.push(String(url))
        return jsonResponse({
          profiles: [{ did: requestedUrls.length === 1 ? 'did:plc:one' : 'did:plc:two', handle: `h${requestedUrls.length}.bsky.social` }],
        })
      }) as typeof fetch,
    })

    const profiles = await client.getProfiles(['did:plc:one', 'did:plc:one', 'did:plc:two'])

    expect(requestedUrls).toHaveLength(2)
    expect(profiles.map(profile => profile.did)).toEqual(['did:plc:one', 'did:plc:two'])
  })

  it('retries transient AppView failures with bounded attempts', async () => {
    let calls = 0
    const client = new BlueskyAppViewClient({
      maxRetries: 1,
      fetchImpl: (async () => {
        calls += 1
        if (calls === 1) return jsonResponse({ error: 'busy' }, 503)
        return jsonResponse({ profiles: [{ did: 'did:plc:one', handle: 'one.bsky.social' }] })
      }) as typeof fetch,
    })

    const profiles = await client.getProfiles(['did:plc:one'])

    expect(calls).toBe(2)
    expect(profiles[0]?.handle).toBe('one.bsky.social')
  })
})
