<script setup lang="ts">
import { useRouter } from 'vue-router'
import { kNavbar, kNavbarBackLink } from 'konsta/vue'
import SignupForm from '@/components/SignupForm.vue'
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
    <kNavbar :title="t('app.title.signup')">
      <template #left>
        <kNavbarBackLink component="button" @click="goBack" />
      </template>
    </kNavbar>
    <div class="flex-1 overflow-y-auto px-(--padding-main) pt-4">
      <SignupForm />
    </div>
  </div>
</template>
