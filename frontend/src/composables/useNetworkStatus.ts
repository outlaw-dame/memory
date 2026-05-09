import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

// Module-level singleton — shared across all callers, initialized once.
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
let initialized = false

async function initialize(): Promise<void> {
  if (initialized) return
  initialized = true

  if (Capacitor.isNativePlatform()) {
    const status = await Network.getStatus().catch(() => null)
    if (status !== null) isOnline.value = status.connected

    Network.addListener('networkStatusChange', status => {
      isOnline.value = status.connected
    }).catch(() => {})
  } else {
    window.addEventListener('online',  () => { isOnline.value = true  }, { passive: true })
    window.addEventListener('offline', () => { isOnline.value = false }, { passive: true })
  }
}

export function useNetworkStatus() {
  initialize().catch(() => {})
  return { isOnline }
}
