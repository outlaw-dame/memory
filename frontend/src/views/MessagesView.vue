<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import HashtagText from '@/components/HashtagText.vue'
import { useConversationsStore } from '@/stores/conversationsStore'
import { useI18n } from '@/i18n'
import { parseHashtagInput } from '@/utils/hashtags'

const conversationsStore = useConversationsStore()
const { t } = useI18n()

const selectedConversationId = ref<string | null>(null)
const composerText = ref('')
const composerEl = ref<HTMLTextAreaElement | null>(null)
const mentionSuggestions = ref<string[]>([])
const mentionStartIndex = ref<number | null>(null)
const mentionLookup = ref<Record<string, string>>({})
const replyToMessageId = ref<string | null>(null)
const autocompleteRequestId = ref(0)
const activeMentionIndex = ref(0)
const isSending = ref(false)

const currentConversation = computed(() => conversationsStore.currentConversation)
const sortedMessages = computed(() => currentConversation.value?.messages ?? [])

const selectedConversation = computed(() =>
  conversationsStore.conversations.find(conversation => conversation.id === selectedConversationId.value) ?? null,
)

onMounted(async () => {
  await conversationsStore.fetchConversations()
  if (!selectedConversationId.value && conversationsStore.conversations[0]) {
    await openConversation(conversationsStore.conversations[0].id)
  }
})

watch(
  () => conversationsStore.conversations,
  async conversations => {
    if (conversations.length === 0) {
      selectedConversationId.value = null
      return
    }

    if (!selectedConversationId.value || !conversations.some(conversation => conversation.id === selectedConversationId.value)) {
      await openConversation(conversations[0].id)
    }
  },
)

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

function formatMemberLabel(userDid: string): string {
  if (userDid.startsWith('http://') || userDid.startsWith('https://')) {
    try {
      const url = new URL(userDid)
      const lastPath = url.pathname
        .split('/')
        .map(part => part.trim())
        .filter(Boolean)
        .at(-1)
      if (lastPath && lastPath !== 'profile' && lastPath !== 'card') {
        return `${lastPath}@${url.hostname}`
      }
      return url.hostname
    } catch {
      return userDid
    }
  }

  if (userDid.startsWith('did:')) {
    const [, method, identifier] = userDid.split(':')
    if (method && identifier) return `${method}:${identifier.slice(0, 12)}`
  }

  return userDid
}

function formatTimestamp(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getMessageReplySnippet(messageId: string | null): string | null {
  if (!messageId || !currentConversation.value) return null
  const target = currentConversation.value.messages.find(message => message.id === messageId)
  if (!target) return null
  return target.deleted ? t('messages.deletedPreview') : target.text.slice(0, 120)
}

async function openConversation(conversationId: string): Promise<void> {
  if (selectedConversationId.value === conversationId && currentConversation.value?.conversation.id === conversationId) return
  selectedConversationId.value = conversationId
  composerText.value = ''
  replyToMessageId.value = null
  mentionSuggestions.value = []
  mentionStartIndex.value = null
  mentionLookup.value = {}
  activeMentionIndex.value = 0
  await conversationsStore.fetchConversation(conversationId)
}

function getMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const beforeCaret = text.slice(0, caret)
  const match = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/)
  if (!match) return null

  const query = match[1] ?? ''
  const start = beforeCaret.length - query.length - 1
  if (start < 0) return null
  return { start, query }
}

async function refreshMentionSuggestions(): Promise<void> {
  if (!selectedConversationId.value || !composerEl.value) {
    mentionSuggestions.value = []
    mentionStartIndex.value = null
    activeMentionIndex.value = 0
    return
  }

  const caret = composerEl.value.selectionStart ?? composerText.value.length
  const mentionQuery = getMentionQuery(composerText.value, caret)
  if (!mentionQuery) {
    mentionSuggestions.value = []
    mentionStartIndex.value = null
    activeMentionIndex.value = 0
    return
  }

  mentionStartIndex.value = mentionQuery.start
  const requestId = ++autocompleteRequestId.value
  const suggestions = await conversationsStore.memberAutocomplete(selectedConversationId.value, mentionQuery.query)
  if (requestId !== autocompleteRequestId.value) return
  mentionSuggestions.value = suggestions
  activeMentionIndex.value = 0
}

async function onComposerInput(): Promise<void> {
  await refreshMentionSuggestions()
}

async function insertMention(userDid: string): Promise<void> {
  if (!composerEl.value || mentionStartIndex.value === null) return

  const label = formatMemberLabel(userDid)
  mentionLookup.value = {
    ...mentionLookup.value,
    [label.toLowerCase()]: userDid,
  }

  const caret = composerEl.value.selectionStart ?? composerText.value.length
  composerText.value = `${composerText.value.slice(0, mentionStartIndex.value)}@${label} ${composerText.value.slice(caret)}`
  mentionSuggestions.value = []
  mentionStartIndex.value = null
  activeMentionIndex.value = 0

  await nextTick()
  const cursor = mentionStartIndex.value === null ? composerText.value.length : mentionStartIndex.value
  composerEl.value.focus()
  composerEl.value.setSelectionRange(cursor, cursor)
}

function extractMentionsFromComposer(): string[] {
  const members = currentConversation.value?.members ?? []
  const memberLabelMap = new Map<string, string>()
  for (const member of members) {
    memberLabelMap.set(formatMemberLabel(member.userDid).toLowerCase(), member.userDid)
    memberLabelMap.set(member.userDid.toLowerCase(), member.userDid)
  }

  const mentions = new Set<string>()
  for (const match of composerText.value.matchAll(/(^|\s)@([^\s@]+)/g)) {
    const rawToken = (match[2] ?? '').trim().toLowerCase()
    const resolved = mentionLookup.value[rawToken] ?? memberLabelMap.get(rawToken)
    if (resolved) mentions.add(resolved)
  }
  return [...mentions]
}

function setReplyTarget(messageId: string): void {
  replyToMessageId.value = messageId
  nextTick(() => composerEl.value?.focus())
}

function clearReplyTarget(): void {
  replyToMessageId.value = null
}

async function sendMessage(): Promise<void> {
  if (!selectedConversationId.value || isSending.value) return

  isSending.value = true
  try {
    await conversationsStore.sendMessage(selectedConversationId.value, {
      text: composerText.value.trim(),
      mentions: extractMentionsFromComposer(),
      hashtags: parseHashtagInput(composerText.value),
      inReplyToMessageId: replyToMessageId.value,
    })
    composerText.value = ''
    replyToMessageId.value = null
    mentionSuggestions.value = []
    mentionStartIndex.value = null
    mentionLookup.value = {}
    activeMentionIndex.value = 0
  } finally {
    isSending.value = false
  }
}

function onComposerKeydown(event: KeyboardEvent): void {
  if (mentionSuggestions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeMentionIndex.value = (activeMentionIndex.value + 1) % mentionSuggestions.value.length
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeMentionIndex.value = (activeMentionIndex.value - 1 + mentionSuggestions.value.length) % mentionSuggestions.value.length
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    mentionSuggestions.value = []
    mentionStartIndex.value = null
    activeMentionIndex.value = 0
    return
  }

  if (event.key === 'Enter' || event.key === 'Tab') {
    const selected = mentionSuggestions.value[activeMentionIndex.value]
    if (!selected) return
    event.preventDefault()
    void insertMention(selected)
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-6xl pb-8">
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

    <div v-if="conversationsStore.error" class="mb-4 rounded-[24px] bg-[#f7d8d8] px-4 py-3 text-sm font-medium text-[#8d2f2f]">
      {{ conversationsStore.error }}
    </div>

    <div v-if="conversationsStore.isLoading && conversationsStore.conversations.length === 0" class="flex flex-col gap-4 pb-24">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-[28px] bg-pastel-light" />
    </div>

    <div v-else-if="conversationsStore.conversations.length === 0" class="flex flex-col items-center justify-center gap-4 pb-24 pt-20 text-center">
      <svg viewBox="0 0 24 24" class="h-16 w-16 text-dark-20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <h3 class="text-[26px] font-semibold text-dark">{{ t('messages.emptyTitle') }}</h3>
      <p class="text-[17px] text-dark-50">{{ t('messages.emptyDescription') }}</p>
    </div>

    <div v-else class="grid gap-5 pb-24 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside class="flex flex-col gap-3">
        <button
          v-for="thread in conversationsStore.conversations"
          :key="thread.id"
          type="button"
          class="flex items-center gap-4 rounded-[28px] px-5 py-5 text-left transition"
          :class="thread.id === selectedConversationId ? 'bg-dark text-white shadow-[0_18px_44px_rgba(35,31,32,0.18)]' : 'bg-pastel-light text-dark'"
          @click="openConversation(thread.id)"
        >
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            :style="{ backgroundColor: getAvatarColor(thread.name) }"
          >
            {{ initials(thread.name) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="truncate text-lg font-semibold">{{ thread.name }}</h3>
            </div>
            <p class="truncate text-sm" :class="thread.id === selectedConversationId ? 'text-white/80' : 'text-dark-50'">
              {{ thread.preview || t('messages.emptyConversation') }}
            </p>
            <p v-if="thread.lastActivity" class="mt-1 text-xs" :class="thread.id === selectedConversationId ? 'text-white/65' : 'text-dark-40'">
              {{ formatTimestamp(thread.lastActivity) }}
            </p>
          </div>
        </button>
      </aside>

      <div v-if="currentConversation" class="flex min-h-[640px] flex-col rounded-[32px] bg-pastel-light/80 p-4 shadow-[0_22px_60px_rgba(35,31,32,0.08)]">
        <header class="border-b border-black/5 px-3 pb-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-[28px] font-semibold leading-tight text-dark">{{ currentConversation.conversation.name }}</h3>
              <p class="mt-1 text-sm text-dark-50">{{ t('messages.memberCount', { count: currentConversation.members.length }) }}</p>
            </div>
            <div class="flex flex-wrap justify-end gap-2">
              <span
                v-for="member in currentConversation.members"
                :key="member.userDid"
                class="rounded-full bg-white px-3 py-1 text-xs font-medium text-dark-60"
              >
                {{ formatMemberLabel(member.userDid) }}
              </span>
            </div>
          </div>
        </header>

        <div class="flex-1 space-y-3 overflow-y-auto px-2 py-4">
          <article
            v-for="message in sortedMessages"
            :key="message.id"
            class="rounded-[24px] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(35,31,32,0.05)]"
          >
            <div class="mb-2 flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-dark">{{ formatMemberLabel(message.senderDid) }}</p>
                <p class="text-xs text-dark-40">{{ formatTimestamp(message.sentAt) }}</p>
              </div>
              <button
                type="button"
                class="rounded-full bg-dark-10 px-3 py-1 text-xs font-semibold text-dark-60"
                @click="setReplyTarget(message.id)"
              >
                {{ t('messages.replyAction') }}
              </button>
            </div>

            <div v-if="message.inReplyToMessageId" class="mb-2 rounded-2xl bg-dark-10 px-3 py-2 text-xs text-dark-50">
              <span class="font-semibold text-dark-60">{{ t('messages.replyingTo') }}</span>
              {{ getMessageReplySnippet(message.inReplyToMessageId) ?? t('messages.deletedPreview') }}
            </div>

            <p v-if="message.deleted" class="italic text-dark-40">{{ t('messages.deletedPreview') }}</p>
            <HashtagText v-else :text="message.text" />

            <div v-if="message.attachments.length > 0" class="mt-3 flex flex-wrap gap-2">
              <a
                v-for="(attachment, index) in message.attachments"
                :key="`${message.id}-${index}`"
                :href="typeof attachment.url === 'string' ? attachment.url : '#'
                "
                class="rounded-full bg-dark-10 px-3 py-1 text-xs font-medium text-dark-60 hover:bg-dark-20"
                rel="noreferrer noopener"
                target="_blank"
              >
                {{ typeof attachment.name === 'string' ? attachment.name : t('messages.attachmentFallback', { index: index + 1 }) }}
              </a>
            </div>
          </article>

          <div v-if="sortedMessages.length === 0" class="flex h-full items-center justify-center text-center text-dark-50">
            {{ t('messages.emptyConversation') }}
          </div>
        </div>

        <div class="border-t border-black/5 px-2 pt-4">
          <div v-if="replyToMessageId" class="mb-3 flex items-center justify-between rounded-[22px] bg-white px-4 py-3 text-sm text-dark-60">
            <div>
              <p class="font-semibold text-dark">{{ t('messages.replyingTo') }}</p>
              <p>{{ getMessageReplySnippet(replyToMessageId) ?? t('messages.deletedPreview') }}</p>
            </div>
            <button type="button" class="rounded-full bg-dark-10 px-3 py-1 text-xs font-semibold text-dark-60" @click="clearReplyTarget">
              {{ t('messages.cancelReply') }}
            </button>
          </div>

          <div class="relative">
            <textarea
              ref="composerEl"
              v-model="composerText"
              class="min-h-[120px] w-full rounded-[28px] border border-black/5 bg-white px-4 py-4 text-base text-dark outline-none transition focus:border-dark/20"
              :placeholder="t('messages.composerPlaceholder')"
              @input="onComposerInput"
              @click="onComposerInput"
              @keyup="onComposerInput"
              @keydown="onComposerKeydown"
            />

            <div v-if="mentionSuggestions.length > 0" class="absolute bottom-[calc(100%+12px)] left-0 right-0 rounded-[24px] bg-white p-2 shadow-[0_24px_60px_rgba(35,31,32,0.16)]">
              <p class="px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-dark-40">{{ t('messages.mentionScopeHint') }}</p>
              <button
                v-for="suggestion in mentionSuggestions"
                :key="suggestion"
                type="button"
                class="flex w-full items-center justify-between rounded-[18px] px-3 py-2 text-left"
                :class="mentionSuggestions[activeMentionIndex] === suggestion ? 'bg-dark-10' : 'hover:bg-dark-10'"
                @click="insertMention(suggestion)"
              >
                <span class="font-semibold text-dark">@{{ formatMemberLabel(suggestion) }}</span>
                <span class="truncate pl-3 text-xs text-dark-40">{{ suggestion }}</span>
              </button>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <p class="text-xs text-dark-40">{{ t('messages.privateTagsHint') }}</p>
            <button
              type="button"
              class="rounded-full bg-dark px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-dark-20"
              :disabled="isSending || composerText.trim().length === 0"
              @click="sendMessage"
            >
              {{ isSending ? t('messages.sending') : t('messages.send') }}
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex min-h-[420px] items-center justify-center rounded-[32px] bg-pastel-light/70 p-8 text-center text-dark-50">
        {{ t('messages.selectConversation') }}
      </div>
    </div>
  </section>
</template>
