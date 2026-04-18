<script setup lang="ts">
import SignupForm from '@/components/SignupForm.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()
</script>

<template>
  <div class="Signup grid h-full grid-rows-[fit-content(100%)_auto] items-stretch">
    <h2 class="text-largeHeader py-4 font-bold">{{ t('signup.title') }}</h2>
    <SignupForm />
  </div>
</template>
