<script setup lang="ts" generic="T extends string">
import { kSegmented, kSegmentedButton } from 'konsta/vue'

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
  <kSegmented>
    <kSegmentedButton
      v-for="item in items"
      :key="item.value"
      :active="modelValue === item.value"
      @click="emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </kSegmentedButton>
  </kSegmented>
</template>
