<script setup lang="ts">
import { onMounted } from 'vue'
import { useConversationsStore } from '@/stores/conversationsStore'
import { useI18n } from '@/i18n'

const conversationsStore = useConversationsStore()
const { t } = useI18n()

onMounted(async () => {
  await conversationsStore.fetchConversations()
})

function initials(name: string): string {
  return name
    .split(' ')
    .map(part => part.trim().charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarColor(name: string): string {
  const colors = [
    '#6f563d', '#9cb8bd', '#7c8793', '#6f5f41', '#96a2b0',
    '#a67c52', '#7a9399', '#6b7c85', '#8b6f47', '#7a8fa3',
  ]
  const hash = name.split('').reduce((h, c) => h + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
</script>

<template>
  <section class="mx-auto w-full max-w-[560px] pb-8">
    <header class="mb-5 flex items-center justify-between px-1">
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full bg-dark-10 text-dark"
        :aria-label="t('messages.notificationsAria')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>

      <h2 class="font-[Butler] text-[48px] leading-none text-dark">{{ t('messages.header') }}</h2>

      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full bg-dark-10 text-dark"
        :aria-label="t('messages.composeAria')"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>
        </svg>
      </button>
    </header>

    <!-- Loading state -->
    <div v-if="conversationsStore.isLoading" class="flex flex-col gap-4 pb-24">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-[28px] bg-pastel-light" />
    </div>

    <!-- Empty state -->
    <div v-else-if="conversationsStore.conversations.length === 0" class="flex flex-col items-center justify-center gap-4 pb-24 pt-20 text-center">
      <svg viewBox="0 0 24 24" class="h-16 w-16 text-dark-20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h3 class="text-[26px] font-semibold text-dark">{{ t('messages.emptyTitle') }}</h3>
      <p class="text-[17px] text-dark-50">{{ t('messages.emptyDescription') }}</p>
    </div>

    <!-- Conversations list -->
    <div v-else class="flex flex-col gap-4 pb-24">
      <article
        v-for="thread in conversationsStore.conversations"
        :key="thread.id"
        class="flex items-center gap-4 rounded-[28px] bg-pastel-light px-5 py-5"
      >
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          :style="{ backgroundColor: getAvatarColor(thread.name) }"
        >
          {{ initials(thread.name) }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h3 class="truncate text-[32px] leading-[1.05] font-semibold text-dark">{{ thread.name }}</h3>
          </div>
          <p class="truncate text-[26px] leading-tight text-dark-50">
            {{ thread.preview }}
            <span v-if="thread.lastActivity !== ''" class="font-semibold"> • {{ thread.lastActivity }}</span>
          </p>
        </div>

        <div v-if="thread.unreadCount > 0" class="ml-2 shrink-0">
          <span class="inline-flex min-w-11 items-center justify-center rounded-2xl bg-[#f3d9d9] px-3 py-2 text-[22px] font-semibold text-[#f26464]">
            {{ thread.unreadCount }}
          </span>
        </div>
      </article>
    </div>
  </section>
</template>
