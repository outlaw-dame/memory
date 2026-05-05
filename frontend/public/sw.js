/**
 * Memory App Service Worker
 *
 * Responsibilities:
 *   1. Cache static assets (stale-while-revalidate)
 *   2. Network-only pass-through for API requests (caching happens at PGlite layer)
 *   3. Relay SYNC_NOW messages to all open clients on reconnection
 */
const CACHE = 'memory-v1'

const PRECACHE_URLS = ['/', '/index.html']

// ---------------------------------------------------------------------------
// Install — precache shell
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
// Activate — prune old caches and claim clients immediately
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
// Fetch — network-first for API, stale-while-revalidate for static assets
// ---------------------------------------------------------------------------

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Let API calls pass through — PGlite handles local caching
  if (
    url.pathname.startsWith('/at/') ||
    url.pathname.startsWith('/posts') ||
    url.port === '8796'
  ) {
    return
  }

  // Stale-while-revalidate for static assets
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
  if (event.data?.type === 'TRIGGER_SYNC') {
    self.clients
      .matchAll({ includeUncontrolled: true, type: 'window' })
      .then(clients => clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' })))
  }
})

// ---------------------------------------------------------------------------
// Background Sync — flush pending writes when connectivity resumes
// ---------------------------------------------------------------------------

self.addEventListener('sync', event => {
  if (event.tag === 'flush-pending-writes') {
    event.waitUntil(
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then(clients => clients.forEach(c => c.postMessage({ type: 'SYNC_NOW' }))),
    )
  }
})
