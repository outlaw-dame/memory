<script setup lang="ts">
import { validateEmail, validatePassword, validateUsername } from '@/controller/formValidation'
import { useAuthStore } from '@/stores/authStore'
import MemoryButton from '@/components/MemoryButton.vue'
import MemoryInput from '@/components/MemoryInput.vue'
import type { ProviderEndpoints } from '@/types/api'
import { ref } from 'vue'
import { ProviderSignUpErrors } from '@/types'
import { useI18n } from '@/i18n'

// Store
const authStore = useAuthStore()
const { t } = useI18n()

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
// Variables
const isRequesting = ref(false)

async function submitForm() {
  formLifeCheck.value = true
  validateForm()
  if (formIsValid.value) {
    isRequesting.value = true
    const authResponse = await authStore.signup(email.value, username.value, password.value, endpoint.value)
    // if the response is a string, it means that there was an error
    if (authResponse) {
      console.log(authResponse)
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
      console.error(authResponse)
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
      errorMessages.value.confirmPassword = t('validation.passwords.mismatch')
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
}
</script>

<template>
  <form @submit.prevent class="flex flex-col justify-between">
    <div class="gap-(--gap-small) flex flex-col">
      <MemoryInput
        v-model="username"
        :label="t('signup.fields.username')"
        :placeholder="t('signup.fields.username')"
        :error="errorMessages.username"
        @input="validateForm"
      />
      <MemoryInput
        v-model="email"
        :label="t('signup.fields.email')"
        type="email"
        :placeholder="t('signup.fields.email')"
        :error="errorMessages.email"
        @input="validateForm"
      />
      <div class="gap-(--gap-small) flex flex-col">
        <MemoryInput
          v-model="password"
          :label="t('signup.fields.password')"
          type="password"
          :placeholder="t('signup.fields.password')"
          :error="errorMessages.password"
          @input="validateForm"
        />
        <MemoryInput
          v-model="confirmPassword"
          type="password"
          :placeholder="t('signup.fields.confirmPassword')"
          :error="errorMessages.confirmPassword"
          @input="validateForm"
        />
      </div>
    </div>
    <MemoryButton
      :loading="isRequesting"
      @click="submitForm"
      class="mb-(--padding-large) w-full"
      :disabled="!formIsValid"
    >
      {{ t('common.actions.signUp') }}
    </MemoryButton>
  </form>
</template>
