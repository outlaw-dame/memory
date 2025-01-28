import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SelectPost } from '#api/types'
import { ApiClient } from '@/controller/api'

export const usePostsStore = defineStore('posts', () => {
  // Default state
  const posts = ref<SelectPost[]>([])
  // API
  const client = new ApiClient()

  // Util Functions
  /**
   * Fetches posts from the API
   */
  async function fetchPosts() {
    const { data: postResponse, status } = await client.fetchPosts({ limit: 10, offset: 0 })
    if (status === 200) {
      posts.value = postResponse
    }
  }

  /**
   * Create a new Post
   * @param content {string} - The content of the new post
   */
  async function createPost(content: string) {
    const postResponse = await client.createPost({
      content,
      isPublic: true
    })
    if (postResponse.status === 200) posts.value.push(postResponse.data)
  }

  console.log('posts: ', posts)
  console.log('posts: ', posts.value.length)
  // Init store
  if (posts.value.length === 0) {
    fetchPosts()
  }

  return {
    posts,
    fetchPosts,
    createPost
  }
})
