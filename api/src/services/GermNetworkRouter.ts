/**
 * GermNetworkRouter
 *
 * Routes outbound `CanonicalDirectMessageIntent` to the Germ Network /
 * Memory API chat endpoint with:
 *
 *   - Exponential backoff with full-jitter: `delay = random(0, min(cap, base * 2^n))`
 *     (capped at 30 s, up to MAX_ATTEMPTS retries).
 *   - Per-DID circuit breaker: if a recipient DID has accumulated
 *     CIRCUIT_OPEN_THRESHOLD consecutive failures, routing is short-circuited
 *     until CIRCUIT_RESET_MS elapses, preventing thundering-herd retries against
 *     persistently unhealthy endpoints.
 *   - Self-healing: the circuit half-opens on the first probe attempt after the
 *     reset window, and resets the counter on success.
 *   - Idempotency: callers should supply the stable `messageId` from the intent;
 *     the Memory API enforces uniqueness on that column.
 */

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Minimal actor reference shape needed by this router. */
export interface GermActorRef {
  did?: string | null;
  activityPubActorUri?: string | null;
  webId?: string | null;
  handle?: string | null;
  canonicalAccountId?: string | null;
}

/**
 * Subset of the fedify-sidecar CanonicalDirectMessageIntent required for routing.
 * Defined locally to avoid a cross-package import dependency.
 */
export interface GermDirectMessageIntent {
  kind: "DirectMessage";
  sender: GermActorRef;
  recipient: GermActorRef;
  text: string;
  messageId: string;
  timestamp: string;
  canonicalIntentId?: string;
}

// ---------------------------------------------------------------------------
// Config constants
// ---------------------------------------------------------------------------

const BASE_MS = 250
const CAP_MS = 30_000
const MAX_ATTEMPTS = 5

/** Number of consecutive failures before a circuit opens for a DID. */
const CIRCUIT_OPEN_THRESHOLD = 5
/** How long (ms) a circuit stays open before a probe is allowed. */
const CIRCUIT_RESET_MS = 60_000

// ---------------------------------------------------------------------------
// Backoff helpers
// ---------------------------------------------------------------------------

/**
 * Full-jitter exponential back-off delay for attempt `n` (0-indexed).
 * Returns a random value in [0, min(CAP_MS, BASE_MS * 2^n)].
 */
function backoffDelayMs(attempt: number): number {
  const ceiling = Math.min(CAP_MS, BASE_MS * Math.pow(2, attempt))
  return Math.floor(Math.random() * ceiling)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Circuit-breaker state
// ---------------------------------------------------------------------------

interface CircuitState {
  /** Number of consecutive failures. */
  failures: number
  /** Timestamp when the circuit was opened (ms since epoch). */
  openedAt: number | null
}

// ---------------------------------------------------------------------------
// Router result types
// ---------------------------------------------------------------------------

export type RouteOutcome =
  | { ok: true; status: number }
  | { ok: false; reason: 'circuit_open'; did: string }
  | { ok: false; reason: 'exhausted'; attempts: number; lastStatus?: number }
  | { ok: false; reason: 'invalid_input'; message: string }

// ---------------------------------------------------------------------------
// GermNetworkRouter
// ---------------------------------------------------------------------------

export interface GermNetworkRouterOptions {
  /** Base URL of the Memory API, e.g. `http://localhost:8796`. */
  memoryApiBase: string
  /**
   * Bearer token injected into the `Authorization` header for service-to-service
   * calls.  Should be a long-lived service-account JWT, not a user JWT.
   */
  serviceToken: string
  /** Override the circuit state map for testing. */
  _circuitState?: Map<string, CircuitState>
}

export class GermNetworkRouter {
  private readonly memoryApiBase: string
  private readonly serviceToken: string
  /** Per-recipient-DID circuit state. */
  private readonly circuits: Map<string, CircuitState>

  public constructor(opts: GermNetworkRouterOptions) {
    this.memoryApiBase = opts.memoryApiBase.replace(/\/+$/, '')
    this.serviceToken = opts.serviceToken
    this.circuits = opts._circuitState ?? new Map()
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Route a `CanonicalDirectMessageIntent` to the Memory API with exponential
   * backoff and circuit-breaker protection.
   *
   * Retries on transient HTTP errors (5xx, network errors).  Does not retry on
   * permanent errors (4xx — bad request, auth, not found) to avoid repeating
   * invalid calls.
   */
  public async routeDirectMessage(intent: GermDirectMessageIntent): Promise<RouteOutcome> {
    const recipientDid = intent.recipient?.did ?? intent.recipient?.activityPubActorUri
    if (!recipientDid || typeof recipientDid !== 'string') {
      return { ok: false, reason: 'invalid_input', message: 'intent.recipient did/uri is required' }
    }

    // Circuit-breaker check
    const circuitResult = this.checkCircuit(recipientDid)
    if (circuitResult !== 'allow') {
      console.warn(
        { recipientDid },
        'GermNetworkRouter: circuit open, skipping delivery attempt',
      )
      return { ok: false, reason: 'circuit_open', did: recipientDid }
    }

    let lastStatus: number | undefined
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = backoffDelayMs(attempt - 1)
        console.debug(
          { recipientDid, attempt, delayMs: delay },
          'GermNetworkRouter: retrying after backoff',
        )
        await sleep(delay)
      }

      try {
        const outcome = await this.dispatchToMemoryApi(intent)

        if (outcome.ok) {
          this.recordSuccess(recipientDid)
          return outcome
        }

        lastStatus = outcome.status

        // Permanent errors: do not retry
        if (lastStatus >= 400 && lastStatus < 500) {
          this.recordSuccess(recipientDid) // 4xx is not a service failure
          return { ok: false, reason: 'exhausted', attempts: attempt + 1, lastStatus }
        }

        // Transient errors (5xx or undefined): record failure and retry
        this.recordFailure(recipientDid)
        console.warn(
          { recipientDid, attempt, status: lastStatus },
          'GermNetworkRouter: transient error, will retry',
        )
      } catch (err: unknown) {
        this.recordFailure(recipientDid)
        const message = err instanceof Error ? err.message : String(err)
        console.warn(
          { recipientDid, attempt, err: message },
          'GermNetworkRouter: network error, will retry',
        )
        lastStatus = undefined
      }
    }

    console.error(
      { recipientDid, attempts: MAX_ATTEMPTS, lastStatus },
      'GermNetworkRouter: delivery exhausted',
    )
    return { ok: false, reason: 'exhausted', attempts: MAX_ATTEMPTS, lastStatus }
  }

  // -------------------------------------------------------------------------
  // Circuit breaker
  // -------------------------------------------------------------------------

  private checkCircuit(did: string): 'allow' | 'open' {
    const state = this.circuits.get(did)
    if (!state || state.failures < CIRCUIT_OPEN_THRESHOLD) return 'allow'

    const elapsed = Date.now() - (state.openedAt ?? 0)
    if (elapsed >= CIRCUIT_RESET_MS) {
      // Half-open: allow one probe attempt through
      return 'allow'
    }

    return 'open'
  }

  private recordSuccess(did: string): void {
    this.circuits.delete(did)
  }

  private recordFailure(did: string): void {
    const state = this.circuits.get(did) ?? { failures: 0, openedAt: null }
    state.failures += 1
    if (state.failures >= CIRCUIT_OPEN_THRESHOLD && state.openedAt === null) {
      state.openedAt = Date.now()
      console.warn({ did, failures: state.failures }, 'GermNetworkRouter: circuit opened')
    }
    this.circuits.set(did, state)
  }

  /** Expose circuit state for observability / testing. */
  public getCircuitState(did: string): Readonly<CircuitState> | null {
    return this.circuits.get(did) ?? null
  }

  /** Reset a circuit (e.g. after manual intervention). */
  public resetCircuit(did: string): void {
    this.circuits.delete(did)
  }

  // -------------------------------------------------------------------------
  // HTTP dispatch
  // -------------------------------------------------------------------------

  private async dispatchToMemoryApi(
    intent: GermDirectMessageIntent,
  ): Promise<{ ok: true; status: number } | { ok: false; status: number }> {
    const url = `${this.memoryApiBase}/chat/sendMessage`

    const body = JSON.stringify({
      convoId: intent.canonicalIntentId,
      text: intent.text,
      senderDid: intent.sender.did ?? intent.sender.activityPubActorUri,
      messageId: intent.messageId,
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.serviceToken}`,
      },
      body,
    })

    if (res.ok) {
      return { ok: true, status: res.status }
    }
    return { ok: false, status: res.status }
  }
}
