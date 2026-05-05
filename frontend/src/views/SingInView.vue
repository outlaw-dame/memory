<script setup lang="ts">
import SignInForm from '@/components/SignInForm.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()
</script>

<template>
  <div class="SignIn grid h-full grid-rows-[fit-content(100%)_auto] items-stretch">
    <h2 class="text-largeHeader py-4 font-bold">{{ t('signin.title') }}</h2>
    <SignInForm />
  </div>
</template>
