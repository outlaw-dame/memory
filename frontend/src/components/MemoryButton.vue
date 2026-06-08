<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

withDefaults(defineProps<{
  success?: boolean
  loading?: boolean
  disabled?: boolean
}>(), {
  success: false,
  loading: false,
  disabled: false,
})
</script>

<template>
  <button
    type="button"
    class="relative inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
    :disabled="disabled || loading"
  >
    <span :class="{ 'opacity-0': loading }"><slot /></span>
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <AppIcon name="loader" :size="16" />
    </span>
  </button>
</template>
