<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import MemoryButton from '@/components/MemoryButton.vue'
import MemoryInput from './MemoryInput.vue'
import { ref } from 'vue'

// Form
const username = ref('')
const password = ref('')
/**
 * Pod provider endpoint — defaults to the local ActivityPods instance.
 * Users connecting to an external pod provider can change this to their
 * provider's URL (e.g. https://activitypods.org).
 */
const endpoint = ref('http://localhost:3000')

// State
const formIsValid = ref(true)
const formLifeCheck = ref(false)
const errorMessages = ref<Record<string, string>>({})
const isRequesting = ref(false)

const authStore = useAuthStore()

async function signin() {
  formLifeCheck.value = true
  validateForm()
  if (formIsValid.value) {
    isRequesting.value = true
    try {
      await authStore.signin(username.value, password.value, endpoint.value as any)
    } catch (err) {
      errorMessages.value.default = 'Sign in failed. Check your credentials and pod provider URL.'
      console.error('[SignInForm] signin error:', err)
    } finally {
      isRequesting.value = false
    }
  }
}

function validateForm(): void {
  if (formLifeCheck.value) {
    errorMessages.value = {}
    let valid = true
    if (username.value === '') {
      errorMessages.value.username = 'Username is required'
      valid = false
    }
    if (password.value === '') {
      errorMessages.value.password = 'Password is required'
      valid = false
    }
    if (!endpoint.value.startsWith('http')) {
      errorMessages.value.endpoint = 'Must be a valid http:// or https:// URL'
      valid = false
    }
    formIsValid.value = valid
  }
}
</script>

<template>
  <form @submit.prevent="signin" class="flex flex-col justify-between gap-4">
    <div class="flex flex-col gap-2">
      <MemoryInput
        v-model="username"
        :error="errorMessages.username"
        label="Email or Username"
        placeholder="Email or Username"
        @input="validateForm"
      />
      <MemoryInput
        v-model="password"
        :error="errorMessages.password"
        label="Password"
        type="password"
        placeholder="Password"
        @input="validateForm"
      />
      <!-- Pod provider URL -->
      <div class="flex flex-col gap-1">
        <MemoryInput
          v-model="endpoint"
          :error="errorMessages.endpoint"
          label="Pod Provider URL"
          placeholder="http://localhost:3000"
          @input="validateForm"
        />
        <p class="text-xs text-gray-400">
          Local dev: <code>http://localhost:3000</code>
          &nbsp;·&nbsp;
          Public: <code>https://activitypods.org</code>
        </p>
      </div>
    </div>

    <p v-if="errorMessages.default" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ errorMessages.default }}
    </p>

    <div class="mb-4 flex flex-col gap-2">
      <MemoryButton class="w-full" success :loading="isRequesting" @click="signin">
        Sign in
      </MemoryButton>
    </div>
  </form>
</template>
