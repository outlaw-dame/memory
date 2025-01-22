<script setup lang="ts">
import { usePostsStore } from '@/stores/postsStore'
import { ref } from 'vue'

const postsStore = usePostsStore()

const content = ref('Test')

function createPost() {
  postsStore.createPost(content.value)
  content.value = ''
}
</script>

<template>
  <form @submit.prevent="createPost">
    <div class="flex flex-col gap-2">
      <label for="content">Content</label>
      <textarea type="text" id="content" v-model="content" />
    </div>
    <button class="rounded-md border border-black bg-green-500 p-2 text-black" type="submit">Create Post</button>
  </form>
</template>
