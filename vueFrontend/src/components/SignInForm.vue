<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import MemoryButton from '@/components/MemoryButton.vue'
import MemoryInput from './MemoryInput.vue'
import { ref } from 'vue'
import { ViablePodProvider } from '#api/types'

// Form
const username = ref('')
const password = ref('')
const endpoint = ref<ViablePodProvider>(ViablePodProvider['memory.'])
// Validation
const formIsValid = ref(true)
const formLifeCheck = ref(false)
const errorMessages = ref<Record<string, string>>({})

const authStore = useAuthStore()

function signin() {
  formLifeCheck.value = true
  validateForm()
  if (formIsValid.value) {
    authStore.signin(username.value, password.value, endpoint.value)
  }
}

function validateForm(): void {
  if (formLifeCheck.value) {
    errorMessages.value = {}
    let valid = true

    // username check
    if (username.value === '') {
      errorMessages.value.username = 'Username is required'
      valid = false
    }
    // password check
    if (password.value === '') {
      errorMessages.value.password = 'Password is required'
      valid = false
    }

    formIsValid.value = valid
  }
}
</script>

<template>
  <form @submit.prevent class="flex flex-col justify-between">
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
    </div>
    <div class="mb-4 flex flex-col gap-2">
      <MemoryButton class="p w-full" success @click="signin">Sign in</MemoryButton>
    </div>
  </form>
</template>
