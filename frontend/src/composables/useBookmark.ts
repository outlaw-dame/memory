import { ref, onMounted } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import ky, { HTTPError } from 'ky'
import { getLocalDb } from '@/db/localDb'
import { localBookmarks } from '@/db/localSchema'
import { eq } from 'drizzle-orm'

export function useBookmark() {
  /** Set of `postId` strings (format: `{source}:{atUri|objectUri}`) that the user has bookmarked. */
  const bookmarkedSet = ref<Set<string>>(new Set())
  const bookmarkError = ref<string | null>(null)

  // Rehydrate bookmark state from PGlite on composable init.
  onMounted(async () => {
    try {
      const db = await getLocalDb()
      const rows = await db.select({ postId: localBookmarks.postId }).from(localBookmarks)
      bookmarkedSet.value = new Set(rows.map(r => r.postId))
    } catch {
      // Non-fatal — UI falls back to empty state
    }
  })

  function makePostId(source: string, atUri?: string | null, objectUri?: string | null): string {
    return `${source}:${atUri ?? objectUri ?? ''}`
  }

  async function addBookmark(opts: {
    source: string
    atUri?: string | null
    objectUri?: string | null
  }): Promise<boolean> {
    bookmarkError.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      bookmarkError.value = 'Not authenticated'
      return false
    }
    const postId = makePostId(opts.source, opts.atUri, opts.objectUri)
    try {
      await ky.post(`${getApiBaseUrl()}/bookmarks`, {
        headers: buildApiHeaders({ authToken: token, includeJsonContentType: true }),
        json: opts,
      })
      bookmarkedSet.value = new Set([...bookmarkedSet.value, postId])
      getLocalDb()
        .then(db =>
          db
            .insert(localBookmarks)
            .values({ postId, bookmarkedAt: new Date() })
            .onConflictDoNothing()
        )
        .catch(() => undefined)
      return true
    } catch (e) {
      if (e instanceof HTTPError) {
        bookmarkError.value = `Bookmark failed (${e.response.status})`
      } else {
        bookmarkError.value = 'Bookmark failed'
      }
      return false
    }
  }

  async function removeBookmark(opts: {
    source: string
    atUri?: string | null
    objectUri?: string | null
  }): Promise<boolean> {
    bookmarkError.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      bookmarkError.value = 'Not authenticated'
      return false
    }
    const postId = makePostId(opts.source, opts.atUri, opts.objectUri)
    try {
      await ky.delete(`${getApiBaseUrl()}/bookmarks`, {
        headers: buildApiHeaders({ authToken: token, includeJsonContentType: true }),
        json: opts,
      })
      const next = new Set(bookmarkedSet.value)
      next.delete(postId)
      bookmarkedSet.value = next
      getLocalDb()
        .then(db => db.delete(localBookmarks).where(eq(localBookmarks.postId, postId)))
        .catch(() => undefined)
      return true
    } catch (e) {
      if (e instanceof HTTPError) {
        bookmarkError.value = `Remove bookmark failed (${e.response.status})`
      } else {
        bookmarkError.value = 'Remove bookmark failed'
      }
      return false
    }
  }

  async function toggleBookmark(opts: {
    source: string
    atUri?: string | null
    objectUri?: string | null
  }): Promise<boolean> {
    const postId = makePostId(opts.source, opts.atUri, opts.objectUri)
    if (bookmarkedSet.value.has(postId)) {
      return removeBookmark(opts)
    }
    return addBookmark(opts)
  }

  function isBookmarked(source: string, atUri?: string | null, objectUri?: string | null): boolean {
    return bookmarkedSet.value.has(makePostId(source, atUri, objectUri))
  }

  return { addBookmark, removeBookmark, toggleBookmark, isBookmarked, bookmarkError }
}
