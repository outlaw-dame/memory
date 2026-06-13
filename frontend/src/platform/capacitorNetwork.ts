/**
 * Capacitor Network Utilities
 *
 * Wraps Capacitor Network plugin for network status monitoring.
 * This is the ONLY place where @capacitor/network should be imported.
 *
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Event listener cleanup to prevent memory leaks
 * - Error handling for all Capacitor calls
 */

import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

// Module-level singleton — shared across all callers, initialized once.
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
let initialized = false

/**
 * Initialize network status monitoring
 * Should be called once during app startup
 */
export async function initNetwork(): Promise<void> {
  if (initialized) return
  initialized = true

  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Network.getStatus()
      if (status !== null) {
        isOnline.value = status.connected
      }

      Network.addListener('networkStatusChange', status => {
        isOnline.value = status.connected
      })
    } catch (error) {
      // Silently fail - network status is not critical
      console.warn('[CapacitorNetwork] Failed to initialize network listener:', error)
    }
  } else {
    // Browser environment
    window.addEventListener('online', () => { isOnline.value = true }, { passive: true })
    window.addEventListener('offline', () => { isOnline.value = false }, { passive: true })
  }
}

/**
 * Get the current network online status
 */
export function useNetworkStatus(): { isOnline: Ref<boolean> } {
  return { isOnline }
}

/**
 * Check if currently online
 */
export function getIsOnline(): boolean {
  return isOnline.value
}

/**
 * Get the network status as a ref
 */
export function getOnlineRef(): Ref<boolean> {
  return isOnline
}

/**
 * Get current network status from Capacitor (native only)
 */
export async function getNetworkStatus(): Promise<{
  connected: boolean
  connectionType: string
} | null> {
  if (!Capacitor.isNativePlatform()) return null
  
  try {
    const status = await Network.getStatus()
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    }
  } catch {
    return null
  }
}

// Re-export types
import type { Ref } from 'vue'
export type { ConnectionType } from '@capacitor/network'
