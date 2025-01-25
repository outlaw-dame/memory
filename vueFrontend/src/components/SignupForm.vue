<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import type { ProviderEndpoints } from '@/types/api'
import { ref } from 'vue'
import MemoryButton from './MemoryButton.vue'

// Store
const authStore = useAuthStore()

// Form Data
const username = ref('test')
const email = ref('test@test.com')
const password = ref('testtest')
const endpoint = ref<ProviderEndpoints>('http://localhost:3000')
// Validation
const errorMessage = ref('')

async function signup() {
  const authResponse = await authStore.signup(email.value, username.value, password.value, endpoint.value)
  // if the response is a string, it means that there was an error
  if (typeof authResponse === 'string') {
    errorMessage.value = authResponse
  }
}
</script>

<template>
  <div vif="errorMessage !== ''">
    <p class="text-red-500">{{ errorMessage }}</p>
  </div>
  <form @submit.prevent="signup" class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <label for="username">Username</label>
      <input type="text" id="username" v-model="username" />
    </div>
    <div class="flex flex-col gap-2">
      <label for="email">Email</label>
      <input type="email" id="email" v-model="email" />
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
