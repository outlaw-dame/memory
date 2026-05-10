<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  /** Accessible label; defaults to "Verified". */
  label?: string
  size?: number
}>()
</script>

<template>
  <span
    class="inline-flex items-center justify-center rounded-full shrink-0"
    :style="{
      width: `${(size ?? 16) + 4}px`,
      height: `${(size ?? 16) + 4}px`,
      background: 'var(--color-accent)',
    }"
    :aria-label="label ?? 'Verified'"
    role="img"
  >
    <AppIcon name="verified-mark" :size="size ?? 16" color="#fff" />
  </span>
</template>
