/**
 * Wall Store — manages wall post state for Memory's profile wall feature.
 *
 * Handles fetching, posting to, and deleting from a user's ActivityPub wall.
 * Wall posts are federated using the AS2 `target` property (Friendica pattern).
 */

import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { treaty } from '@elysiajs/eden'
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { ref } from 'vue'

export interface WallPost {
  id: number
  content: string
  hashtags: string[]
  postType: string
  createdAt: string | null
  objectUri: string | null
  author: {
    id: number
    name: string
    webId: string
  }
}

export interface WallTargetUser {
  id: number
  name: string
  webId: string
}

export const useWallStore = defineStore('wall', () => {
  const authStore = useAuthStore()

  const client = treaty(getApiBaseUrl(), {
    onRequest() {
      return {
        headers: buildApiHeaders({ authToken: authStore.token || undefined })
      }
    }
  }) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // ─── State ──────────────────────────────────────────────────────────────────
  const wallPosts = ref<WallPost[]>([])
  const targetUser = ref<WallTargetUser | null>(null)
  const isLoading = ref(false)
  const isPosting = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(false)

  const PAGE_SIZE = 20

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function fetchWallPosts(targetWebId: string, reset = true) {
    isLoading.value = true
    error.value = null
    if (reset) {
      wallPosts.value = []
      targetUser.value = null
    }

    try {
      const offset = reset ? 0 : wallPosts.value.length
      const { data, status } = await client.wall[encodeURIComponent(targetWebId)].get({
        query: { limit: PAGE_SIZE, offset }
      })

      if (status === 404) {
        error.value = 'wall.errors.notFound'
        return
      }
      if (status !== 200 || !data) {
        error.value = 'wall.errors.loadFailed'
        return
      }

      const response = data as { targetUser: WallTargetUser; posts: WallPost[]; pagination: { limit: number; offset: number } }
      targetUser.value = response.targetUser
      if (reset) {
        wallPosts.value = response.posts
      } else {
        wallPosts.value.push(...response.posts)
      }
      hasMore.value = response.posts.length === PAGE_SIZE
    } catch {
      error.value = 'wall.errors.loadFailed'
    } finally {
      isLoading.value = false
    }
  }

  async function postOnWall(targetWebId: string, content: string): Promise<WallPost | null> {
    if (!content.trim()) return null
    isPosting.value = true
    error.value = null

    try {
      const { data, status } = await client.wall[encodeURIComponent(targetWebId)].post({ content })

      if (status === 400 || status === 404 || status === 502) {
        error.value = 'wall.errors.postFailed'
        return null
      }
      if (status !== 200 && status !== 201) {
        error.value = 'wall.errors.postFailed'
        return null
      }

      const newPost = data as WallPost & { targetUser: WallTargetUser }
      // Prepend to the list if we're showing the same wall
      if (targetUser.value && targetUser.value.webId === targetWebId) {
        wallPosts.value.unshift(newPost)
      }
      return newPost
    } catch {
      error.value = 'wall.errors.postFailed'
      return null
    } finally {
      isPosting.value = false
    }
  }

  async function deleteWallPost(postId: number): Promise<boolean> {
    error.value = null
    try {
      const { status } = await client.wall.posts[String(postId)].delete()
      if (status === 204 || status === 200) {
        wallPosts.value = wallPosts.value.filter(p => p.id !== postId)
        return true
      }
      if (status === 403) {
        error.value = 'wall.errors.deleteFailed'
      } else {
        error.value = 'wall.errors.deleteFailed'
      }
      return false
    } catch {
      error.value = 'wall.errors.deleteFailed'
      return false
    }
  }

  function clearError() {
    error.value = null
  }

  function reset() {
    wallPosts.value = []
    targetUser.value = null
    isLoading.value = false
    isPosting.value = false
    error.value = null
    hasMore.value = false
  }

  return {
    wallPosts,
    targetUser,
    isLoading,
    isPosting,
    error,
    hasMore,
    fetchWallPosts,
    postOnWall,
    deleteWallPost,
    clearError,
    reset,
  }
})
