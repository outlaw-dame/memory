<script setup lang="ts">
import { validateEmail, validatePassword, validateUsername } from '@/controller/formValidation'
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
const formIsValid = ref(true)
const formLifeCheck = ref(false)
const errorMessages = ref<Record<string, string>>({})

async function submitForm() {
  validateForm()
  formLifeCheck.value = true
  if (formIsValid.value) {
    const authResponse = await authStore.signup(email.value, username.value, password.value, endpoint.value)
    // if the response is a string, it means that there was an error
    if (typeof authResponse === 'string') {
      console.error(authResponse)
    }
  }
}

function validateForm(): void {
  errorMessages.value = {}
  let valid = true

  // password check
  if (password.value !== confirmPassword.value) {
    errorMessages.value.confirmPassword = 'Passwords do not match'
    valid = false
  } else {
    const pval = validatePassword(password.value)
    if (pval) {
      errorMessages.value.password = pval
      valid = false
    }
  }

  // email check
  const emailVal = validateEmail(email.value)
  if (emailVal) {
    errorMessages.value.email = emailVal
    valid = false
  }

  // username check
  const usernameVal = validateUsername(username.value)
  if (usernameVal) {
    errorMessages.value.username = usernameVal
    valid = false
  }
  formIsValid.value = valid
}
</script>

<template>
  <form @submit.prevent class="flex flex-col justify-between">
    <div class="gap-(--gap-small) flex flex-col">
      <vs-input class="w-full" v-model="username" label="Username" placeholder="Username">
        <template #message-danger v-if="errorMessages.username">{{ errorMessages.username }}</template>
      </vs-input>
      <vs-input class="w-full" v-model="email" label="Email" type="email" placeholder="Email">
        <template #message-danger v-if="errorMessages.email">{{ errorMessages.email }}</template>
      </vs-input>
      <div class="gap-(--gap-small) flex flex-col">
        <vs-input class="w-full" v-model="password" label="Password" type="password" placeholder="Password">
          <template #message-danger v-if="errorMessages.password">{{ errorMessages.password }}</template>
        </vs-input>
        <vs-input class="w-full" v-model="confirmPassword" type="password" placeholder="Confirm Password">
          <template #message-danger v-if="errorMessages.confirmPassword">{{ errorMessages.confirmPassword }}</template>
        </vs-input>
      </div>
    </div>
    <vs-button @click="submitForm" class="mb-(--padding-large) w-full" :disabled="!formIsValid">Sign up</vs-button>
  </form>
</template>
