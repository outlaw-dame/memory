<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue'

interface MemoryButtonProps {
  type?: ButtonHTMLAttributes['type']
}

const props = withDefaults(defineProps<MemoryButtonProps>(), { type: 'button' })
</script>

<template>
  <button :type="props.type" class="rounded-md border border-black bg-green-500 p-2 text-black"><slot></slot></button>
</template>
