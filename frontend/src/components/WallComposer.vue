<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useWallStore } from '@/stores/wallStore'

const props = defineProps<{
  targetWebId: string
  targetName: string
  isOwnWall?: boolean
}>()

const emit = defineEmits<{ posted: [] }>()

const { t } = useI18n()
const authStore = useAuthStore()
const wallStore = useWallStore()

const WALL_CHAR_LIMIT = 500

const content = ref('')
const isSubmitting = ref(false)
const localError = ref<string | null>(null)

const charCount = computed(() => content.value.length)
const isOverLimit = computed(() => charCount.value > WALL_CHAR_LIMIT)
const canPost = computed(
  () => content.value.trim().length > 0 && !isOverLimit.value && !isSubmitting.value
)

const placeholder = computed(() =>
  props.isOwnWall
    ? t('wall.placeholderOwn')
    : t('wall.placeholder', { name: props.targetName })
)

async function handleSubmit() {
  if (!canPost.value) return
  if (!authStore.token) {
    localError.value = t('common.errors.notAuthenticated')
    return
  }
  isSubmitting.value = true
  localError.value = null

  const result = await wallStore.postOnWall(props.targetWebId, content.value)

  isSubmitting.value = false
  if (result) {
    content.value = ''
    emit('posted')
  } else {
    localError.value = wallStore.error ? t(wallStore.error as any) : t('wall.errors.postFailed')
    wallStore.clearError()
  }
}
</script>

<template>
  <div class="flex gap-3 rounded-xl border border-separator bg-surface p-4">
    <!-- Avatar initial -->
    <div
      class="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-accent text-sm font-bold text-white"
      aria-hidden="true"
    >
      {{ (authStore.user?.name ?? 'Me').slice(0, 1).toUpperCase() }}
    </div>

    <!-- Input area -->
    <div class="flex flex-1 flex-col gap-2">
      <textarea
        v-model="content"
        class="w-full resize-y rounded-xl border bg-background px-3 py-2 text-sm leading-relaxed text-label placeholder:text-label-tertiary transition focus:outline-none focus:ring-2 disabled:opacity-60"
        :class="isOverLimit
          ? 'border-red-400 focus:ring-red-300/30'
          : 'border-separator focus:ring-accent/20'"
        :placeholder="placeholder"
        :disabled="isSubmitting"
        rows="3"
        :maxlength="WALL_CHAR_LIMIT + 50"
        @keydown.ctrl.enter="handleSubmit"
        @keydown.meta.enter="handleSubmit"
      />

      <div v-if="localError" class="text-xs text-red-500" role="alert">{{ localError }}</div>

      <div class="flex items-center justify-end gap-3">
        <span
          class="tabular-nums text-xs"
          :class="isOverLimit
            ? 'font-semibold text-red-500'
            : charCount > WALL_CHAR_LIMIT * 0.85
              ? 'text-amber-500'
              : 'text-label-tertiary'"
        >{{ charCount }} / {{ WALL_CHAR_LIMIT }}</span>

        <button
          type="button"
          class="rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canPost"
          @click="handleSubmit"
        >
          {{ isSubmitting ? t('wall.posting') : t('wall.postButton') }}
        </button>
      </div>
    </div>
  </div>
</template>
