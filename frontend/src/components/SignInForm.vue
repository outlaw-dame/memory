<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import MemoryButton from '@/components/MemoryButton.vue'

const authStore = useAuthStore()
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-footnote text-dark/70">
      Sign in with your ActivityPods account. Memory will redirect you to the pod provider and use the returned pod access token for your local session.
    </p>
    <p v-if="authStore.authError" class="text-footnote text-danger">
      {{ authStore.authError }}
    </p>
    <MemoryButton class="p w-full" success @click="authStore.signinWithOidc()">
      Continue with ActivityPods
    </MemoryButton>
  </div>
</template>
