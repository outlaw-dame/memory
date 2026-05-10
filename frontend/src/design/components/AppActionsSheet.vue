<script setup lang="ts">
import { kActions, kActionsGroup, kActionsButton, kActionsLabel } from 'konsta/vue'

export interface ActionItem {
  label: string
  description?: string
  bold?: boolean
  destructive?: boolean
  disabled?: boolean
  action: () => void
}

defineProps<{
  opened: boolean
  title?: string
  items: ActionItem[]
  cancelLabel?: string
}>()

const emit = defineEmits<{
  'update:opened': [value: boolean]
  close: []
}>()

function close() {
  emit('update:opened', false)
  emit('close')
}

function runAction(item: ActionItem) {
  item.action()
  close()
}
</script>

<template>
  <kActions :opened="opened" @backdropclick="close">
    <kActionsGroup>
      <kActionsLabel v-if="title">{{ title }}</kActionsLabel>
      <kActionsButton
        v-for="item in items"
        :key="item.label"
        :bold="item.bold"
        :disabled="item.disabled"
        :class="item.destructive ? 'text-red-500' : ''"
        @click="runAction(item)"
      >
        {{ item.label }}
      </kActionsButton>
    </kActionsGroup>
    <kActionsGroup>
      <kActionsButton :bold="true" @click="close">{{ cancelLabel ?? 'Cancel' }}</kActionsButton>
    </kActionsGroup>
  </kActions>
</template>
