<script setup lang="ts">
import { RouterView } from 'vue-router'
import TopBar from '@/components/TopBar.vue'
import BottomBar from '@/components/BottomBar.vue'
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
  </div>
</template>
