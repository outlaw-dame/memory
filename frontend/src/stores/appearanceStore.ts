import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'memory:appearance'

interface AppearanceState {
  /** Show the source protocol logo in feed metadata rows. Default on. */
  showProtocolBadge: boolean
  /** Show a lock icon for non-public posts. Default on (only appears when non-public). */
  showVisibilityIndicator: boolean
  /** Show "via [client app]" in thread detail view. Default off — power-user feature. */
  showClientApp: boolean
}

function loadState(): AppearanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return defaults()
}

function defaults(): AppearanceState {
  return {
    showProtocolBadge: true,
    showVisibilityIndicator: true,
    showClientApp: false,
  }
}

export const useAppearanceStore = defineStore('appearance', () => {
  const showProtocolBadge      = ref(loadState().showProtocolBadge)
  const showVisibilityIndicator = ref(loadState().showVisibilityIndicator)
  const showClientApp          = ref(loadState().showClientApp)

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        showProtocolBadge: showProtocolBadge.value,
        showVisibilityIndicator: showVisibilityIndicator.value,
        showClientApp: showClientApp.value,
      }))
    } catch { /* storage unavailable */ }
  }

  watch([showProtocolBadge, showVisibilityIndicator, showClientApp], persist, { flush: 'post' })

  function reset() {
    const d = defaults()
    showProtocolBadge.value = d.showProtocolBadge
    showVisibilityIndicator.value = d.showVisibilityIndicator
    showClientApp.value = d.showClientApp
  }

  return { showProtocolBadge, showVisibilityIndicator, showClientApp, reset }
})
