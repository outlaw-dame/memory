const MS_PER_HOUR = 1000 * 60 * 60

export const DEFAULT_SESSION_MAX_AGE_MS = 8 * MS_PER_HOUR
export const DEFAULT_REAUTH_DEFER_MS = 4 * MS_PER_HOUR

function parsePositiveDurationMs(raw: unknown, fallbackMs: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs
  return parsed
}

export interface SessionPolicyConfig {
  sessionMaxAgeMs: number
  podReauthDeferMs: number
}

function parseBooleanFlag(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const value = raw.trim().toLowerCase()
  return value === 'true' || value === '1'
}

let cachedConfig: SessionPolicyConfig | null = null
let hasLoggedConfig = false

export function getSessionPolicyConfig(): SessionPolicyConfig {
  if (cachedConfig) return cachedConfig

  cachedConfig = {
    sessionMaxAgeMs: parsePositiveDurationMs(import.meta.env.VITE_SESSION_MAX_AGE_MS, DEFAULT_SESSION_MAX_AGE_MS),
    podReauthDeferMs: parsePositiveDurationMs(import.meta.env.VITE_POD_REAUTH_DEFER_MS, DEFAULT_REAUTH_DEFER_MS),
  }

  return cachedConfig
}

export function logSessionPolicyConfig(): void {
  if (hasLoggedConfig) return
  hasLoggedConfig = true

  const config = getSessionPolicyConfig()
  console.info('[SessionPolicy] Effective frontend policy', {
    sessionMaxAgeMs: config.sessionMaxAgeMs,
    podReauthDeferMs: config.podReauthDeferMs,
  })
}

export function isOperatorDiagnosticsEnabled(): boolean {
  return parseBooleanFlag(import.meta.env.VITE_SHOW_OPERATOR_DIAGNOSTICS)
}
