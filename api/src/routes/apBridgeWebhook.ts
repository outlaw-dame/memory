/**
 * ActivityPub Remote Bridge — Ingress Webhook
 *
 * Receives raw ActivityPub activities forwarded by the fedify-sidecar relay
 * subscription worker (inbound-worker.ts, sidecar-actor path branch).
 *
 * The fedify-sidecar subscribes to AP relays via ApRelaySubscriptionService.
 * When a relay delivers Announce{Note} to the sidecar's relay actor inbox, the
 * inbound-worker publishes to Stream2 (RedPanda) and — when this webhook is
 * configured (AP_BRIDGE_WEBHOOK_URL) — also POSTs the raw activity JSON here.
 *
 * This endpoint stores the activity in ap_remote_posts so the unified feed
 * can surface live federated AP content alongside local and AT Protocol posts.
 *
 * Authentication:
 *   - All requests must include the AP_BRIDGE_SECRET in the
 *     X-Bridge-Secret header.
 *   - Requests without a valid secret are rejected with 401.
 */

import Elysia, { t } from 'elysia'
import { ingestApRemoteActivities } from '../services/ApRemoteIngestionService'
import crypto from 'crypto'

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(new Uint8Array(Buffer.from(a)), new Uint8Array(Buffer.from(b)))
}

const apBridgeWebhookPlugin = new Elysia({ name: 'ap-bridge-webhook', prefix: '/ap/webhook' })
  .post(
    '/ingress',
    async ({ body, headers, set }) => {
      const bridgeSecret = process.env.AP_BRIDGE_SECRET
      if (!bridgeSecret) {
        console.error('[ApBridgeWebhook] AP_BRIDGE_SECRET is not configured')
        set.status = 503
        return 'Bridge not configured'
      }

      const providedSecret = headers['x-bridge-secret'] as string | undefined
      if (!providedSecret || !safeCompare(providedSecret, bridgeSecret)) {
        set.status = 401
        return 'Unauthorized'
      }

      const sourceRelay = headers['x-source-relay'] as string | undefined

      try {
        const result = await ingestApRemoteActivities(body, sourceRelay)
        return { received: true, ...result }
      } catch (err) {
        console.error('[ApBridgeWebhook] Ingestion error:', err)
        // Return 200 so the sidecar does not retry on ingestion errors
        return { received: true, ingested: 0, skipped: 0, errors: 1 }
      }
    },
    {
      body: t.Any(),
      detail: 'Receives AP relay activities from the fedify sidecar for feed inclusion',
    },
  )

export default apBridgeWebhookPlugin
