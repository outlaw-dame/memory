import { ref } from 'vue'
import { getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'

// ── Types (mirror sidecar keyword-filter registry types) ─────────────────────

export interface KeywordRule {
  pattern: string
  semantic: boolean
  similarityThreshold: number
  wholeWord: boolean
  caseSensitive: boolean
}

interface RulesResponse {
  rules: KeywordRule[]
  total: number
  enabled: boolean
  mode: string
}

interface ApiErrorBody {
  error?: { message?: string }
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useKeywordRules() {
  const auth = useAuthStore()
  const rules = ref<KeywordRule[]>([])
  const enabled = ref(false)
  const mode = ref('dry-run')
  const pending = ref(false)
  const error = ref<string | null>(null)

  function sidecarBase(): string {
    return getApiBaseUrl().replace(/\/+$/, '') + '/sidecar-admin'
  }

  function authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    }
  }

  async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
    const body = await res.json().catch(() => null) as ApiErrorBody | null
    return body?.error?.message ?? `${fallback} (${res.status})`
  }

  async function loadRules(): Promise<void> {
    pending.value = true
    error.value = null
    try {
      const res = await fetch(`${sidecarBase()}/internal/admin/spam/keyword-rules`, {
        headers: authHeaders(),
      })
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to load keyword rules'))
      }
      const body = await res.json() as RulesResponse
      rules.value = body.rules
      enabled.value = body.enabled
      mode.value = body.mode
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      pending.value = false
    }
  }

  async function addRule(rule: KeywordRule): Promise<boolean> {
    pending.value = true
    error.value = null
    try {
      const res = await fetch(`${sidecarBase()}/internal/admin/spam/keyword-rules`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(rule),
      })
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to add rule'))
      }
      await loadRules()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return false
    } finally {
      pending.value = false
    }
  }

  async function updateRule(rule: KeywordRule): Promise<boolean> {
    pending.value = true
    error.value = null
    try {
      const res = await fetch(`${sidecarBase()}/internal/admin/spam/keyword-rules`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(rule),
      })
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to update rule'))
      }
      await loadRules()
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return false
    } finally {
      pending.value = false
    }
  }

  async function removeRule(pattern: string): Promise<boolean> {
    pending.value = true
    error.value = null
    try {
      const res = await fetch(`${sidecarBase()}/internal/admin/spam/keyword-rules`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ pattern }),
      })
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, 'Failed to remove rule'))
      }
      rules.value = rules.value.filter((r) => r.pattern !== pattern)
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      return false
    } finally {
      pending.value = false
    }
  }

  return { rules, enabled, mode, pending, error, loadRules, addRule, updateRule, removeRule }
}
