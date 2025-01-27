<script setup lang="ts">
// Props
const props = withDefaults(defineProps<{ error?: string }>(), {
  error: ''
})
</script>

<template>
  <vs-input class="w-full">
    <template #message-danger v-if="props.error !== ''">{{ props.error }}</template>
  </vs-input>
</template>
