<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// External
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
// When the route changes, update the title
router.afterEach(getHeader)

// Variables
const title = ref('memory.')

// Functions
function getHeader() {
  if (route.name === 'signin' || route.name === 'signup') {
    title.value = 'memory.'
  }
}
</script>

<template>
  <div class="flex justify-between pt-4">
    <div></div>
    <h1 class="text-pageTitle font-[Butler]">{{ title }}</h1>
    <div></div>
  </div>
</template>
