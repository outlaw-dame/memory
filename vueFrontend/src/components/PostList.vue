<script setup lang="ts">
import { usePostsStore } from '@/stores/postsStore'

const postsStore = usePostsStore()
</script>

<template>
  <div class="Posts">
    <h2 class="text-2xl">Posts</h2>
    <div class="radius-md border-2 border-black" v-for="post in postsStore.posts" :key="post.id">
      <p>{{ post.content }}</p>
    </div>
  </div>
</template>
