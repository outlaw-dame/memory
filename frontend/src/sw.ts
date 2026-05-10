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

const CACHE = 'memory-v2'

// Merge build-time injected asset URLs with the required shell entries.
// Deduplicate so '/' and '/index.html' don't appear twice if already in the manifest.
const PRECACHE_URLS = [...new Set(['/', '/index.html', ...__WB_MANIFEST.map(e => e.url)])]

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

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
          caches.open(CACHE).then(cache => cache.put(event.request, res.clone()))
        }
        return res
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
