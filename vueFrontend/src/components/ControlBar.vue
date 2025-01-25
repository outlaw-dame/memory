<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
  <div class="flex justify-between pt-4">
    <div class="w-[35px] self-end">
      <vs-button v-if="route.name === 'signin' || route.name === 'signup'" class="bg-dark-10" icon>
        <box-icon type="solid" name="left-arrow" @click="$router.push({ name: 'welcome' })"></box-icon>
      </vs-button>
    </div>
    <h1 class="text-pageTitle font-[Butler]">{{ title }}</h1>
    <div class="w-[35px] self-end"></div>
  </div>
</template>
