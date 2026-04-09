<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAtBridgeStore } from '@/stores/atBridgeStore'

const store = useAtBridgeStore()

const apWeight = ref(store.protocolWeights.activitypods)
const atWeight = ref(store.protocolWeights.atproto)

watch(
  () => store.protocolWeights,
  value => {
    apWeight.value = value.activitypods
    atWeight.value = value.atproto
  },
  { deep: true },
)

const ratioSummary = computed(() => {
  const total = apWeight.value + atWeight.value
  const apPct = Math.round((apWeight.value / total) * 100)
  const atPct = 100 - apPct
  return `${apPct}% ActivityPub / ${atPct}% ATProto`
})

async function applyWeights() {
  await store.setProtocolWeights(apWeight.value, atWeight.value)
}

async function resetDefaults() {
  apWeight.value = 50
  atWeight.value = 50
  await store.setProtocolWeights(50, 50)
}
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <div>
      <h2 class="text-xl font-semibold">Feed Controls</h2>
      <p class="text-caption mt-1">Tune source mix used by the Balanced timeline mode.</p>
    </div>

    <div class="rounded-default bg-pastel-light p-[var(--padding-main)] flex flex-col gap-3">
      <label class="text-sm font-medium" for="ap-weight">ActivityPub weight</label>
      <input id="ap-weight" v-model.number="apWeight" type="range" min="1" max="99" />
      <input
        v-model.number="apWeight"
        type="number"
        min="1"
        max="99"
        class="rounded border border-gray-300 px-2 py-1 w-24"
      />

      <label class="text-sm font-medium" for="at-weight">ATProto weight</label>
      <input id="at-weight" v-model.number="atWeight" type="range" min="1" max="99" />
      <input
        v-model.number="atWeight"
        type="number"
        min="1"
        max="99"
        class="rounded border border-gray-300 px-2 py-1 w-24"
      />

      <p class="text-sm font-semibold">Current mix: {{ ratioSummary }}</p>

      <div class="flex gap-2">
        <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" @click="applyWeights">
          Apply
        </button>
        <button class="rounded bg-pastel-dark px-3 py-2 text-sm font-medium" @click="resetDefaults">
          Reset
        </button>
      </div>
    </div>

    <RouterLink to="/settings" class="text-sm underline">Back to Settings</RouterLink>
  </div>
</template>
