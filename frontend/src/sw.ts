/// <reference lib="webworker" />
/// <reference no-default-lib="true" />

declare const self: ServiceWorkerGlobalScope

// vite-plugin-pwa (injectManifest strategy) replaces this token at build time
// with an array of all hashed build assets for cache-busting.
// IMPORTANT: __WB_MANIFEST must appear exactly once in the compiled output.
declare const __WB_MANIFEST: Array<{ url: string; revision: string | null }>

interface SyncEvent extends ExtendableEvent {
  readonly tag: string
}

// Cache version - increment this with each release to force cache invalidation
// This enables better cache busting during app updates
const APP_VERSION = '2.0.0' // Update this version number with each release
const CACHE = `memory-v${APP_VERSION}`

// Merge build-time injected asset URLs with the required shell entries.
// Deduplicate so '/' and '/index.html' don't appear twice if already in the manifest.
const PRECACHE_URLS = [...new Set(['/', '/index.html', '/offline.html', ...__WB_MANIFEST.map(e => e.url)])]

// Offline fallback page
const OFFLINE_PAGE = '/offline.html'

// ---------------------------------------------------------------------------
// Install — precache shell + all hashed build assets
// ---------------------------------------------------------------------------

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

// ---------------------------------------------------------------------------
// Activate — prune stale caches and claim clients immediately
// ---------------------------------------------------------------------------

// Maximum number of cached requests to prevent excessive storage usage
const MAX_CACHE_ENTRIES = 200

// Cache cleanup function to limit cache size by number of entries
async function cleanupCache() {
  const cache = await caches.open(CACHE)
  const keys = await cache.keys()
  
  // If cache has more entries than our limit, delete the oldest ones
  if (keys.length > MAX_CACHE_ENTRIES) {
    // Sort by URL to get a consistent order and take the oldest entries
    const sortedKeys = [...keys].sort((a, b) => a.url.localeCompare(b.url))
    const keysToDelete = sortedKeys.slice(0, keys.length - MAX_CACHE_ENTRIES)
    
    await Promise.all(
      keysToDelete.map(request => cache.delete(request))
    )
  }
}

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => cleanupCache())
      .then(() => self.clients.claim()),
  )
})

// ---------------------------------------------------------------------------
// Fetch — network-only for API, stale-while-revalidate for static assets
// ---------------------------------------------------------------------------

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Network-only: API calls are handled by PGlite at the app layer
  if (
    url.pathname.startsWith('/at/') ||
    url.pathname.startsWith('/posts') ||
    url.port === '8796'
  ) {
    return
  }

  // Stale-while-revalidate: serve cached immediately, refresh in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(res => {
        if (res.ok && event.request.method === 'GET') {
          caches.open(CACHE).then(cache => {
            cache.put(event.request, res.clone())
            // Periodically clean up cache to prevent excessive growth
            if (Math.random() < 0.01) { // ~1% chance to clean up on each request
              cleanupCache()
            }
          })
        }
        return res
      }).catch(() => {
        // If network fails, check if this is a navigation request
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE)
        }
        return null
      })
      return cached ?? network
    }),
  )
})

// ---------------------------------------------------------------------------
// Message — relay TRIGGER_SYNC to all open clients
// ---------------------------------------------------------------------------

self.addEventListener('message', event => {
  if ((event as ExtendableMessageEvent).data?.type === 'TRIGGER_SYNC') {
    self.clients
      .matchAll({ includeUncontrolled: true, type: 'window' })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' })))
  }
})

// ---------------------------------------------------------------------------
// Background Sync — flush pending writes when connectivity resumes
// ---------------------------------------------------------------------------

self.addEventListener('sync', event => {
  const syncEvent = event as SyncEvent
  if (syncEvent.tag === 'flush-pending-writes') {
    syncEvent.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then(clients => clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' }))),
    )
  }
})
