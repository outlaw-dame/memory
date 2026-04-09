<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const notificationsStore = useNotificationsStore()
const router = useRouter()
const loadingMessage = ref('Finishing sign in...')

onMounted(async () => {
  try {
    const search = window.location.search
    const params = new URLSearchParams(search)

    if (params.has('code')) {
      await authStore.completeOidcSignin(search)
      return
    }

    if (params.has('register_app')) {
      loadingMessage.value = 'Activating pod notifications...'
      await notificationsStore.bootstrap()
      await notificationsStore.fetchNotifications()
      await router.replace({ name: 'notifications' })
      return
    }

    loadingMessage.value = 'Nothing to finalize. Returning to the app...'
    await router.replace({ name: 'home' })
  } catch {
    loadingMessage.value = 'Sign in failed. Returning to the sign-in page...'
  }
})
</script>

<template>
  <div class="grid h-full place-items-center">
    <p class="text-footnote text-dark/70">{{ loadingMessage }}</p>
  </div>
</template>