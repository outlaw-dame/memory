import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Framework7 from 'framework7-vue'
import App from './App.vue'
import router from './router'
import { initLocalDb } from './db/localDb'
import { initializeLocale } from './i18n'
import { applyPlatformCapabilities } from './platform/nativeUiProfile'
import { logSessionPolicyConfig } from './utils/sessionPolicy'

// Styles
// Import Framework7 CSS from node_modules directly
// This is needed because Framework7 v9 doesn't export CSS via package.json exports
import '../node_modules/framework7/framework7-bundle.css'
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

const app = createApp(App).use(createPinia()).use(router).use(Framework7)

app.mount('#app')
