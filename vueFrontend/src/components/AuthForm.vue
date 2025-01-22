<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import type { ProviderEndpoints } from '@/types/api'
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const endpoint = ref<ProviderEndpoints>('http://localhost:3000')

const authStore = useAuthStore()

function login() {
  authStore.login(username.value, password.value, endpoint.value)
}
</script>

<template>
  <form @submit.prevent="login">
    <label for="username">Username</label>
    <input type="text" id="username" v-model="username" />
    <label for="password">Password</label>
    <input type="password" id="password" v-model="password" />
    <button type="submit">Login</button>
  </form>
</template>
