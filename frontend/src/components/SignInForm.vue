<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import MemoryButton from '@/components/MemoryButton.vue'
import { useI18n } from '@/i18n'

const authStore = useAuthStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-6">
    <p class="text-footnote text-dark/70">
      {{ t('signin.description') }}
    </p>
    <p v-if="authStore.authError" class="text-footnote text-danger">
      {{ authStore.authError }}
    </p>
    <MemoryButton class="p w-full" success @click="authStore.signinWithOidc()">
      {{ t('signin.continueWithActivityPods') }}
    </MemoryButton>
  </div>
</template>
