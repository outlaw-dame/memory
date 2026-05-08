<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from '@/i18n'
import type { FeedPoll } from '@/stores/atBridgeStore'

const props = defineProps<{
  poll: FeedPoll
  /** Canonical URI of the Question object (used to send votes). */
  pollUri?: string | null
  /** Called when the user casts a vote.  Receives the chosen option name(s). */
  onVote?: (optionNames: string[]) => Promise<void> | void
}>()

const selectedNames = ref<Set<string>>(new Set(props.poll.voted ? (props.poll.votedOptions ?? []) : []))
const isSubmitting = ref(false)
const hasVoted = ref(props.poll.voted ?? false)
const { t, formatNumber, formatRelativeTime } = useI18n()

const totalVotes = computed(() => props.poll.options.reduce((sum, o) => sum + o.voteCount, 0))

const pollEndDate = computed(() => {
  if (!props.poll.endTime) return null
  const date = new Date(props.poll.endTime)
  return Number.isNaN(date.getTime()) ? null : date
})

const timeLeftLabel = computed(() => {
  const end = pollEndDate.value
  if (!end) return null
  if (end.getTime() <= Date.now()) return t('poll.closed')
  return formatRelativeTime(end)
})

const isClosed = computed(() => {
  const end = pollEndDate.value
  return end ? end.getTime() <= Date.now() : false
})

const canVote = computed(() => !hasVoted.value && !isClosed.value)
const totalVotesLabel = computed(() =>
  t(totalVotes.value === 1 ? 'poll.votes.one' : 'poll.votes.many', {
    count: formatNumber(totalVotes.value)
  })
)
const votersLabel = computed(() => {
  const votersCount = props.poll.votersCount
  if (votersCount == null) return null
  return t(votersCount === 1 ? 'poll.voters.one' : 'poll.voters.many', {
    count: formatNumber(votersCount)
  })
})

function optionPercent(voteCount: number): number {
  return totalVotes.value > 0 ? Math.round((voteCount / totalVotes.value) * 100) : 0
}

function toggleOption(name: string) {
  if (!canVote.value) return
  if (props.poll.mode === 'oneOf') {
    selectedNames.value = new Set([name])
  } else {
    const next = new Set(selectedNames.value)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    selectedNames.value = next
  }
}

async function submitVote() {
  if (!canVote.value || selectedNames.value.size === 0 || isSubmitting.value) return
  isSubmitting.value = true
  try {
    await props.onVote?.([...selectedNames.value])
    hasVoted.value = true
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="bg-pastel-light border-dark-10 overflow-hidden rounded-2xl border">
    <!-- Options -->
    <div class="flex flex-col gap-2 px-3 pb-2 pt-3">
      <button
        v-for="option in poll.options"
        :key="option.name"
        type="button"
        class="relative flex h-11 items-center overflow-hidden rounded-xl text-left transition-opacity"
        :class="[
          !canVote ? 'cursor-default' : 'hover:opacity-90 active:scale-[0.98]',
          selectedNames.has(option.name) && canVote ? 'ring-2 ring-indigo-400' : ''
        ]"
        :aria-label="t('poll.selectOption', { option: option.name })"
        @click="toggleOption(option.name)"
      >
        <!-- Vote fill bar (shown after voting or when closed) -->
        <div
          class="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
          :style="{
            width: hasVoted || isClosed ? `${optionPercent(option.voteCount)}%` : '0%',
            background: selectedNames.has(option.name) ? 'rgba(99,100,246,0.35)' : 'rgba(99,100,246,0.18)'
          }"
        />
        <!-- Label -->
        <div class="relative flex w-full items-center justify-between px-4">
          <span class="text-subHeader font-semibold" style="color: rgb(99, 100, 246)">
            {{ option.name }}
          </span>
          <span v-if="hasVoted || isClosed" class="text-subHeader font-bold" style="color: rgb(99, 100, 246)">
            {{ optionPercent(option.voteCount) }}%
          </span>
        </div>
      </button>
    </div>

    <!-- Vote button (only shown before voting on open polls) -->
    <div v-if="canVote && selectedNames.size > 0" class="px-3 pb-3">
      <button
        type="button"
        class="text-subHeader h-10 w-full rounded-xl bg-indigo-500 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        :disabled="isSubmitting"
        @click="submitVote"
      >
        {{ isSubmitting ? t('poll.submitting') : t('poll.vote') }}
      </button>
    </div>

    <!-- Footer: vote count + time left -->
    <div class="px-4 pb-3">
      <p class="text-caption text-dark-50">
        {{ totalVotesLabel }}
        <template v-if="votersLabel"> · {{ votersLabel }} </template>
        <template v-if="timeLeftLabel"> · {{ timeLeftLabel }} </template>
      </p>
    </div>
  </div>
</template>
