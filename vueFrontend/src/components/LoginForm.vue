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
  <form @submit.prevent="login" class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <label for="username">Username</label>
      <input type="text" id="username" v-model="username" />
    </div>
    <div class="flex flex-col gap-2">
      <label for="password">Password</label>
      <input type="password" id="password" v-model="password" />
    </div>
    <div class="flex flex-col gap-2">
      <label for="endpoint">Endpoint</label>
      <select id="endpoint" v-model="endpoint">
        <option value="http://localhost:3000">Memory</option>
      </select>
    </div>
    <MemoryButton type="submit">Login</MemoryButton>
  </form>
</template>
