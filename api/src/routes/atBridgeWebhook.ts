/**
 * AT Protocol Bridge — Ingress Webhook
 *
 * Receives trusted bridge events from the mastopod-federation-architecture
 * pipeline via HTTP webhook and writes them to the memory database.
 *
 * Supported payload contracts:
 *   - Legacy at.ingress.v1 envelopes (#commit, #identity, #account)
 *   - CanonicalIntent envelopes (PostCreate, PostEdit, PostDelete, etc.)
 *
 * CanonicalIntent is the preferred unification contract. Legacy ingress support
 * remains for backward compatibility while sidecar workers migrate fully to
 * canonical-first delivery.
 *
 * Authentication:
 *   - All requests must include the FIREHOSE_BRIDGE_SECRET in the
 *     X-Bridge-Secret header.
 *   - Requests without a valid secret are rejected with 401.
 *
 * Security notes:
 *   - The bridge secret is validated using a constant-time comparison to
 *     prevent timing attacks.
 *   - Request bodies are validated against the expected schema.
 *   - Individual event processing failures do not fail the entire batch.
 */

import Elysia, { t } from 'elysia'
import { atBridgeIngestionService } from '../services/AtBridgeIngestionService'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Constant-time string comparison to prevent timing attacks
// ---------------------------------------------------------------------------

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(new Uint8Array(Buffer.from(a)), new Uint8Array(Buffer.from(b)))
}

// ---------------------------------------------------------------------------
// Webhook route
// ---------------------------------------------------------------------------

const atBridgeWebhookPlugin = new Elysia({ name: 'at-bridge-webhook', prefix: '/at/webhook' })

  // -------------------------------------------------------------------------
  // POST /at/webhook/ingress — Receive trusted ingress events
  // -------------------------------------------------------------------------
  .post(
    '/ingress',
    async ({ body, headers, set }) => {
      // Authenticate the request
      const bridgeSecret = process.env.FIREHOSE_BRIDGE_SECRET
      if (!bridgeSecret) {
        console.error('[AtBridgeWebhook] FIREHOSE_BRIDGE_SECRET is not configured')
        set.status = 503
        return 'Bridge not configured'
      }

      const providedSecret = headers['x-bridge-secret'] as string | undefined
      if (!providedSecret || !safeCompare(providedSecret, bridgeSecret)) {
        set.status = 401
        return 'Unauthorized'
      }

      // Process events
      const events = Array.isArray(body) ? body : [body]

      // Enforce a batch-size cap to prevent resource exhaustion.
      const MAX_BATCH = 500
      if (events.length > MAX_BATCH) {
        set.status = 400
        return `Batch too large: max ${MAX_BATCH} events per request`
      }
      const results = {
        processed: 0,
        failed: 0,
        total: events.length,
      }

      for (const event of events) {
        const success = await atBridgeIngestionService.processBridgeEvent(event as any)
        if (success) {
          results.processed++
        } else {
          results.failed++
        }
      }

      return results
    },
    {
      body: t.Union([
        t.Object({
          seq: t.Number(),
          did: t.String(),
          eventType: t.String(),
          verifiedAt: t.String(),
          source: t.String(),
          commit: t.Optional(t.Any()),
          identity: t.Optional(t.Any()),
          account: t.Optional(t.Any()),
        }),
        t.Array(t.Object({
          seq: t.Number(),
          did: t.String(),
          eventType: t.String(),
          verifiedAt: t.String(),
          source: t.String(),
          commit: t.Optional(t.Any()),
          identity: t.Optional(t.Any()),
          account: t.Optional(t.Any()),
        })),
        t.Object({
          canonicalIntentId: t.String(),
          kind: t.String(),
          sourceProtocol: t.String(),
          sourceEventId: t.String(),
          sourceAccountRef: t.Any(),
          createdAt: t.String(),
          observedAt: t.String(),
          visibility: t.Any(),
          provenance: t.Any(),
          warnings: t.Array(t.Any()),
          object: t.Optional(t.Any()),
          content: t.Optional(t.Any()),
          inReplyTo: t.Optional(t.Any()),
          subject: t.Optional(t.Any()),
          wallTarget: t.Optional(t.Any()),
          reactionType: t.Optional(t.String()),
          state: t.Optional(t.String()),
        }),
        t.Array(t.Object({
          canonicalIntentId: t.String(),
          kind: t.String(),
          sourceProtocol: t.String(),
          sourceEventId: t.String(),
          sourceAccountRef: t.Any(),
          createdAt: t.String(),
          observedAt: t.String(),
          visibility: t.Any(),
          provenance: t.Any(),
          warnings: t.Array(t.Any()),
          object: t.Optional(t.Any()),
          content: t.Optional(t.Any()),
          inReplyTo: t.Optional(t.Any()),
          subject: t.Optional(t.Any()),
          wallTarget: t.Optional(t.Any()),
          reactionType: t.Optional(t.String()),
          state: t.Optional(t.String()),
        })),
      ]),
      detail: { description: 'Receive trusted bridge events (legacy ingress + canonical intents) from the federation pipeline' },
      response: {
        200: t.Object({
          processed: t.Number(),
          failed: t.Number(),
          total: t.Number(),
        }),
        400: t.String(),
        401: t.String(),
        503: t.String(),
      },
    },
  )

  // -------------------------------------------------------------------------
  // GET /at/webhook/health — Webhook health check
  // -------------------------------------------------------------------------
  .get(
    '/health',
    () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      bridgeConfigured: !!process.env.FIREHOSE_BRIDGE_SECRET,
    }),
    {
      detail: { description: 'AT Protocol bridge webhook health check' },
    },
  )

export default atBridgeWebhookPlugin
