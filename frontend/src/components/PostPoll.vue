<script setup lang="ts">
import { ref } from 'vue'

export interface PollOption {
  text: string
  percent: number
}

export interface PollData {
  question: string
  options: PollOption[]
  totalVotes: string   // e.g. "57'284"
  timeLeft: string     // e.g. "14h left"
  voted?: boolean
}

const props = defineProps<{ poll: PollData }>()
const selectedIndex = ref<number | null>(props.poll.voted ? 0 : null)

function vote(i: number) {
  if (selectedIndex.value !== null) return  // already voted
  selectedIndex.value = i
}
</script>

<template>
  <div class="rounded-2xl bg-pastel-light border border-dark-10 overflow-hidden">
    <!-- Question -->
    <div class="px-4 pt-4 pb-3">
      <p class="text-subHeader font-bold text-dark leading-snug">{{ poll.question }}</p>
    </div>

    <!-- Options -->
    <div class="flex flex-col gap-2 px-3 pb-3">
      <button
        v-for="(opt, i) in poll.options"
        :key="i"
        type="button"
        class="relative rounded-xl overflow-hidden text-left h-11 flex items-center transition-opacity"
        :class="selectedIndex !== null ? 'cursor-default' : 'hover:opacity-90 active:scale-[0.98]'"
        @click="vote(i)"
      >
        <!-- Fill bar -->
        <div
          class="absolute inset-y-0 left-0 rounded-xl transition-all duration-500"
          :style="{
            width: selectedIndex !== null ? `${opt.percent}%` : '0%',
            background: i === selectedIndex ? 'rgba(99,100,246,0.35)' : 'rgba(99,100,246,0.18)',
          }"
        />
        <!-- Content -->
        <div class="relative flex items-center justify-between w-full px-4">
          <span class="text-subHeader font-semibold" style="color: rgb(99,100,246);">{{ opt.text }}</span>
          <span v-if="selectedIndex !== null" class="text-subHeader font-bold" style="color: rgb(99,100,246);">{{ opt.percent }}%</span>
        </div>
      </button>
    </div>

    <!-- Footer -->
    <div class="px-4 pb-3">
      <p class="text-caption text-dark-50">{{ poll.totalVotes }} poll votes · {{ poll.timeLeft }}</p>
    </div>
  </div>
</template>
