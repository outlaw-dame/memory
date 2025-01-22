<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="container mx-auto">
    <nav class="flex justify-between">
      <div class="flex gap-3">
        <RouterLink to="/">Home</RouterLink>
      </div>
      <div class="flex gap-3">
        <RouterLink :to="{ name: 'login' }">Login</RouterLink>
        <RouterLink :to="{ name: 'signup' }">Signup</RouterLink>
      </div>
    </nav>
  </header>
  <main class="container mx-auto">
    <RouterView />
  </main>
</template>
