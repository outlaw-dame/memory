import type { CreatePost, CreatePoll, MediaAttachmentInput, MediaUploadResponse, MediaUploadStatusResponse, PublicMediaAttachment } from '@/types'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { treaty } from '@elysiajs/eden'
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { ref } from 'vue'
import type { SelectPost } from '#api/types'

export const usePostsStore = defineStore('posts', () => {
  // Default state
  const posts = ref<SelectPost[]>([])
  const hashtagFilter = ref('')
  // Stores
  const authStore = useAuthStore()
  // API
  // Eden treaty requires the Elysia App type parameter for full inference;
  // without it the client cannot be statically typed on the frontend.
   
  const client = treaty(getApiBaseUrl(), {
    onRequest() {
      return {
        headers: buildApiHeaders({ authToken: authStore.token || undefined })
      }
    }
  }) as any // eslint-disable-line @typescript-eslint/no-explicit-any

  // Util Functions
  /**
   * Fetches posts from the API
   */
  async function fetchPosts() {
    const { data: postResponse, status } = (await client.posts.get({
      query: {
        limit: 10,
        offset: 0,
        ...(hashtagFilter.value ? { hashtag: hashtagFilter.value } : {})
      }
    })) as unknown as { data: SelectPost[]; status: number }
    if (status === 401) {
      await authStore.logout('private')
    } else if (status === 200) {
      const newPosts = postResponse as SelectPost[]
      posts.value = newPosts
    }
  }

  interface CreatePostInput {
    content: string
    hashtags?: string[]
    poll?: CreatePoll | null
    postType?: 'note' | 'article'
    name?: string | null
    summary?: string | null
    attachments?: MediaAttachmentInput[]
    idempotencyKey?: string
  }

  async function uploadMedia(file: File): Promise<MediaAttachmentInput | null> {
    const formData = new FormData()
    formData.set('file', file)

    let response: Response
    try {
      response = await fetch(`${getApiBaseUrl()}/media/uploads`, {
        method: 'POST',
        headers: buildApiHeaders({ authToken: authStore.token || undefined }),
        body: formData,
      })
    } catch {
      return null
    }

    if (response.status === 401) {
      await authStore.logout('private')
      return null
    }
    if (!response.ok) {
      return null
    }

    try {
      const payload = await response.json() as MediaUploadResponse
      return payload.attachment
    } catch {
      return null
    }
  }

  async function getMediaUpload(id: string): Promise<PublicMediaAttachment | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/media/uploads/${encodeURIComponent(id)}`, {
        headers: buildApiHeaders({ authToken: authStore.token || undefined }),
      })
      if (response.status === 401) {
        await authStore.logout('private')
        return null
      }
      if (!response.ok) return null
      const payload = await response.json() as MediaUploadStatusResponse
      return payload.media
    } catch {
      return null
    }
  }

  async function deleteMediaUpload(id: string): Promise<void> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/media/uploads/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: buildApiHeaders({ authToken: authStore.token || undefined }),
      })
      if (response.status === 401) await authStore.logout('private')
    } catch {
      // Best-effort local cleanup; expired unattached uploads are also cleaned server-side.
    }
  }

  /**
   * Create a new post using the API's unified request shape.
   * Polls remain note-only in the current UI, while articles can include
   * a title and summary for long-form publishing.
   */
  async function createPost({
    content,
    hashtags = [],
    poll = null,
    postType = 'note',
    name = null,
    summary = null,
    attachments = [],
    idempotencyKey = crypto.randomUUID(),
  }: CreatePostInput): Promise<SelectPost | null> {
    const durableAttachmentIds = attachments.map(attachment => attachment.id).filter((id): id is string => Boolean(id))
    const legacyAttachments = attachments
      .filter(attachment => !attachment.id)
      .map(({ previewUrl: _previewUrl, state: _state, id: _id, ...attachment }) => attachment)
    const requestBody: CreatePost = {
      content,
      ...(hashtags.length > 0 ? { hashtags } : {}),
      isPublic: true,
      postType,
      ...(name ? { name } : {}),
      ...(summary ? { summary } : {}),
      ...(durableAttachmentIds.length > 0 ? { attachmentIds: durableAttachmentIds } : {}),
      ...(legacyAttachments.length > 0 ? { attachments: legacyAttachments } : {}),
      idempotencyKey,
      ...(poll ? { poll } : {}),
    }
    const postResponse = await client.posts.post(requestBody)
    if (postResponse.status === 200) {
      const newPost = postResponse.data as SelectPost
      posts.value.push(newPost)
      return newPost
    }
    return null
  }

  async function setHashtagFilter(hashtag: string) {
    hashtagFilter.value = hashtag
    await fetchPosts()
  }

  async function clearHashtagFilter() {
    if (!hashtagFilter.value) return
    hashtagFilter.value = ''
    await fetchPosts()
  }

  console.log('posts: ', posts)
  console.log('posts: ', posts.value.length)
  // Init store
  if (posts.value.length === 0) {
    fetchPosts()
  }

  return {
    posts,
    hashtagFilter,
    fetchPosts,
    uploadMedia,
    getMediaUpload,
    deleteMediaUpload,
    createPost,
    setHashtagFilter,
    clearHashtagFilter
  }
})
