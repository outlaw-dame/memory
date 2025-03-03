<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import TopBar from '@/components/TopBar.vue'
import BottomBar from '@/components/BottomBar.vue'

const route = useRoute()
</script>

<template>
  <div
    class="memoryContainer bg-pastel-dark grid h-lvh grid-rows-[fit-content(100%)_auto] items-stretch px-[var(--padding-main)]"
  >
    <header class="py-[var(--padding-main)]">
      <TopBar />
    </header>
    <main>
      <RouterView />
    </main>
    <footer v-if="route.name !== 'login' && route.name !== 'signup' && route.name !== 'welcome'">
      <BottomBar />
    </footer>
  </div>
</template>
