<script setup lang="ts">
import { ref, computed } from 'vue'
import { DateTime } from 'luxon'
import type { FeedPoll } from '@/stores/atBridgeStore'

const props = defineProps<{
  poll: FeedPoll
  /** Canonical URI of the Question object (used to send votes). */
  pollUri?: string | null
  /** Called when the user casts a vote.  Receives the chosen option name(s). */
  onVote?: (optionNames: string[]) => Promise<void> | void
}>()

const selectedNames = ref<Set<string>>(
  new Set(props.poll.voted ? (props.poll.votedOptions ?? []) : [])
)
const isSubmitting = ref(false)
const hasVoted = ref(props.poll.voted ?? false)

const totalVotes = computed(() =>
  props.poll.options.reduce((sum, o) => sum + o.voteCount, 0)
)

const timeLeftLabel = computed(() => {
  if (!props.poll.endTime) return null
  const end = DateTime.fromISO(props.poll.endTime)
  if (!end.isValid) return null
  if (end < DateTime.now()) return 'Closed'
  return end.toRelative() ?? null
})

const isClosed = computed(() => {
  if (!props.poll.endTime) return false
  return DateTime.fromISO(props.poll.endTime) < DateTime.now()
})

const canVote = computed(() => !hasVoted.value && !isClosed.value)

function optionPercent(voteCount: number): number {
  return totalVotes.value > 0
    ? Math.round((voteCount / totalVotes.value) * 100)
    : 0
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
  <div class="rounded-2xl bg-pastel-light border border-dark-10 overflow-hidden">
    <!-- Options -->
    <div class="flex flex-col gap-2 px-3 pt-3 pb-2">
      <button
        v-for="option in poll.options"
        :key="option.name"
        type="button"
        class="relative rounded-xl overflow-hidden text-left h-11 flex items-center transition-opacity"
        :class="[
          !canVote ? 'cursor-default' : 'hover:opacity-90 active:scale-[0.98]',
          selectedNames.has(option.name) && canVote ? 'ring-2 ring-indigo-400' : '',
        ]"
        @click="toggleOption(option.name)"
      >
        <!-- Vote fill bar (shown after voting or when closed) -->
        <div
          class="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
          :style="{
            width: hasVoted || isClosed ? `${optionPercent(option.voteCount)}%` : '0%',
            background: selectedNames.has(option.name)
              ? 'rgba(99,100,246,0.35)'
              : 'rgba(99,100,246,0.18)',
          }"
        />
        <!-- Label -->
        <div class="relative flex items-center justify-between w-full px-4">
          <span class="text-subHeader font-semibold" style="color: rgb(99,100,246);">
            {{ option.name }}
          </span>
          <span
            v-if="hasVoted || isClosed"
            class="text-subHeader font-bold"
            style="color: rgb(99,100,246);"
          >
            {{ optionPercent(option.voteCount) }}%
          </span>
        </div>
      </button>
    </div>

    <!-- Vote button (only shown before voting on open polls) -->
    <div v-if="canVote && selectedNames.size > 0" class="px-3 pb-3">
      <button
        type="button"
        class="w-full rounded-xl bg-indigo-500 text-white text-subHeader font-semibold h-10 transition-opacity hover:opacity-90 disabled:opacity-50"
        :disabled="isSubmitting"
        @click="submitVote"
      >
        {{ isSubmitting ? 'Submitting…' : 'Vote' }}
      </button>
    </div>

    <!-- Footer: vote count + time left -->
    <div class="px-4 pb-3">
      <p class="text-caption text-dark-50">
        {{ totalVotes.toLocaleString() }} vote{{ totalVotes !== 1 ? 's' : '' }}
        <template v-if="poll.votersCount != null">
          · {{ poll.votersCount.toLocaleString() }} voter{{ poll.votersCount !== 1 ? 's' : '' }}
        </template>
        <template v-if="timeLeftLabel">
          · {{ timeLeftLabel }}
        </template>
      </p>
    </div>
  </div>
</template>
