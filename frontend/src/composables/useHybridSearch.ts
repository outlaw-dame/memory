/**
 * useHybridSearch — local offline-first hybrid search
 *
 * Combines PostgreSQL full-text search (BM25 via tsvector/ts_rank) with
 * vector semantic search (pgvector cosine similarity) using Reciprocal Rank
 * Fusion (RRF) — the same algorithm used in OpenSearch hybrid queries.
 *
 * RRF formula: score = 1/(k + rank_fts) + 1/(k + rank_vec)
 *   where k=60 is the standard smoothing constant.
 *
 * All queries run locally against PGlite in a Web Worker.
 * Embeddings are generated in embed.worker.ts (bge-small-en-v1.5, 384-dim).
 *
 * Usage:
 *   const { results, search, isSearching } = useHybridSearch()
 *   await search('cats in space')
 */
import { ref, readonly } from 'vue'
import { getWorker } from '@/db/localDb'
import type { LocalPost } from '@/db/localSchema'

// ---------------------------------------------------------------------------
// Embed worker client — re-exported from syncStore to avoid double workers.
// We instantiate a new one here for composable-level use; for production,
// consider sharing with syncStore via a Pinia service or provide/inject.
// ---------------------------------------------------------------------------

class EmbedClient {
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
      if (error) p.reject(new Error(error))
      else p.resolve(embeddings![0])
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

let _embedClient: EmbedClient | null = null
function getEmbed(): EmbedClient {
  if (!_embedClient) _embedClient = new EmbedClient()
  return _embedClient
}

// ---------------------------------------------------------------------------
// RRF SQL
// Runs two ranked sub-queries and fuses their ranks via RRF.
//   $1 — tsquery string  (e.g. 'cats & space')
//   $2 — vector string   (e.g. '[0.1,0.2,...]')
//   $3 — result limit    (integer)
// If one source returns no results (FTS misses or no embeddings), its
// contribution to RRF is 0 so the other source still dominates.
// ---------------------------------------------------------------------------

const RRF_SQL = `
WITH fts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY ts_rank(content_tsv, q) DESC) AS rank
  FROM local_posts, plainto_tsquery('english', $1) q
  WHERE content_tsv @@ q
),
vec AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS rank
  FROM local_posts
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $2::vector
  LIMIT 50
),
fused AS (
  SELECT
    COALESCE(fts.id, vec.id) AS id,
    (COALESCE(1.0 / (60 + fts.rank), 0) + COALESCE(1.0 / (60 + vec.rank), 0)) AS rrf_score
  FROM fts
  FULL OUTER JOIN vec ON fts.id = vec.id
)
SELECT lp.*, fused.rrf_score
FROM local_posts lp
INNER JOIN fused ON lp.id = fused.id
ORDER BY fused.rrf_score DESC
LIMIT $3;
`

// FTS-only fallback when no embeddings are available yet
const FTS_ONLY_SQL = `
SELECT lp.*, ts_rank(content_tsv, q) AS rrf_score
FROM local_posts lp, plainto_tsquery('english', $1) q
WHERE content_tsv @@ q
ORDER BY rrf_score DESC
LIMIT $2;
`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchResult extends LocalPost {
  rrf_score: number
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useHybridSearch() {
  const results = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchError = ref<string | null>(null)
  const lastQuery = ref('')

  /**
   * Run a hybrid FTS + semantic search.
   *
   * @param queryText — natural language search string
   * @param limit     — max results (default 20)
   */
  async function search(queryText: string, limit = 20): Promise<void> {
    const trimmed = queryText.trim()
    if (!trimmed || trimmed === lastQuery.value) return

    lastQuery.value = trimmed
    isSearching.value = true
    searchError.value = null

    try {
      const pg = await getWorker()

      // Check if any embeddings exist in the local DB
      const { rows: embeddingCheck } = await pg.query<{ has_embeddings: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM local_posts WHERE embedding IS NOT NULL) AS has_embeddings`,
        [],
      )

      const hasEmbeddings = embeddingCheck[0]?.has_embeddings ?? false

      if (!hasEmbeddings) {
        // Fall back to FTS-only until background embedding catches up
        const { rows } = await pg.query<SearchResult>(FTS_ONLY_SQL, [trimmed, limit])
        results.value = rows
        return
      }

      // Generate query embedding
      const embedding = await getEmbed().embed(trimmed)
      const vecStr = `[${embedding.join(',')}]`

      const { rows } = await pg.query<SearchResult>(RRF_SQL, [trimmed, vecStr, limit])
      results.value = rows
    } catch (err) {
      searchError.value = err instanceof Error ? err.message : 'Search failed'
      console.error('[useHybridSearch] error:', err)
      results.value = []
    } finally {
      isSearching.value = false
    }
  }

  function clear(): void {
    results.value = []
    lastQuery.value = ''
    searchError.value = null
  }

  return {
    results: readonly(results),
    isSearching: readonly(isSearching),
    searchError: readonly(searchError),
    lastQuery: readonly(lastQuery),
    search,
    clear,
  }
}
