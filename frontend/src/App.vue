<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import ControlBar from '@/components/ControlBar.vue'
import BottomNav from '@/components/BottomNav.vue'
import { useI18n } from '@/i18n'

const route = useRoute()
const { t } = useI18n()

const documentTitle = computed(() => {
  const titleKey = typeof route.meta.titleKey === 'string' ? route.meta.titleKey : 'app.name'
  return `${t(titleKey)} · ${t('app.name')}`
})

watchEffect(() => {
  document.title = documentTitle.value
})
</script>

<template>
  <div
    class="memoryContainer bg-pastel-dark grid h-lvh grid-rows-[fit-content(100%)_auto] items-stretch px-[var(--padding-main)]"
  >
    <header class="py-[var(--padding-main)]">
      <ControlBar />
    </header>
    <main class="overflow-y-auto pb-20">
      <RouterView />
    </main>
    <BottomNav />
  </div>
</template>
