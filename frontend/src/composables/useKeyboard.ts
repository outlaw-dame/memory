import { ref } from 'vue'
import { initKeyboard, useKeyboardHeight } from '@/platform'

// Module-level singleton — keyboard height is application-wide state.
// The actual initialization is now handled by the platform utility
// We just need to ensure it's initialized when this composable is used
let initialized = false

async function initialize(): Promise<void> {
  if (initialized) return
  initialized = true
  await initKeyboard()
}

export function useKeyboard() {
  initialize().catch(() => {})
  return useKeyboardHeight()
}

// Re-export scrollIntoView and other utilities that were previously here
export { scrollIntoView } from '@/platform/safeAreaPolicy'
