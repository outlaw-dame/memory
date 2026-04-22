/**
 * Sync Store — offline-first delta sync between server Postgres and PGlite
 *
 * Responsibilities:
 *   1. Delta sync  — pull posts newer than the stored cursor from /at/feed
 *   2. Upsert      — write fetched posts into local_posts with tsvector update
 *   3. Embed queue — asynchronously generate embeddings for un-embedded posts
 *   4. Pending writes — buffer offline mutations; flush on reconnect
 *   5. Online/offline — listen to window events and trigger sync automatically
 *
 * Usage:
 *   const sync = useSyncStore()
 *   await sync.init()   // call once after app mount
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { getLocalDb, getWorker } from '@/db/localDb'
import { syncState, pendingWrites } from '@/db/localSchema'
import { eq } from 'drizzle-orm'
import { useAuthStore } from './authStore'
import type { UnifiedFeedItem } from './atBridgeStore'

// ---------------------------------------------------------------------------
// Embed worker client — promisified wrapper around embed.worker.ts
// ---------------------------------------------------------------------------

class EmbedWorkerClient {
  private worker: Worker
  private pending = new Map<number, { resolve: (v: number[]) => void; reject: (e: Error) => void }>()
  private nextId = 0

  constructor() {
    this.worker = new Worker(
      new URL('../workers/embed.worker.ts', import.meta.url),
      { type: 'module' },
    )
    this.worker.addEventListener('message', (e: MessageEvent) => {
      const { id, embeddings, error } = e.data as {
        id: number
        embeddings?: number[][]
        error?: string
      }
      const p = this.pending.get(id)
      if (!p) return
      this.pending.delete(id)
      if (error) {
        p.reject(new Error(error))
      } else {
        p.resolve(embeddings![0])
      }
    })
  }

  async embed(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ id, texts: [text] })
    })
  }
}

// Lazy singleton — only created when the store is first used
let _embedClient: EmbedWorkerClient | null = null
function getEmbedClient(): EmbedWorkerClient {
  if (!_embedClient) _embedClient = new EmbedWorkerClient()
  return _embedClient
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const SYNC_ENTITY = 'unified_feed'
const EMBED_BATCH_SIZE = 8
const SYNC_LIMIT = 200       // posts fetched per sync pass
const MAX_WRITE_RETRIES = 3

export const useSyncStore = defineStore('sync', () => {
  const authStore = useAuthStore()

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const isSyncing = ref(false)
  const isEmbedding = ref(false)
  const isOnline = ref(navigator.onLine)
  const lastSyncedAt = ref<Date | null>(null)
  const pendingWriteCount = ref(0)
  const syncError = ref<string | null>(null)

  // -------------------------------------------------------------------------
  // Computed
  // -------------------------------------------------------------------------

  const hasPendingWrites = computed(() => pendingWriteCount.value > 0)

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------

  /**
   * Bootstrap sync: register online/offline listeners, then run first sync.
   * Call once after app mount and user authentication.
   */
  async function init(): Promise<void> {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Respond to sync triggers from the service worker
    navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_NOW') {
        void syncFeed()
      }
    })

    await refreshPendingCount()

    if (isOnline.value) {
      await Promise.all([flushPendingWrites(), syncFeed()])
    }
  }

  function onOnline(): void {
    isOnline.value = true
    void syncFeed()
    void flushPendingWrites()
  }

  function onOffline(): void {
    isOnline.value = false
  }

  // -------------------------------------------------------------------------
  // Delta sync — pull from /at/feed?since=<cursor>
  // -------------------------------------------------------------------------

  async function syncFeed(): Promise<void> {
    if (isSyncing.value || !isOnline.value) return
    if (!authStore.token) return

    isSyncing.value = true
    syncError.value = null

    try {
      const db = await getLocalDb()

      // Read cursor from local sync_state
      const [state] = await db
        .select()
        .from(syncState)
        .where(eq(syncState.entity, SYNC_ENTITY))
        .limit(1)

      const cursor = state?.cursor ?? null
      const apiBase = getApiBaseUrl()
      const sinceParam = cursor ? `&since=${encodeURIComponent(cursor)}` : ''

      const response = await fetch(
        `${apiBase}/at/feed?limit=${SYNC_LIMIT}&offset=0&mode=chronological&excludeViewed=true${sinceParam}`,
        {
          headers: buildApiHeaders({
            authToken: authStore.token || undefined,
            includeJsonContentType: true
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Sync fetch failed: ${response.status}`)
      }

      const items: UnifiedFeedItem[] = await response.json()

      if (items.length === 0) {
        lastSyncedAt.value = new Date()
        return
      }

      await upsertPosts(items)

      // Advance cursor to the newest post's timestamp
      const newest = items.reduce((acc, item) => {
        if (!item.createdAt) return acc
        return !acc || item.createdAt > acc ? item.createdAt : acc
      }, null as string | null)

      const now = new Date().toISOString()
      await db
        .insert(syncState)
        .values({ entity: SYNC_ENTITY, lastSyncedAt: new Date(), cursor: newest ?? now })
        .onConflictDoUpdate({
          target: syncState.entity,
          set: { lastSyncedAt: new Date(), cursor: newest ?? now },
        })

      lastSyncedAt.value = new Date()

      // Background embed pass (non-blocking)
      void embedPendingPosts()
    } catch (err) {
      syncError.value = err instanceof Error ? err.message : 'Sync failed'
      console.error('[SyncStore] syncFeed error:', err)
    } finally {
      isSyncing.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Upsert posts into local_posts with tsvector population
  // ---------------------------------------------------------------------------

  async function upsertPosts(items: UnifiedFeedItem[]): Promise<void> {
    const pg = await getWorker()

    for (const item of items) {
      const id = `${item.source === 'activitypods' ? 'ap' : 'at'}:${item.id}`

      await pg.query(
        `INSERT INTO local_posts (
          id, content, created_at, is_public,
          author_id, author_name, author_web_id, author_provider_endpoint,
          source, at_uri, object_uri, synced_at, content_tsv
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(),
          to_tsvector('english', $2)
        )
        ON CONFLICT (id) DO UPDATE SET
          content                  = EXCLUDED.content,
          created_at               = EXCLUDED.created_at,
          author_name              = EXCLUDED.author_name,
          object_uri               = EXCLUDED.object_uri,
          synced_at                = now(),
          content_tsv              = to_tsvector('english', EXCLUDED.content)`,
        [
          id,
          item.content,
          item.createdAt ? new Date(item.createdAt).toISOString() : null,
          item.isPublic,
          item.authorId ?? null,
          item.authorName,
          item.authorWebId,
          item.authorProviderEndpoint,
          item.source,
          item.atUri ?? null,
          item.objectUri ?? null,
        ],
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Background embedding pass
  // ---------------------------------------------------------------------------

  async function embedPendingPosts(): Promise<void> {
    if (isEmbedding.value) return

    isEmbedding.value = true

    try {
      const pg = await getWorker()
      const embedClient = getEmbedClient()

      // Fetch un-embedded posts in batches
      const { rows: pending } = await pg.query<{ id: string; content: string }>(
        `SELECT id, content FROM local_posts WHERE embedding IS NULL LIMIT $1`,
        [EMBED_BATCH_SIZE],
      )

      if (pending.length === 0) return

      // Embed each post and write back
      await Promise.all(
        pending.map(async row => {
          try {
            const embedding = await embedClient.embed(row.content)
            const vecStr = `[${embedding.join(',')}]`
            await pg.query(
              `UPDATE local_posts SET embedding = $1::vector WHERE id = $2`,
              [vecStr, row.id],
            )
          } catch (err) {
            console.warn(`[SyncStore] embed failed for ${row.id}:`, err)
          }
        }),
      )

      // If there are more unembedded posts, schedule another pass
      const { rows: remaining } = await pg.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM local_posts WHERE embedding IS NULL`,
        [],
      )
      if (remaining[0]?.count > 0) {
        setTimeout(() => void embedPendingPosts(), 500)
      }
    } finally {
      isEmbedding.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Pending writes — offline mutation buffer
  // ---------------------------------------------------------------------------

  /**
   * Queue a mutation for later replay when online.
   * If currently online, attempts immediate flush.
   */
  async function queueWrite(
    entity: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    payload: unknown,
  ): Promise<void> {
    const db = await getLocalDb()
    await db.insert(pendingWrites).values({
      id: crypto.randomUUID(),
      entity,
      method,
      path,
      payload: JSON.stringify(payload),
    })

    pendingWriteCount.value++

    if (isOnline.value) {
      void flushPendingWrites()
    }
  }

  async function flushPendingWrites(): Promise<void> {
    if (!isOnline.value || !authStore.token) return

    const db = await getLocalDb()
    const writes = await db.select().from(pendingWrites)

    const apiBase = getApiBaseUrl()

    for (const write of writes) {
      try {
        const res = await fetch(`${apiBase}${write.path}`, {
          method: write.method,
          headers: buildApiHeaders({
            authToken: authStore.token || undefined,
            includeJsonContentType: write.method !== 'DELETE'
          }),
          body: write.method !== 'DELETE' ? write.payload : undefined,
        })

        if (res.ok) {
          await db.delete(pendingWrites).where(eq(pendingWrites.id, write.id))
          pendingWriteCount.value = Math.max(0, pendingWriteCount.value - 1)
        } else {
          await db
            .update(pendingWrites)
            .set({
              failCount: write.failCount + 1,
              attemptedAt: new Date(),
            })
            .where(eq(pendingWrites.id, write.id))

          // Give up after MAX_WRITE_RETRIES to avoid poison-pill entries
          if (write.failCount + 1 >= MAX_WRITE_RETRIES) {
            await db.delete(pendingWrites).where(eq(pendingWrites.id, write.id))
            pendingWriteCount.value = Math.max(0, pendingWriteCount.value - 1)
            console.warn(`[SyncStore] dropped pending write after ${MAX_WRITE_RETRIES} failures:`, write)
          }
        }
      } catch (err) {
        console.error('[SyncStore] flushPendingWrites error:', err)
      }
    }
  }

  async function refreshPendingCount(): Promise<void> {
    const pg = await getWorker()
    const { rows } = await pg.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM pending_writes`,
      [],
    )
    pendingWriteCount.value = rows[0]?.count ?? 0
  }

  // ---------------------------------------------------------------------------
  // Teardown
  // ---------------------------------------------------------------------------

  function destroy(): void {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }

  return {
    // State
    isSyncing,
    isEmbedding,
    isOnline,
    lastSyncedAt,
    pendingWriteCount,
    syncError,

    // Computed
    hasPendingWrites,

    // Actions
    init,
    syncFeed,
    queueWrite,
    flushPendingWrites,
    embedPendingPosts,
    destroy,
  }
})
