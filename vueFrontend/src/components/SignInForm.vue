<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import type { ProviderEndpoints } from '@/types/api'
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const endpoint = ref<ProviderEndpoints>('http://localhost:3000')

const authStore = useAuthStore()

function signin() {
  authStore.signin(username.value, password.value, endpoint.value)
}
</script>

<template>
  <form @submit.prevent class="flex flex-col justify-between">
    <div class="flex flex-col gap-4">
      <vs-input class="w-full" v-model="username" label="Email or Username" placeholder="Email or Username" />
      <vs-input class="w-full" v-model="password" label="Password" type="password" placeholder="Password" />
    </div>
    <div class="mb-4 flex flex-col gap-4">
      <vs-button class="p w-full" success @click="signin">Sign in</vs-button>
    </div>
  </form>
</template>
