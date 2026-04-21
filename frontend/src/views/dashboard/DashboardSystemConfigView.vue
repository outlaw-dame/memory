<script setup lang="ts">
import { ref } from 'vue'

// ── Media Policy config (mirrors MediaPolicyConfig from sidecar) ──────────────
const mediaPolicy = ref({
  sensitiveLabels: ['nsfw', 'sexual', 'nudity', 'graphic-violence', 'violence'],
  blockedLabels: ['csam', 'csem'],
  blockedPdqHashes: [] as string[],
  trustedSources: [] as string[],
  minSensitiveConfidence: 0.65,
  minBlockedConfidence: 0.98,
  minPdqQuality: 70,
  pdqHammingThreshold: 15,
  blockedAction: 'reject' as 'filter' | 'reject',
  applySensitiveFlag: true,
  setContentWarning: true,
  contentWarningText: 'Sensitive media',
  traceReasons: true,
})

// ── Rate-limit config ─────────────────────────────────────────────────────────
const rateLimit = ref({
  globalCapacity: 1000,
  globalRefillRate: 100,
  perInstanceCapacity: 200,
  perInstanceRefillRate: 20,
  enabled: true,
})

// ── Feature flags ─────────────────────────────────────────────────────────────
const featureFlags = ref([
  { id: 'ENABLE_FOLLOWERS_SYNC', label: 'FEP-8fcf Followers Sync',     description: 'Synchronize followers collections across federated instances (FEP-8fcf)', enabled: false },
  { id: 'HASHTAG_SEARCH',        label: 'FEP-eb48 Hashtag Search',      description: 'Enable hashtag-based search and /tags/:tag endpoint (FEP-eb48)',        enabled: true },
  { id: 'BLOCKED_COLLECTION',    label: 'FEP-c648 Blocked Collection',  description: 'Publish blocked-actors collection via ActivityPub (FEP-c648)',          enabled: true },
  { id: 'DNS_OBJID',             label: 'FEP-612d DNS Object IDs',      description: 'Support DNS-based ActivityPub object IDs via _apobjid TXT records',     enabled: true },
  { id: 'AT_BRIDGE',             label: 'ATProto Bridge',               description: 'Enable ActivityPub ↔ ATProto protocol bridge',                          enabled: true },
])

// ── New label input ───────────────────────────────────────────────────────────
const newSensitiveLabel = ref('')
const newBlockedLabel   = ref('')

function addSensitiveLabel() {
  const v = newSensitiveLabel.value.trim().toLowerCase()
  if (v && !mediaPolicy.value.sensitiveLabels.includes(v)) {
    mediaPolicy.value.sensitiveLabels.push(v)
  }
  newSensitiveLabel.value = ''
}

function addBlockedLabel() {
  const v = newBlockedLabel.value.trim().toLowerCase()
  if (v && !mediaPolicy.value.blockedLabels.includes(v)) {
    mediaPolicy.value.blockedLabels.push(v)
  }
  newBlockedLabel.value = ''
}

function removeLabel(arr: string[], label: string) {
  const i = arr.indexOf(label)
  if (i !== -1) arr.splice(i, 1)
}

function save() {
  // Future: POST to sidecar /admin/mrf/modules/media-policy
  alert('Config saved (UI only — not yet wired to sidecar API)')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h1 class="text-[15px] font-semibold text-gray-800">System Configuration</h1>
      <button
        class="text-[11px] font-semibold bg-[rgb(99,100,246)] text-white px-4 py-1.5 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors"
        @click="save"
      >
        Save Changes
      </button>
    </header>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

      <!-- Feature Flags -->
      <section>
        <h2 class="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Feature Flags</h2>
        <div class="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div
            v-for="(flag, i) in featureFlags"
            :key="flag.id"
            class="flex items-center justify-between px-4 py-3.5"
            :class="i < featureFlags.length - 1 ? 'border-b border-gray-50' : ''"
          >
            <div class="min-w-0">
              <p class="text-[12px] font-semibold text-gray-700">{{ flag.label }}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">{{ flag.description }}</p>
            </div>
            <button
              class="ml-4 w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
              :class="flag.enabled ? 'bg-[rgb(99,100,246)]' : 'bg-gray-200'"
              @click="flag.enabled = !flag.enabled"
            >
              <span
                class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                :class="flag.enabled ? 'left-[20px]' : 'left-0.5'"
              ></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Media Policy -->
      <section>
        <h2 class="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Media Policy (MRF)</h2>
        <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-4 space-y-4">

          <!-- Blocked action -->
          <div class="flex items-center gap-4">
            <label class="text-[12px] font-medium text-gray-600 w-48">On blocked content</label>
            <div class="flex gap-2">
              <button
                v-for="opt in ['filter', 'reject'] as const"
                :key="opt"
                class="text-[11px] font-medium px-3 py-1 rounded-lg transition-colors capitalize"
                :class="mediaPolicy.blockedAction === opt ? 'bg-[rgb(99,100,246)] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'"
                @click="mediaPolicy.blockedAction = opt"
              >{{ opt }}</button>
            </div>
          </div>

          <!-- Confidence thresholds -->
          <div class="grid grid-cols-2 gap-4">
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">Min sensitive confidence</span>
              <div class="flex items-center gap-2">
                <input v-model.number="mediaPolicy.minSensitiveConfidence" type="range" min="0" max="1" step="0.01" class="flex-1 accent-[rgb(99,100,246)]"/>
                <span class="text-[11px] font-semibold text-gray-600 w-10 text-right">{{ (mediaPolicy.minSensitiveConfidence * 100).toFixed(0) }}%</span>
              </div>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">Min blocked confidence</span>
              <div class="flex items-center gap-2">
                <input v-model.number="mediaPolicy.minBlockedConfidence" type="range" min="0" max="1" step="0.01" class="flex-1 accent-[rgb(99,100,246)]"/>
                <span class="text-[11px] font-semibold text-gray-600 w-10 text-right">{{ (mediaPolicy.minBlockedConfidence * 100).toFixed(0) }}%</span>
              </div>
            </label>
          </div>

          <!-- PDQ settings -->
          <div class="grid grid-cols-2 gap-4">
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">PDQ min quality (0–100)</span>
              <input v-model.number="mediaPolicy.minPdqQuality" type="number" min="0" max="100" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">PDQ Hamming threshold (0–256)</span>
              <input v-model.number="mediaPolicy.pdqHammingThreshold" type="number" min="0" max="256" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
            </label>
          </div>

          <!-- Toggles -->
          <div class="flex flex-wrap gap-4">
            <label class="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer select-none">
              <input v-model="mediaPolicy.applySensitiveFlag" type="checkbox" class="accent-[rgb(99,100,246)]"/>
              Apply sensitive flag
            </label>
            <label class="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer select-none">
              <input v-model="mediaPolicy.setContentWarning" type="checkbox" class="accent-[rgb(99,100,246)]"/>
              Set content warning
            </label>
            <label class="flex items-center gap-2 text-[11px] text-gray-600 cursor-pointer select-none">
              <input v-model="mediaPolicy.traceReasons" type="checkbox" class="accent-[rgb(99,100,246)]"/>
              Trace reasons
            </label>
          </div>

          <!-- Content warning text -->
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-medium text-gray-500">Content warning text</span>
            <input v-model="mediaPolicy.contentWarningText" type="text" maxlength="160" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)] w-72"/>
          </label>

          <!-- Sensitive labels -->
          <div>
            <p class="text-[11px] font-medium text-gray-500 mb-1.5">Sensitive labels</p>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="label in mediaPolicy.sensitiveLabels"
                :key="label"
                class="flex items-center gap-1 text-[10px] font-medium bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full"
              >
                {{ label }}
                <button class="hover:text-orange-800" @click="removeLabel(mediaPolicy.sensitiveLabels, label)">×</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input v-model="newSensitiveLabel" type="text" placeholder="Add label…" class="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] outline-none focus:border-[rgb(99,100,246)] w-40" @keyup.enter="addSensitiveLabel"/>
              <button class="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors" @click="addSensitiveLabel">Add</button>
            </div>
          </div>

          <!-- Blocked labels -->
          <div>
            <p class="text-[11px] font-medium text-gray-500 mb-1.5">Blocked labels</p>
            <div class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="label in mediaPolicy.blockedLabels"
                :key="label"
                class="flex items-center gap-1 text-[10px] font-medium bg-red-50 text-red-600 px-2 py-0.5 rounded-full"
              >
                {{ label }}
                <button class="hover:text-red-800" @click="removeLabel(mediaPolicy.blockedLabels, label)">×</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input v-model="newBlockedLabel" type="text" placeholder="Add label…" class="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] outline-none focus:border-[rgb(99,100,246)] w-40" @keyup.enter="addBlockedLabel"/>
              <button class="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors" @click="addBlockedLabel">Add</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Rate Limit -->
      <section>
        <h2 class="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Rate Limiting (MRF)</h2>
        <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-4 space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-[12px] font-medium text-gray-700">Rate limiting enabled</p>
            <button
              class="w-9 h-5 rounded-full transition-colors relative"
              :class="rateLimit.enabled ? 'bg-[rgb(99,100,246)]' : 'bg-gray-200'"
              @click="rateLimit.enabled = !rateLimit.enabled"
            >
              <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" :class="rateLimit.enabled ? 'left-[20px]' : 'left-0.5'"></span>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">Global capacity (activities)</span>
              <input v-model.number="rateLimit.globalCapacity" type="number" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">Global refill rate (/hr)</span>
              <input v-model.number="rateLimit.globalRefillRate" type="number" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">Per-instance capacity</span>
              <input v-model.number="rateLimit.perInstanceCapacity" type="number" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-medium text-gray-500">Per-instance refill rate (/hr)</span>
              <input v-model.number="rateLimit.perInstanceRefillRate" type="number" class="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
            </label>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
