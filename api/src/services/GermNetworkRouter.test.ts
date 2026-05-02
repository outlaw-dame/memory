/**
 * GermNetworkRouter — unit tests
 *
 * Tests exponential backoff, circuit breaker, and routing logic using
 * a mock fetch function (no real HTTP).
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { GermNetworkRouter } from './GermNetworkRouter'
import type { GermDirectMessageIntent } from './GermNetworkRouter'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALICE_DID = 'did:plc:alice1234567890'
const BOB_DID = 'did:plc:bob1234567890abcde'

function makeIntent(overrides?: Partial<GermDirectMessageIntent>): GermDirectMessageIntent {
  return {
    kind: 'DirectMessage',
    sender: { did: ALICE_DID },
    recipient: { did: BOB_DID },
    text: 'Hello, Bob!',
    messageId: 'msg-001',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

function makeRouter(fetchImpl?: typeof globalThis.fetch) {
  if (fetchImpl) {
    globalThis.fetch = fetchImpl
  }
  return new GermNetworkRouter({
    memoryApiBase: 'http://memory-api.test',
    serviceToken: 'svc-token',
  })
}

function makeOkResponse(status = 200): Response {
  return new Response(JSON.stringify({ ok: true }), { status })
}

function makeErrResponse(status: number): Response {
  return new Response(JSON.stringify({ error: 'fail' }), { status })
}

// Suppress backoff delays during tests
const realSetTimeout = globalThis.setTimeout
beforeEach(() => {
  // Replace setTimeout with immediate execution so tests don't actually wait
  ;(globalThis as unknown as { setTimeout: unknown }).setTimeout = (fn: () => void, _ms?: number) => {
    fn()
    return 0 as unknown as ReturnType<typeof setTimeout>
  }
})

afterEach(() => {
  ;(globalThis as unknown as { setTimeout: unknown }).setTimeout = realSetTimeout
})

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('GermNetworkRouter.routeDirectMessage()', () => {
  it('returns ok:true on a 200 response', async () => {
    const router = makeRouter(async () => makeOkResponse(200))
    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(true)
    expect((result as { status: number }).status).toBe(200)
  })

  it('returns ok:true on a 201 response', async () => {
    const router = makeRouter(async () => makeOkResponse(201))
    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(true)
  })

  it('returns invalid_input when recipient.id is missing', async () => {
    const router = makeRouter(async () => makeOkResponse())
    const intent = makeIntent()
    // @ts-expect-error intentional invalid input
    intent.recipient = null
    const result = await router.routeDirectMessage(intent)
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('invalid_input')
  })
})

// ---------------------------------------------------------------------------
// Retry on 5xx
// ---------------------------------------------------------------------------

describe('Exponential backoff on 5xx', () => {
  it('retries up to MAX_ATTEMPTS on persistent 503 and returns exhausted', async () => {
    let callCount = 0
    const router = makeRouter(async () => {
      callCount++
      return makeErrResponse(503)
    })

    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('exhausted')
    expect(callCount).toBe(5)
  })

  it('succeeds on the 3rd attempt after two 503s', async () => {
    let callCount = 0
    const router = makeRouter(async () => {
      callCount++
      if (callCount < 3) return makeErrResponse(503)
      return makeOkResponse(200)
    })

    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(true)
    expect(callCount).toBe(3)
  })

  it('does not retry on 400 (permanent client error)', async () => {
    let callCount = 0
    const router = makeRouter(async () => {
      callCount++
      return makeErrResponse(400)
    })

    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('exhausted')
    expect(callCount).toBe(1) // only one attempt
  })

  it('does not retry on 403', async () => {
    let callCount = 0
    const router = makeRouter(async () => {
      callCount++
      return makeErrResponse(403)
    })

    const result = await router.routeDirectMessage(makeIntent())
    expect(callCount).toBe(1)
    expect(result.ok).toBe(false)
  })

  it('retries on network errors (fetch throws)', async () => {
    let callCount = 0
    const router = makeRouter(async () => {
      callCount++
      throw new Error('ECONNREFUSED')
    })

    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('exhausted')
    expect(callCount).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

describe('Circuit breaker', () => {
  it('opens after CIRCUIT_OPEN_THRESHOLD consecutive failures', async () => {
    let callCount = 0
    const router = makeRouter(async () => {
      callCount++
      return makeErrResponse(503)
    })

    // Exhaust retries for 5 separate routing calls to build up circuit failures
    // Each routeDirectMessage call with 503s will itself exhaust MAX_ATTEMPTS (5 tries)
    // and record 5 failures. That should open the circuit after the first call.
    await router.routeDirectMessage(makeIntent({ messageId: 'msg-1' }))
    const circuitAfterFirst = router.getCircuitState(BOB_DID)
    expect(circuitAfterFirst).not.toBeNull()
    expect(circuitAfterFirst!.failures).toBeGreaterThanOrEqual(5)
    expect(circuitAfterFirst!.openedAt).not.toBeNull()

    // Next call should be short-circuited
    const callsBefore = callCount
    const result = await router.routeDirectMessage(makeIntent({ messageId: 'msg-2' }))
    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('circuit_open')
    // fetch should not have been called again
    expect(callCount).toBe(callsBefore)
  })

  it('allows a probe attempt after the reset window', async () => {
    let callCount = 0
    const circuits = new Map<string, { failures: number; openedAt: number | null }>()

    // Pre-populate an open circuit with an openedAt in the past (past reset window)
    circuits.set(BOB_DID, {
      failures: 10,
      openedAt: Date.now() - 120_000, // 2 minutes ago > CIRCUIT_RESET_MS (60s)
    })

    const router = new GermNetworkRouter({
      memoryApiBase: 'http://memory-api.test',
      serviceToken: 'svc-token',
      _circuitState: circuits,
    })

    globalThis.fetch = async () => {
      callCount++
      return makeOkResponse(200)
    }

    const result = await router.routeDirectMessage(makeIntent())
    expect(result.ok).toBe(true)
    expect(callCount).toBe(1)
    // Circuit should be reset on success
    expect(router.getCircuitState(BOB_DID)).toBeNull()
  })

  it('resetCircuit() clears the state for a DID', async () => {
    const circuits = new Map<string, { failures: number; openedAt: number | null }>()
    circuits.set(BOB_DID, { failures: 10, openedAt: Date.now() })

    const router = new GermNetworkRouter({
      memoryApiBase: 'http://memory-api.test',
      serviceToken: 'svc-token',
      _circuitState: circuits,
    })

    expect(router.getCircuitState(BOB_DID)).not.toBeNull()
    router.resetCircuit(BOB_DID)
    expect(router.getCircuitState(BOB_DID)).toBeNull()
  })

  it('independent circuits per DID', async () => {
    const CAROL_DID = 'did:plc:carol1234567890abc'
    const circuits = new Map<string, { failures: number; openedAt: number | null }>()

    // Bob's circuit is open
    circuits.set(BOB_DID, { failures: 10, openedAt: Date.now() })

    const router = new GermNetworkRouter({
      memoryApiBase: 'http://memory-api.test',
      serviceToken: 'svc-token',
      _circuitState: circuits,
    })

    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      return makeOkResponse(200)
    }

    // Routing to Carol should work fine (circuit is not open for Carol)
    const result = await router.routeDirectMessage(
      makeIntent({ recipient: { did: CAROL_DID } }),
    )
    expect(result.ok).toBe(true)
    expect(callCount).toBe(1)

    // Routing to Bob is still blocked
    const bobResult = await router.routeDirectMessage(makeIntent())
    expect(bobResult.ok).toBe(false)
    expect((bobResult as { reason: string }).reason).toBe('circuit_open')
    expect(callCount).toBe(1) // fetch not called again
  })
})
