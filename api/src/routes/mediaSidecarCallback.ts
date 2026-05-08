/**
 * Media Pipeline Sidecar — Processed Asset Callback
 *
 * Receives the `ActivityPodsCallbackPayload` that the media-pipeline-sidecar
 * delivers after it has finished processing an uploaded media asset.  The
 * sidecar already retries with exponential back-off (up to 4 attempts, 10 s
 * timeout) and treats HTTP 409 as success, so this endpoint is designed to
 * be idempotent.
 *
 * Matching is done by `sourceUrl` (the pod LDP URL produced by the raw upload
 * and stored in `media_attachments.source_url`).  The sidecar carries this
 * value through from the ActivityPods LDP-created event.
 *
 * Authentication:
 *   Bearer token in the `Authorization` header, compared with
 *   `MEMORY_SIDECAR_CALLBACK_TOKEN` using a constant-time comparison to
 *   prevent timing-oracle attacks.
 *
 * Configuration (env vars):
 *   MEMORY_SIDECAR_CALLBACK_TOKEN  — shared secret; if unset the endpoint
 *                                    returns 503 so mis-configuration is
 *                                    visible rather than silently open.
 */

import Elysia, { t } from 'elysia'
import { timingSafeEqual } from 'node:crypto'
import { updateMediaAttachmentProcessed } from '../services/MediaAttachments'

// CanonicalAsset.duration is produced by ffprobe's format.duration which is
// in fractional seconds.  Memory stores durationMs (integer milliseconds).
function parseDurationMs(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds < 0) return null
  return Math.round(seconds * 1000)
}

function extractBearer(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null
  const match = authorizationHeader.match(/^Bearer (.+)$/)
  return match ? match[1] : null
}

function safeCompare(a: string, b: string): boolean {
  // Constant-time length-aware comparison: pad the shorter string so both
  // buffers are the same byte length before calling timingSafeEqual.
  const aBuf = new Uint8Array(Buffer.from(a, 'utf8'))
  const bBuf = new Uint8Array(Buffer.from(b, 'utf8'))
  if (aBuf.byteLength !== bBuf.byteLength) {
    // Still run a constant-time comparison against itself to avoid short-
    // circuit timing leaks, then return false.
    timingSafeEqual(aBuf, aBuf)
    return false
  }
  return timingSafeEqual(aBuf, bBuf)
}

const mediaSidecarCallbackPlugin = new Elysia({
  name: 'media-sidecar-callback',
  prefix: '/media/sidecar',
})
  .post(
    '/callback',
    async ({ body, headers, set }) => {
      // ── Authentication ──────────────────────────────────────────────────────
      const expectedToken = process.env.MEMORY_SIDECAR_CALLBACK_TOKEN
      if (!expectedToken) {
        console.error('[MediaSidecarCallback] MEMORY_SIDECAR_CALLBACK_TOKEN is not configured')
        set.status = 503
        return { received: false, error: 'callback_not_configured' }
      }

      const providedToken = extractBearer(headers['authorization'])
      if (!providedToken || !safeCompare(providedToken, expectedToken)) {
        set.status = 401
        return { received: false, error: 'unauthorized' }
      }

      // ── Extract fields from the CanonicalAsset ───────────────────────────
      const { asset } = body
      const sourceUrls: string[] = Array.isArray(asset.sourceUrls) ? asset.sourceUrls : []

      if (sourceUrls.length === 0) {
        // No source URL means we cannot match to a media_attachments row.
        // Return 200 so the sidecar does not endlessly retry for assets that
        // were not originated from a Memory upload.
        return { received: true, matched: false, reason: 'no_source_urls' }
      }

      const processedUpdate = {
        canonicalUrl: asset.canonicalUrl as string,
        gatewayUrl: (asset.gatewayUrl as string | undefined) ?? null,
        filebaseCid: (asset.cid as string | undefined) ?? null,
        digestMultibase: (asset.digestMultibase as string | undefined) ?? null,
        width: typeof asset.width === 'number' ? asset.width : null,
        height: typeof asset.height === 'number' ? asset.height : null,
        durationMs: parseDurationMs(asset.duration),
        blurhash: (asset.blurhash as string | undefined) ?? null,
        thumbnailUrl: (asset.variants?.thumbnail as string | undefined) ?? null,
        previewUrl: (asset.variants?.preview as string | undefined) ?? null,
      }

      // Try each sourceUrl in order; first match wins.
      for (const sourceUrl of sourceUrls) {
        const outcome = await updateMediaAttachmentProcessed(sourceUrl, processedUpdate)

        if (outcome === 'updated') {
          return { received: true, matched: true, outcome }
        }

        if (outcome === 'already_ready') {
          // Idempotent re-delivery — sidecar expects 409 as a success signal.
          set.status = 409
          return { received: true, matched: true, outcome }
        }

        // outcome === 'not_found' — try the next sourceUrl
      }

      // None of the sourceUrls matched an active media_attachments row.
      // Return 200 (not 404) so the sidecar does not burn retries on assets
      // that were processed outside of the Memory upload flow.
      return { received: true, matched: false, reason: 'no_matching_attachment' }
    },
    {
      body: t.Object({
        asset: t.Object({
          assetId: t.Optional(t.String()),
          canonicalUrl: t.String({ minLength: 1 }),
          gatewayUrl: t.Optional(t.String()),
          cid: t.Optional(t.String()),
          digestMultibase: t.Optional(t.String()),
          sourceUrls: t.Optional(t.Array(t.String())),
          width: t.Optional(t.Number()),
          height: t.Optional(t.Number()),
          duration: t.Optional(t.Union([t.Number(), t.String()])),
          blurhash: t.Optional(t.String()),
          variants: t.Optional(
            t.Object({
              original: t.Optional(t.String()),
              thumbnail: t.Optional(t.String()),
              preview: t.Optional(t.String()),
            }, { additionalProperties: true }),
          ),
        }, { additionalProperties: true }),
        signals: t.Optional(t.Any()),
        bindings: t.Optional(t.Any()),
      }),
      detail: {
        description: 'Internal: receives processed media asset results from the media-pipeline-sidecar',
      },
    },
  )

export default mediaSidecarCallbackPlugin
