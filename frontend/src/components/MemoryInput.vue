<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  type?: string
  error?: string
}>(), {
  modelValue: '',
  type: 'text',
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: [event: Event]
}>()

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('input', event)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="text-xs font-semibold text-label-secondary uppercase tracking-wide">
      {{ label }}
    </label>
    <input
      class="w-full rounded-xl border px-4 py-3 text-sm text-label placeholder:text-label-tertiary bg-surface focus:outline-none focus:ring-2 focus:ring-accent/20 transition"
      :class="error ? 'border-red-400 focus:ring-red-300/30' : 'border-separator'"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
  </div>
</template>
