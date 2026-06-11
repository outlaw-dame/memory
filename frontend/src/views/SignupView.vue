<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppNavbar from '@/design/semantic/AppNavbar.vue'
import SignupForm from '@/components/SignupForm.vue'

const router = useRouter()

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
    <AppNavbar title-key="'app.title.signup'" :show-back="true" @back="goBack" />
    <div class="flex-1 overflow-y-auto px-(--padding-main) pt-4">
      <SignupForm />
    </div>
  </div>
</template>
