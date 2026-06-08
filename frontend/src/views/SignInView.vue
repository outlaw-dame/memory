<script setup lang="ts">
import { useRouter } from 'vue-router'
import { kNavbar, kNavbarBackLink } from 'konsta/vue'
import SignInForm from '@/components/SignInForm.vue'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace({ name: 'welcome' })
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <kNavbar :title="t('app.title.signin')">
      <template #left>
        <kNavbarBackLink component="button" @click="goBack" />
      </template>
    </kNavbar>
    <div class="flex-1 overflow-y-auto px-(--padding-main) pt-6">
      <h2 class="text-largeHeader font-bold mb-6">{{ t('signin.title') }}</h2>
      <SignInForm />
    </div>
  </div>
</template>
