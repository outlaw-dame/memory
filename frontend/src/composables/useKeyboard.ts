import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

// Module-level singleton — keyboard height is application-wide state.
const keyboardHeight = ref(0)
let initialized = false

async function initialize(): Promise<void> {
  if (initialized || !Capacitor.isNativePlatform()) return
  initialized = true

  await Keyboard.addListener('keyboardWillShow', info => {
    keyboardHeight.value = info.keyboardHeight
  }).catch(() => {})

  await Keyboard.addListener('keyboardWillHide', () => {
    keyboardHeight.value = 0
  }).catch(() => {})
}

export function useKeyboard() {
  initialize().catch(() => {})
  return { keyboardHeight }
}
