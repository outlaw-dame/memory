<script setup lang="ts">
import { f7Page } from 'framework7-vue'

export interface AppPageProps {
  noNavbar?: boolean
  noToolbar?: boolean
  noSwipeback?: boolean
}

withDefaults(defineProps<AppPageProps>(), {
  noNavbar: true,
  noToolbar: true,
  noSwipeback: true,
})
</script>

<template>
  <f7Page
    :no-navbar="noNavbar"
    :no-toolbar="noToolbar"
    :no-swipeback="noSwipeback"
    class="flex flex-col overflow-hidden bg-background h-lvh"
  >
    <slot />
  </f7Page>
</template>

<style scoped>
/* Ensure Framework7 page fills container */
:deep(.page) {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Remove default Framework7 page padding and margins */
:deep(.page-content) {
  padding: 0;
  margin: 0;
}
</style>
