<script setup lang="ts">
import { ref, computed } from 'vue'

// Mirrors ModerationDecision from sidecar moderation/types.ts
interface ModerationDecision {
  id: string
  source: 'provider-dashboard' | 'mrf-auto' | 'at-firehose'
  targetHandle?: string
  targetAtDid?: string
  targetWebId?: string
  action: 'label' | 'warn' | 'filter' | 'block' | 'suspend'
  labels: string[]
  reason?: string
  appliedBy: string
  appliedAt: string
  protocols: 'at' | 'ap' | 'both' | 'none'
  atLabelEmitted: boolean
  atStatusUpdated: boolean
  mrfPatched: boolean
  revoked: boolean
  revokedAt?: string
}

const decisions = ref<ModerationDecision[]>([
  {
    id: '01HX1',
    source: 'provider-dashboard',
    targetHandle: '@spam_account@mastodon.social',
    targetAtDid: 'did:plc:abc123',
    action: 'suspend',
    labels: ['!hide'],
    reason: 'Repeated spam and unsolicited commercial messages.',
    appliedBy: 'did:web:pods.memory.social',
    appliedAt: '2026-04-20T10:14:00Z',
    protocols: 'both',
    atLabelEmitted: true,
    atStatusUpdated: true,
    mrfPatched: false,
    revoked: false,
  },
  {
    id: '01HX2',
    source: 'mrf-auto',
    targetHandle: '@csam_bot@unknown.example',
    action: 'block',
    labels: ['!hide', 'csam'],
    reason: 'PDQ hash match on CSAM database (confidence: 0.99)',
    appliedBy: 'mrf:media-policy',
    appliedAt: '2026-04-20T09:52:00Z',
    protocols: 'both',
    atLabelEmitted: true,
    atStatusUpdated: false,
    mrfPatched: true,
    revoked: false,
  },
  {
    id: '01HX3',
    source: 'at-firehose',
    targetAtDid: 'did:plc:xyz789',
    action: 'filter',
    labels: ['!hide'],
    reason: 'Incoming !hide label from subscribed external labeler.',
    appliedBy: 'at-labeler:did:plc:labeler001',
    appliedAt: '2026-04-20T08:30:00Z',
    protocols: 'at',
    atLabelEmitted: false,
    atStatusUpdated: false,
    mrfPatched: false,
    revoked: false,
  },
  {
    id: '01HX4',
    source: 'provider-dashboard',
    targetHandle: '@nudity_poster@fosstodon.org',
    targetWebId: 'https://fosstodon.org/users/nudity_poster',
    action: 'warn',
    labels: ['!warn', 'nudity'],
    reason: 'Repeated untagged nudity.',
    appliedBy: 'did:web:pods.memory.social',
    appliedAt: '2026-04-19T18:00:00Z',
    protocols: 'both',
    atLabelEmitted: true,
    atStatusUpdated: false,
    mrfPatched: false,
    revoked: true,
    revokedAt: '2026-04-19T20:00:00Z',
  },
])

const actionFilter = ref('')
const sourceFilter = ref('')

const filtered = computed(() => decisions.value.filter(d => {
  const matchAction  = !actionFilter.value  || d.action === actionFilter.value
  const matchSource  = !sourceFilter.value  || d.source === sourceFilter.value
  return matchAction && matchSource
}))

function actionBadge(a: ModerationDecision['action']) {
  const map: Record<string, string> = {
    label:   'bg-blue-50 text-blue-600',
    warn:    'bg-yellow-50 text-yellow-600',
    filter:  'bg-orange-50 text-orange-600',
    block:   'bg-red-50 text-red-600',
    suspend: 'bg-red-100 text-red-700',
  }
  return map[a] ?? 'bg-gray-50 text-gray-500'
}

function sourceBadge(s: ModerationDecision['source']) {
  const map: Record<string, string> = {
    'provider-dashboard': 'bg-purple-50 text-purple-600',
    'mrf-auto':           'bg-green-50 text-green-600',
    'at-firehose':        'bg-sky-50 text-sky-600',
  }
  return map[s] ?? 'bg-gray-50 text-gray-500'
}

function sourceLabel(s: ModerationDecision['source']) {
  return { 'provider-dashboard': 'Dashboard', 'mrf-auto': 'MRF Auto', 'at-firehose': 'AT Firehose' }[s] ?? s
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function revoke(d: ModerationDecision) {
  d.revoked = true
  d.revokedAt = new Date().toISOString()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h1 class="text-[15px] font-semibold text-gray-800">Audit &amp; Compliance</h1>
      <div class="flex items-center gap-2">
        <select v-model="sourceFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
          <option value="">All sources</option>
          <option value="provider-dashboard">Dashboard</option>
          <option value="mrf-auto">MRF Auto</option>
          <option value="at-firehose">AT Firehose</option>
        </select>
        <select v-model="actionFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
          <option value="">All actions</option>
          <option value="label">Label</option>
          <option value="warn">Warn</option>
          <option value="filter">Filter</option>
          <option value="block">Block</option>
          <option value="suspend">Suspend</option>
        </select>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-3">
      <div
        v-for="d in filtered"
        :key="d.id"
        class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm"
        :class="d.revoked ? 'opacity-60' : ''"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <!-- Target + badges -->
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span class="text-[12px] font-semibold text-gray-700">
                {{ d.targetHandle ?? d.targetAtDid ?? d.targetWebId ?? 'Unknown target' }}
              </span>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full capitalize" :class="actionBadge(d.action)">{{ d.action }}</span>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" :class="sourceBadge(d.source)">{{ sourceLabel(d.source) }}</span>
              <span v-if="d.revoked" class="text-[10px] font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">revoked</span>
            </div>

            <!-- Labels -->
            <div class="flex gap-1 flex-wrap mb-1.5">
              <span v-for="lbl in d.labels" :key="lbl" class="text-[10px] font-medium bg-red-50 text-red-500 px-1.5 py-0.5 rounded">{{ lbl }}</span>
            </div>

            <!-- Reason -->
            <p v-if="d.reason" class="text-[11px] text-gray-400">{{ d.reason }}</p>

            <!-- Propagation chips -->
            <div class="flex gap-2 mt-2 flex-wrap">
              <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-full" :class="d.atLabelEmitted ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'">
                AT label {{ d.atLabelEmitted ? '✓' : '–' }}
              </span>
              <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-full" :class="d.atStatusUpdated ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'">
                AT status {{ d.atStatusUpdated ? '✓' : '–' }}
              </span>
              <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-full" :class="d.mrfPatched ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'">
                MRF {{ d.mrfPatched ? '✓' : '–' }}
              </span>
              <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 uppercase">
                {{ d.protocols }}
              </span>
            </div>
          </div>

          <!-- Right side: meta + action -->
          <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span class="text-[10px] text-gray-400">{{ formatDate(d.appliedAt) }}</span>
            <span class="text-[10px] text-gray-400">by {{ d.appliedBy.split('/').pop() ?? d.appliedBy }}</span>
            <span v-if="d.revoked && d.revokedAt" class="text-[10px] text-gray-400">revoked {{ formatDate(d.revokedAt) }}</span>
            <button
              v-if="!d.revoked"
              class="mt-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors px-2 py-0.5 rounded-lg hover:bg-red-50"
              @click="revoke(d)"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>
      <p v-if="filtered.length === 0" class="text-center text-gray-400 text-[12px] py-8">
        No decisions match the current filter.
      </p>
    </div>
  </div>
</template>
