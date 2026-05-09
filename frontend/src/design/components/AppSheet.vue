<script setup lang="ts">
import { kSheet } from 'konsta/vue'

defineProps<{
  opened: boolean
  dragHandle?: boolean
}>()

const emit = defineEmits<{
  'update:opened': [value: boolean]
  close: []
}>()

function close() {
  emit('update:opened', false)
  emit('close')
}
</script>

<template>
  <kSheet :opened="opened" @backdropclick="close">
    <div v-if="dragHandle !== false" class="flex justify-center pt-3 pb-1">
      <div class="w-9 h-1 rounded-full bg-black/20" />
    </div>
    <slot />
    <div class="pb-safe" />
  </kSheet>
</template>
