<script setup lang="ts">
import { f7Actions, f7ActionsGroup, f7ActionsButton, f7ActionsLabel } from 'framework7-vue'

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
  <f7Actions :opened="opened" @backdropclick="close" no-shadow no-hairline>
    <f7ActionsGroup>
      <f7ActionsLabel v-if="title">{{ title }}</f7ActionsLabel>
      <f7ActionsButton
        v-for="item in items"
        :key="item.label"
        :bold="item.bold"
        :disabled="item.disabled"
        :class="item.destructive ? 'text-red-500' : ''"
        @click="runAction(item)"
      >
        {{ item.label }}
      </f7ActionsButton>
    </f7ActionsGroup>
    <f7ActionsGroup>
      <f7ActionsButton :bold="true" @click="close">{{ cancelLabel ?? 'Cancel' }}</f7ActionsButton>
    </f7ActionsGroup>
  </f7Actions>
</template>

<style scoped>
/* Actions customization to match existing app design */
:deep(.actions-modal) {
  --f7-actions-button-text-color: var(--color-label, rgba(55, 55, 55, 1));
  --f7-actions-button-bg-color: transparent;
  --f7-actions-button-active-bg-color: rgba(0, 0, 0, 0.05);
  --f7-actions-button-disabled-opacity: 0.4;
  --f7-actions-group-gap: 8px;
  --f7-actions-button-padding-vertical: 12px;
  --f7-actions-button-padding-horizontal: 24px;
  --f7-actions-button-font-size: 18px;
  --f7-actions-button-font-weight: 500;
  background: var(--color-surface, rgba(250, 247, 243, 1));
  border-radius: var(--radius-default) var(--radius-default) 0 0;
}

:deep(.actions-modal:after) {
  content: none;
}

:deep(.actions-group) {
  margin-bottom: 8px;
}

:deep(.actions-button) {
  border-radius: 16px;
  transition: background-color 0.2s ease;
}

:deep(.actions-button:active) {
  background-color: var(--f7-actions-button-active-bg-color);
}

:deep(.actions-button.destructive) {
  --f7-actions-button-text-color: #ef4444;
}

:deep(.actions-button.cancel) {
  margin-top: 8px;
}

:deep(.actions-label) {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 600;
  color: var(--color-label-secondary, rgba(55, 55, 55, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 24px;
}
</style>
