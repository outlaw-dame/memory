import { ref } from 'vue'
import { initNetwork, useNetworkStatus as usePlatformNetworkStatus } from '@/platform'

// Module-level singleton — shared across all callers, initialized once.
// The actual initialization is now handled by the platform utility
let initialized = false

async function initialize(): Promise<void> {
  if (initialized) return
  initialized = true
  await initNetwork()
}

export function useNetworkStatus() {
  initialize().catch(() => {})
  return usePlatformNetworkStatus()
}
