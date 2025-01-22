<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
</script>

<template>
  <header class="container mx-auto">
    <nav class="flex justify-between">
      <div class="flex gap-3">
        <RouterLink to="/">Home</RouterLink>
      </div>
      <div class="flex gap-3" v-if="!authStore.isLoggedIn">
        <RouterLink :to="{ name: 'login' }">Login</RouterLink>
        <RouterLink :to="{ name: 'signup' }">Signup</RouterLink>
      </div>
      <div v-else>
        <a href="#" @click.prevent="authStore.logout">Logout</a>
      </div>
    </nav>
  </header>
  <main class="container mx-auto">
    <RouterView />
  </main>
</template>
