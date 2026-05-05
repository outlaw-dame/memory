/**
 * PGlite Web Worker
 *
 * Runs the local PostgreSQL database (via PGlite WASM) entirely off the main
 * thread.  Loaded by localDb.ts via PGliteWorker.
 *
 * Extensions loaded:
 *   - vector (pgvector) — enables vector(384) columns for semantic search
 */
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { worker } from '@electric-sql/pglite/worker'

worker({
  async init() {
    const db = new PGlite('idb://paper-atproto-db', {
      extensions: { vector },
    })
    await db.waitReady
    return db
  },
})
