<script setup lang="ts">
import { f7Sheet } from 'framework7-vue'

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
  <f7Sheet :opened="opened" @backdropclick="close" no-shadow no-hairline>
    <div v-if="dragHandle !== false" class="flex justify-center pt-3 pb-1">
      <div class="w-9 h-1 rounded-full bg-black/20" />
    </div>
    <slot />
    <div class="pb-safe" />
  </f7Sheet>
</template>

<style scoped>
/* Sheet customization to match existing app design */
:deep(.sheet-modal) {
  --f7-sheet-bg-color: var(--color-surface, rgba(250, 247, 243, 1));
  --f7-sheet-border-color: transparent;
  background: var(--color-surface, rgba(250, 247, 243, 1));
  border-radius: var(--radius-default) var(--radius-default) 0 0;
  max-height: 90vh;
}

:deep(.sheet-modal:after) {
  content: none;
}

:deep(.sheet-modal-inner) {
  padding: 0;
  overflow-y: auto;
}
</style>
