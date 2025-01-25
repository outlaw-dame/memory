<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import type { ProviderEndpoints } from '@/types/api'
import { ref } from 'vue'

// Store
const authStore = useAuthStore()

// Form Data
const username = ref('test')
const email = ref('test@test.com')
const password = ref('testtest')
const confirmPassword = ref('testtest')
const endpoint = ref<ProviderEndpoints>('http://localhost:3000')
// Validation
const errorMessage = ref('')

async function submitForm() {
  if (validateForm()) {
    const authResponse = await authStore.signup(email.value, username.value, password.value, endpoint.value)
    // if the response is a string, it means that there was an error
    if (typeof authResponse === 'string') {
      errorMessage.value = authResponse
    }
  }
}

function validateForm(): boolean {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match'
    return false
  }
  return true
}
</script>

<template>
  <form @submit.prevent class="flex flex-col justify-between">
    <div class="gap-(--gap-small) flex flex-col">
      <vs-input class="w-full" v-model="username" label="Username" placeholder="Username" />
      <vs-input class="w-full" v-model="email" label="Email" type="email" placeholder="Email" />
      <div class="gap-(--gap-small) flex flex-col">
        <vs-input class="w-full" v-model="password" label="Password" type="password" placeholder="Password" />
        <vs-input class="w-full" v-model="confirmPassword" type="password" placeholder="Confirm Password" />
      </div>
    </div>
    <vs-button @click="submitForm" class="mb-(--padding-large) w-full">Sign up</vs-button>
  </form>
</template>
