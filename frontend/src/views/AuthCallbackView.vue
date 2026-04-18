<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const { t } = useI18n()
const loadingMessage = ref(t('auth.callback.finishing'))

onMounted(async () => {
  try {
    const search = window.location.search
    const params = new URLSearchParams(search)

    if (params.has('code')) {
      await authStore.completeOidcSignin(search)
      return
    }

    if (params.has('register_app')) {
      loadingMessage.value = t('auth.callback.activatingNotifications')
      await notificationsStore.bootstrap()
      await notificationsStore.fetchNotifications()
      await router.replace({ name: 'notifications' })
      return
    }

    loadingMessage.value = t('auth.callback.nothingToFinalize')
    await router.replace({ name: 'home' })
  } catch {
    loadingMessage.value = t('auth.callback.failed')
  }
})
</script>

<template>
  <div class="grid h-full place-items-center">
    <p class="text-footnote text-dark/70">{{ loadingMessage }}</p>
  </div>
</template>
