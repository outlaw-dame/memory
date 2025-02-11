<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MemoryButton from '@/components/MemoryButton.vue'

// External
const route = useRoute()
const router = useRouter()
// When the route changes, update the title
router.afterEach(getHeader)

// Variables
const title = ref('memory.')

// Functions
function getHeader() {
  if (route.name === 'signin' || route.name === 'signup') {
    title.value = 'memory.'
  }
}
</script>

<template>
  <div class="flex justify-between">
    <div class="w-[35px] self-end">
      <MemoryButton
        v-if="route.name === 'signin' || route.name === 'signup'"
        class="bg-dark-10"
        icon
        @click="$router.push({ name: 'welcome' })"
      >
        <vs-icon iconName="ArrowLeft2" type="bold" />
      </MemoryButton>
    </div>
    <h1 class="text-pageTitle font-[Butler]">{{ title }}</h1>
    <div class="w-[35px] self-end"></div>
  </div>
</template>
