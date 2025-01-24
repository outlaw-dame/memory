<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import type { ProviderEndpoints } from '@/types/api'
import { ref } from 'vue'
import MemoryButton from './MemoryButton.vue'

const username = ref('')
const password = ref('')
const endpoint = ref<ProviderEndpoints>('http://localhost:3000')

const authStore = useAuthStore()

function login() {
  authStore.login(username.value, password.value, endpoint.value)
}
</script>

<template>
  <form @submit.prevent="login" class="flex h-full flex-col justify-between">
    <div>
      <vs-input class="w-full" v-model="username" label="Full Name" placeholder="Full Name" />
      <vs-input class="w-full" v-model="password" label="Password" type="password" placeholder="Password" />
    </div>
    <div>
      <vs-button class="w-full" type="submit">Login</vs-button>
    </div>
  </form>
</template>
