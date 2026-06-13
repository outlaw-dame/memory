<script setup lang="ts" generic="T extends string">
import { f7Segmented, f7Button } from 'framework7-vue'

export interface SegmentItem<V extends string> {
  value: V
  label: string
}

defineProps<{
  items: SegmentItem<T>[]
  modelValue: T
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <f7Segmented>
    <f7Button
      v-for="item in items"
      :key="item.value"
      :active="modelValue === item.value"
      :class="modelValue === item.value ? 'bg-dark text-white' : 'bg-dark-10 text-dark'"
      @click="emit('update:modelValue', item.value)"
      rounded
      small
      fill
    >
      {{ item.label }}
    </f7Button>
  </f7Segmented>
</template>

<style scoped>
/* Segmented control customization to match existing app design */
:deep(.segmented) {
  display: flex;
  border-radius: 16px;
  overflow: hidden;
  background: var(--color-fill, rgba(55, 55, 55, 0.1));
  border: 1px solid var(--color-separator, rgba(55, 55, 55, 0.2));
  height: 36px;
}

:deep(.segmented-rounded) {
  border-radius: 16px;
}

:deep(.segmented-small) {
  height: 36px;
}

:deep(.segmented .button) {
  flex: 1;
  height: 100%;
  margin: 0;
  border-radius: 0;
  transition: background-color 0.2s ease, color 0.2s ease;
}

:deep(.segmented .button:first-child) {
  border-radius: 16px 0 0 16px;
}

:deep(.segmented .button:last-child) {
  border-radius: 0 16px 16px 0;
}

:deep(.segmented .button.button-active) {
  background-color: var(--color-label, rgba(55, 55, 55, 1)) !important;
  color: white !important;
}

:deep(.segmented .button:not(.button-active)) {
  background-color: transparent !important;
  color: var(--color-label, rgba(55, 55, 55, 1)) !important;
}
</style>
