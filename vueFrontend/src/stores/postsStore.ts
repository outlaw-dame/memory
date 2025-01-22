import type { App, CreatePost, Post } from '@/types'
import { treaty } from '@elysiajs/eden'
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'
import { ref } from 'vue'

export const usePostsStore = defineStore('posts', () => {
  // Default state
  const posts = ref<Post[]>([])
  // Stores
  const authStore = useAuthStore()
  // API
  const client = treaty<App>(import.meta.env.VITE_API_URL, {
    onRequest() {
      return {
        headers: {
          auth: authStore.token || ''
        }
      }
    }
  })

  // Util Functions
  /**
   * Fetches posts from the API
   */
  async function fetchPosts() {
    const { data: postResponse, status } = await client.posts.get({
      query: { limit: 10, offset: 0 }
    })
    if (status === 401) {
      authStore.logout()
    } else if (status === 200) {
      const newPosts = postResponse as Post[]
      posts.value = newPosts
    }
  }

  /**
   * Create a new Post
   * @param content {string} - The content of the new post
   */
  async function createPost(content: string) {
    const requestBody: CreatePost = {
      content,
      isPublic: true
    }
    const postResponse = await client.posts.post(requestBody)
    if (postResponse.status === 200) {
      const newPost = postResponse.data as Post
      posts.value.push(newPost)
    }
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
