<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useKeywordRules, type KeywordRule } from '@/composables/useKeywordRules'

// Federation peers/instances known to the sidecar
interface FederationPeer {
  id: string
  domain: string
  software: string
  status: 'allowed' | 'silenced' | 'defederated' | 'pending'
  inbound: number
  outbound: number
  lastActivity: string
  protocols: ('ap' | 'at')[]
}

const peers = ref<FederationPeer[]>([
  { id: '1', domain: 'mastodon.social',    software: 'Mastodon',    status: 'allowed',      inbound: 1420, outbound: 380,  lastActivity: '2m ago',  protocols: ['ap'] },
  { id: '2', domain: 'fosstodon.org',      software: 'Mastodon',    status: 'allowed',      inbound: 640,  outbound: 120,  lastActivity: '8m ago',  protocols: ['ap'] },
  { id: '3', domain: 'bsky.social',        software: 'Bluesky PDS', status: 'allowed',      inbound: 2100, outbound: 890,  lastActivity: '1m ago',  protocols: ['at'] },
  { id: '4', domain: 'hachyderm.io',       software: 'Mastodon',    status: 'silenced',     inbound: 0,    outbound: 0,    lastActivity: '3d ago',  protocols: ['ap'] },
  { id: '5', domain: 'akkoma.social',      software: 'Akkoma',      status: 'allowed',      inbound: 210,  outbound: 55,   lastActivity: '15m ago', protocols: ['ap'] },
  { id: '6', domain: 'gts.example.com',    software: 'GoToSocial',  status: 'allowed',      inbound: 88,   outbound: 22,   lastActivity: '1h ago',  protocols: ['ap'] },
  { id: '7', domain: 'spammer.example',    software: 'Unknown',     status: 'defederated',  inbound: 0,    outbound: 0,    lastActivity: '14d ago', protocols: ['ap'] },
  { id: '8', domain: 'unknown.example',    software: 'Unknown',     status: 'pending',      inbound: 3,    outbound: 0,    lastActivity: '1h ago',  protocols: ['ap'] },
])

// MRF module toggles (mirroring sidecar registry)
const mrfModules = ref([
  { id: 'media-policy',   label: 'Media Policy',    description: 'PDQ hash matching, sensitive label detection, content warnings', enabled: true  },
  { id: 'rate-limit',     label: 'Rate Limit',       description: 'Per-instance inbound activity rate limiting via token bucket',  enabled: true  },
  { id: 'keyword-reject', label: 'Keyword Reject',   description: 'Reject activities matching configured keyword patterns',        enabled: false },
  { id: 'trust-eval',     label: 'Trust Evaluation', description: 'Score-based trust evaluation for remote actors',               enabled: true  },
])

const keywordModuleEnabled = computed(() => mrfModules.value.find((m) => m.id === 'keyword-reject')?.enabled ?? false)

// ── Keyword Rules panel ───────────────────────────────────────────────────────

const { rules, enabled: kwEnabled, mode: kwMode, pending: kwPending, error: kwError, loadRules, addRule, updateRule, removeRule } = useKeywordRules()

const editingPattern = ref<string | null>(null)

const form = reactive<KeywordRule>({
  pattern: '',
  semantic: false,
  similarityThreshold: 0.75,
  wholeWord: false,
  caseSensitive: false,
})

function resetForm() {
  form.pattern = ''
  form.semantic = false
  form.similarityThreshold = 0.75
  form.wholeWord = false
  form.caseSensitive = false
  editingPattern.value = null
}

function startEdit(rule: KeywordRule) {
  editingPattern.value = rule.pattern
  form.pattern = rule.pattern
  form.semantic = rule.semantic
  form.similarityThreshold = rule.similarityThreshold
  form.wholeWord = rule.wholeWord
  form.caseSensitive = rule.caseSensitive
}

async function submitRule() {
  const trimmed = form.pattern.trim()
  if (!trimmed) return
  const rule: KeywordRule = {
    pattern: trimmed,
    semantic: form.semantic,
    similarityThreshold: form.similarityThreshold,
    wholeWord: form.wholeWord,
    caseSensitive: form.caseSensitive,
  }
  const ok = editingPattern.value !== null ? await updateRule(rule) : await addRule(rule)
  if (ok) resetForm()
}

async function deleteRule(pattern: string) {
  await removeRule(pattern)
}

// Load rules whenever the keyword-reject card is turned on
watch(keywordModuleEnabled, (on) => { if (on) loadRules() }, { immediate: true })

// ── Peers helpers ─────────────────────────────────────────────────────────────

function statusColor(s: FederationPeer['status']) {
  if (s === 'allowed')     return 'text-green-500 bg-green-50'
  if (s === 'silenced')    return 'text-orange-500 bg-orange-50'
  if (s === 'defederated') return 'text-red-500 bg-red-50'
  return 'text-gray-500 bg-gray-50'
}

function action(peer: FederationPeer) {
  // placeholder — would call sidecar admin API
  alert(`Action on ${peer.domain} (not yet wired to API)`)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h1 class="text-[15px] font-semibold text-gray-800">Federation Control</h1>
      <div class="flex items-center gap-2">
        <span class="flex items-center gap-1.5 text-[11px] font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Connected
        </span>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

      <!-- MRF Modules -->
      <section>
        <h2 class="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">MRF Modules</h2>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="mod in mrfModules"
            :key="mod.id"
            class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <p class="text-[12px] font-semibold text-gray-700">{{ mod.label }}</p>
              <p class="text-[10px] text-gray-400 mt-0.5">{{ mod.description }}</p>
            </div>
            <!-- Toggle -->
            <button
              class="mt-0.5 w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
              :class="mod.enabled ? 'bg-[rgb(99,100,246)]' : 'bg-gray-200'"
              @click="mod.enabled = !mod.enabled"
            >
              <span
                class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                :class="mod.enabled ? 'left-[20px]' : 'left-0.5'"
              ></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Keyword Rules panel — visible when keyword-reject module is enabled -->
      <section v-if="keywordModuleEnabled">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-[12px] font-semibold text-gray-500 uppercase tracking-wide">Keyword Rules</h2>
          <div class="flex items-center gap-2">
            <span
              class="text-[10px] font-medium px-2 py-0.5 rounded-full"
              :class="kwEnabled ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100'"
            >
              {{ kwEnabled ? 'Active' : 'Disabled' }}
            </span>
            <span
              v-if="kwMode"
              class="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize"
            >
              {{ kwMode }}
            </span>
            <span v-if="rules.length" class="text-[10px] text-gray-400">{{ rules.length }} rule{{ rules.length === 1 ? '' : 's' }}</span>
          </div>
        </div>

        <!-- Error banner -->
        <div v-if="kwError" class="mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-[11px] text-red-600 flex items-center gap-2">
          <span class="font-semibold">Error:</span>
          <span>{{ kwError }}</span>
        </div>

        <!-- Add / Edit form -->
        <div class="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-4 mb-3">
          <p class="text-[11px] font-semibold text-gray-600 mb-3">
            {{ editingPattern !== null ? 'Edit Rule' : 'Add Rule' }}
          </p>

          <div class="flex flex-col gap-3">
            <!-- Pattern input -->
            <div>
              <label class="block text-[10px] font-semibold text-gray-500 mb-1">Pattern</label>
              <input
                v-model="form.pattern"
                :disabled="editingPattern !== null"
                type="text"
                placeholder="e.g. buy now, financial fraud scheme"
                class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
              />
              <p v-if="editingPattern !== null" class="mt-0.5 text-[9px] text-gray-400">Pattern is the rule identifier and cannot be changed. Remove and re-add to rename.</p>
            </div>

            <!-- Semantic toggle -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[10px] font-semibold text-gray-600">Semantic matching</p>
                <p class="text-[9px] text-gray-400">Uses MiniLM-L6 embeddings to catch paraphrased variants</p>
              </div>
              <button
                class="w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
                :class="form.semantic ? 'bg-[rgb(99,100,246)]' : 'bg-gray-200'"
                type="button"
                @click="form.semantic = !form.semantic"
              >
                <span
                  class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  :class="form.semantic ? 'left-[20px]' : 'left-0.5'"
                ></span>
              </button>
            </div>

            <!-- Semantic threshold (only when semantic=true) -->
            <div v-if="form.semantic" class="flex items-center gap-3">
              <div class="flex-1">
                <label class="block text-[10px] font-semibold text-gray-500 mb-1">
                  Similarity threshold
                  <span class="text-indigo-500 font-semibold ml-1">{{ form.similarityThreshold.toFixed(2) }}</span>
                </label>
                <input
                  v-model.number="form.similarityThreshold"
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.01"
                  class="w-full accent-indigo-500"
                />
                <div class="flex justify-between text-[9px] text-gray-400 mt-0.5">
                  <span>0.50 (broad)</span>
                  <span>1.00 (exact)</span>
                </div>
              </div>
            </div>

            <!-- Literal options (only when semantic=false) -->
            <div v-else class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <input v-model="form.wholeWord" type="checkbox" class="accent-indigo-500" />
                <span class="text-[10px] text-gray-600">Whole word</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <input v-model="form.caseSensitive" type="checkbox" class="accent-indigo-500" />
                <span class="text-[10px] text-gray-600">Case sensitive</span>
              </label>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 pt-1">
              <button
                :disabled="!form.pattern.trim() || kwPending"
                class="rounded-lg bg-[rgb(99,100,246)] text-white text-[11px] font-semibold px-4 py-1.5 hover:bg-indigo-600 transition-colors disabled:opacity-40"
                type="button"
                @click="submitRule"
              >
                {{ kwPending ? 'Saving…' : editingPattern !== null ? 'Update Rule' : 'Add Rule' }}
              </button>
              <button
                v-if="editingPattern !== null"
                class="rounded-lg text-[11px] font-semibold px-4 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                type="button"
                @click="resetForm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Rules list -->
        <div v-if="kwPending && !rules.length" class="rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-5 text-center text-[11px] text-gray-400">
          Loading…
        </div>

        <div v-else-if="!rules.length" class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-center text-[11px] text-gray-400">
          No keyword rules configured. Add one above.
        </div>

        <div v-else class="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-2.5 font-semibold text-gray-400">Pattern</th>
                <th class="text-left px-4 py-2.5 font-semibold text-gray-400">Type</th>
                <th class="text-left px-4 py-2.5 font-semibold text-gray-400">Options</th>
                <th class="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rule in rules"
                :key="rule.pattern"
                class="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                :class="{ 'bg-indigo-50/40': editingPattern === rule.pattern }"
              >
                <td class="px-4 py-3 font-mono text-[11px] text-gray-700 max-w-[200px] truncate" :title="rule.pattern">
                  {{ rule.pattern }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    :class="rule.semantic ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'"
                  >
                    {{ rule.semantic ? 'Semantic' : 'Literal' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-1 flex-wrap">
                    <span v-if="rule.semantic" class="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      ≥{{ rule.similarityThreshold.toFixed(2) }}
                    </span>
                    <span v-if="!rule.semantic && rule.wholeWord" class="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      whole-word
                    </span>
                    <span v-if="!rule.semantic && rule.caseSensitive" class="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      case
                    </span>
                    <span v-if="!rule.semantic && !rule.wholeWord && !rule.caseSensitive" class="text-[9px] text-gray-400">
                      —
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="text-[10px] text-indigo-400 hover:text-indigo-600 transition-colors font-medium"
                      :disabled="kwPending"
                      @click="startEdit(rule)"
                    >
                      Edit
                    </button>
                    <button
                      class="text-[10px] text-red-400 hover:text-red-600 transition-colors font-medium"
                      :disabled="kwPending"
                      @click="deleteRule(rule.pattern)"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Peers table -->
      <section>
        <h2 class="text-[12px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Remote Instances</h2>
        <div class="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-2.5 font-semibold text-gray-400">Domain</th>
                <th class="text-left px-4 py-2.5 font-semibold text-gray-400">Software</th>
                <th class="text-left px-4 py-2.5 font-semibold text-gray-400">Status</th>
                <th class="text-right px-4 py-2.5 font-semibold text-gray-400">In</th>
                <th class="text-right px-4 py-2.5 font-semibold text-gray-400">Out</th>
                <th class="text-right px-4 py-2.5 font-semibold text-gray-400">Last Activity</th>
                <th class="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="peer in peers"
                :key="peer.id"
                class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td class="px-4 py-3">
                  <div class="font-semibold text-gray-700">{{ peer.domain }}</div>
                  <div class="flex gap-1 mt-0.5">
                    <span v-for="p in peer.protocols" :key="p" class="text-[9px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {{ p === 'ap' ? 'ActivityPub' : 'ATProto' }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-500">{{ peer.software }}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium capitalize" :class="statusColor(peer.status)">
                    {{ peer.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right text-gray-600 font-medium">{{ peer.inbound.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-gray-600 font-medium">{{ peer.outbound.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-gray-400">{{ peer.lastActivity }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="text-[10px] text-gray-400 hover:text-gray-600 transition-colors" @click="action(peer)">
                    •••
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
