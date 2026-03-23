<script setup lang="ts">
import { validateEmail, validatePassword, validateUsername } from '@/controller/formValidation'
import { useAuthStore } from '@/stores/authStore'
import MemoryButton from '@/components/MemoryButton.vue'
import MemoryInput from '@/components/MemoryInput.vue'
import { ref } from 'vue'
import { ProviderSignUpErrors } from '@/types'

// Store
const authStore = useAuthStore()

// Form Data — no pre-filled test values in production
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
/**
 * Pod provider endpoint — defaults to the local ActivityPods instance.
 * Users connecting to an external pod provider can change this URL.
 * e.g. https://activitypods.org
 */
const endpoint = ref('http://localhost:3000')

// Validation
const formIsValid = ref(true)
const formLifeCheck = ref(false)
const errorMessages = ref<Record<string, string>>({})

// Variables
const isRequesting = ref(false)

async function submitForm() {
  formLifeCheck.value = true
  validateForm()
  if (formIsValid.value) {
    isRequesting.value = true
    const authResponse = await authStore.signup(
      email.value,
      username.value,
      password.value,
      endpoint.value as any,
    )
    // if the response is a string, it means that there was an error
    if (authResponse) {
      switch (authResponse) {
        case ProviderSignUpErrors['username.already.exists']:
        case ProviderSignUpErrors['username.invalid']:
          errorMessages.value.username = authResponse
          break
        case ProviderSignUpErrors['email.already.exists']:
        case ProviderSignUpErrors['email.invalid']:
          errorMessages.value.email = authResponse
          break
        default:
          errorMessages.value.default = authResponse
          break
      }
      console.error('[SignupForm] signup error:', authResponse)
    }
    isRequesting.value = false
  }
}

function validateForm(): void {
  if (formLifeCheck.value) {
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

    // endpoint check
    if (!endpoint.value.startsWith('http')) {
      errorMessages.value.endpoint = 'Must be a valid http:// or https:// URL'
      valid = false
    }

    formIsValid.value = valid
  }
}
</script>

<template>
  <form @submit.prevent="submitForm" class="flex flex-col justify-between gap-3">
    <div class="gap-(--gap-small) flex flex-col">
      <MemoryInput
        v-model="username"
        label="Username"
        placeholder="Username"
        :error="errorMessages.username"
        @input="validateForm"
      />
      <MemoryInput
        v-model="email"
        label="Email"
        type="email"
        placeholder="Email"
        :error="errorMessages.email"
        @input="validateForm"
      />
      <div class="gap-(--gap-small) flex flex-col">
        <MemoryInput
          v-model="password"
          label="Password"
          type="password"
          placeholder="Password"
          :error="errorMessages.password"
          @input="validateForm"
        />
        <MemoryInput
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          :error="errorMessages.confirmPassword"
          @input="validateForm"
        />
      </div>

      <!-- Pod provider URL — which ActivityPods server to register on -->
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

    <!-- General error message -->
    <p v-if="errorMessages.default" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ errorMessages.default }}
    </p>

    <MemoryButton
      :loading="isRequesting"
      @click="submitForm"
      class="mb-(--padding-large) w-full"
      :disabled="!formIsValid"
    >
      Sign up
    </MemoryButton>
  </form>
</template>
