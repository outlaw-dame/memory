<script setup lang="ts">
import { RouterView } from 'vue-router'
import ControlBar from '@/components/ControlBar.vue'
</script>

<template>
  <div class="memoryContainer grid h-lvh grid-rows-[fit-content(100%)_auto] items-stretch px-6">
    <header>
      <ControlBar />
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
