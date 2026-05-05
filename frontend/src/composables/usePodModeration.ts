/**
 * usePodModeration
 *
 * Wires the dashboard Pod Management UI to the sidecar moderation bridge:
 *   POST /internal/admin/moderation/decisions     → handleApplyDecision
 *   DELETE /internal/admin/moderation/decisions/:id → handleRevokeDecision
 *   GET  /internal/admin/moderation/decisions      → handleListDecisions
 *
 * The sidecar performs:
 *   1. Emits AT labels via labelEmitter (signed secp256k1)
 *   2. Calls com.atproto.admin.updateSubjectStatus for suspend actions
 *   3. Persists ModerationDecision records to Redis
 *   4. Resolves WebID ↔ AT DID via identity binding store
 */

import { ref } from 'vue'
import { getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'

// ── Types (mirror sidecar moderation/types.ts) ────────────────────────────────

export type ModerationAction = 'label' | 'warn' | 'filter' | 'block' | 'suspend'
export type ModerationProtocol = 'at' | 'ap' | 'both' | 'none'
export type ModerationDecisionSource = 'provider-dashboard' | 'mrf-auto' | 'at-firehose'

export interface ModerationDecision {
  id: string
  source: ModerationDecisionSource
  targetWebId?: string
  targetAtDid?: string
  targetHandle?: string
  action: ModerationAction
  labels: string[]
  reason?: string
  appliedBy: string
  appliedAt: string
  protocols: ModerationProtocol
  mrfPatched: boolean
  atLabelEmitted: boolean
  atStatusUpdated: boolean
  revoked: boolean
  revokedAt?: string
  revokedBy?: string
}

export interface ApplyDecisionParams {
  targetWebId?: string
  targetAtDid?: string
  targetHandle?: string
  action: ModerationAction
  labels?: string[]
  reason?: string
}

// ── Composable ────────────────────────────────────────────────────────────────

export function usePodModeration() {
  const auth = useAuthStore()
  const pending = ref(false)
  const error = ref<string | null>(null)

  /**
   * Build the sidecar admin base URL.
   * The sidecar runs separately from the API; its internal admin routes are
   * protected by the shared ADMIN_TOKEN bearer header.
   *
   * In production this would be the sidecar's internal URL (e.g. http://sidecar:8000).
   * For local dev we proxy through the same origin via /api/sidecar.
   */
  function sidecarBase(): string {
    const base = getApiBaseUrl()
    // In dev the memory API proxies sidecar admin routes at /sidecar-admin
    return base.replace(/\/+$/, '') + '/sidecar-admin'
  }

  function authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  }

  /** Apply a cross-protocol moderation decision to a target. */
  async function applyDecision(params: ApplyDecisionParams): Promise<ModerationDecision | null> {
    pending.value = true
    error.value = null
    try {
      const res = await fetch(`${sidecarBase()}/internal/admin/moderation/decisions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to apply decision (${res.status}): ${text}`)
      }
      const body = await res.json() as { decision: ModerationDecision }
      return body.decision
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return null
    } finally {
      pending.value = false
    }
  }

  /** Revoke a previously applied decision (negates AT labels). */
  async function revokeDecision(id: string): Promise<ModerationDecision | null> {
    pending.value = true
    error.value = null
    try {
      const res = await fetch(`${sidecarBase()}/internal/admin/moderation/decisions/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to revoke decision (${res.status}): ${text}`)
      }
      const body = await res.json() as { decision: ModerationDecision }
      return body.decision
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return null
    } finally {
      pending.value = false
    }
  }

  /** List decisions, optionally filtered by target. */
  async function listDecisions(opts: {
    targetWebId?: string
    targetAtDid?: string
    action?: ModerationAction
    limit?: number
    includeRevoked?: boolean
  } = {}): Promise<ModerationDecision[]> {
    pending.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      if (opts.targetWebId)    params.set('targetWebId', opts.targetWebId)
      if (opts.targetAtDid)    params.set('targetAtDid', opts.targetAtDid)
      if (opts.action)         params.set('action', opts.action)
      if (opts.limit)          params.set('limit', String(opts.limit))
      if (opts.includeRevoked !== undefined) params.set('includeRevoked', String(opts.includeRevoked))

      const res = await fetch(`${sidecarBase()}/internal/admin/moderation/decisions?${params}`, {
        headers: authHeaders(),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to list decisions (${res.status}): ${text}`)
      }
      const body = await res.json() as { decisions: ModerationDecision[] }
      return body.decisions ?? []
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return []
    } finally {
      pending.value = false
    }
  }

  return { pending, error, applyDecision, revokeDecision, listDecisions }
}
