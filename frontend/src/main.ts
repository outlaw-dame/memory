import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initLocalDb } from './db/localDb'
import { initializeLocale } from './i18n'
import { applyPlatformCapabilities } from './platform/capabilities'
import { logSessionPolicyConfig } from './utils/sessionPolicy'

// Styles
import './assets/theme.css'
import './assets/style.scss'

// Register service worker for offline caching and background sync relay
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .catch(err => console.warn('[SW] Registration failed:', err))
}

// Bootstrap local PGlite database (non-blocking — sync store waits for it)
initLocalDb().catch(err => console.error('[PGlite] init failed:', err))

initializeLocale()
applyPlatformCapabilities()

// Log effective session policy once for environment-level verification.
logSessionPolicyConfig()

const app = createApp(App).use(createPinia()).use(router)

app.mount('#app')
