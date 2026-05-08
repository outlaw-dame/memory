<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { usePodModeration, type ModerationAction } from '@/composables/usePodModeration'

// ── Types ─────────────────────────────────────────────────────────────────────

type PodStatus       = 'active' | 'idle' | 'suspended' | 'error'
type FedStatus       = 'allowed' | 'silenced' | 'defederated' | 'pending'
type Protocol        = 'ap' | 'at' | 'both'
type SortKey         = 'name' | 'lastActivity' | 'totalActivities' | 'storage' | 'bandwidth'

interface SafetyHit {
  source: 'google-vision' | 'google-video' | 'safe-browsing' | 'cloudflare-csam' | 'pdq-hash'
  labels: string[]
  count: number
}

interface Pod {
  id: string
  rank: number
  status: PodStatus
  name: string
  handle: string
  webId: string
  atDid?: string
  lastActivity: string
  lastActivityTs: number          // ms epoch, for sorting
  totalActivities: number
  mrfFlags: number                // count of MRF-triggered decisions
  safetyHits: SafetyHit[]         // signals from media pipeline
  dnsEnabled: boolean             // FEP-612d: _apobjid TXT record present
  storage: number                 // bytes
  storageLabel: string
  bandwidth: number               // %
  protocol: Protocol
  fedStatus: FedStatus
  activeDecisionId?: string       // current moderation decision ULID (if any)
  rateLimitHits: number           // times rate-limit bucket was exhausted in last 24h
}

// ── Data ──────────────────────────────────────────────────────────────────────

const pods = ref<Pod[]>([
  { id: '1',  rank: 1,  status: 'active',    name: 'Pooooood',          handle: '@pooooood@pods.memory.social',      webId: 'https://pods.memory.social/pooooood',     atDid: 'did:plc:poo001', lastActivity: 'Now',    lastActivityTs: Date.now(),                 totalActivities: 463200, mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: true,  storage: 31_138_512_896,  storageLabel: '29GB',   bandwidth: 89, protocol: 'both', fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '2',  rank: 2,  status: 'active',    name: 'Spamtastic',        handle: '@spam@pods.memory.social',          webId: 'https://pods.memory.social/spam',         atDid: 'did:plc:spam02', lastActivity: '4s ago', lastActivityTs: Date.now() - 4000,          totalActivities: 4285000,mrfFlags: 12,safetyHits: [{ source: 'google-vision', labels: ['spam','nsfw'], count: 12 }],                        dnsEnabled: false, storage: 2_147_483_648,   storageLabel: '2GB',    bandwidth: 42, protocol: 'ap',   fedStatus: 'silenced',     rateLimitHits: 24 },
  { id: '3',  rank: 3,  status: 'active',    name: 'ToadPad',           handle: '@toadpad@pods.memory.social',       webId: 'https://pods.memory.social/toadpad',      atDid: 'did:plc:toad03', lastActivity: '7s ago', lastActivityTs: Date.now() - 7000,          totalActivities: 251000, mrfFlags: 1, safetyHits: [{ source: 'pdq-hash', labels: ['pdq-blocked-image'], count: 1 }],                         dnsEnabled: true,  storage: 9_663_676_416,   storageLabel: '9GB',    bandwidth: 14, protocol: 'both', fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '4',  rank: 4,  status: 'idle',      name: 'No…',               handle: '@no@pods.memory.social',            webId: 'https://pods.memory.social/no',           atDid: undefined,        lastActivity: '1m ago', lastActivityTs: Date.now() - 60_000,        totalActivities: 188000, mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: false, storage: 4_294_967_296,   storageLabel: '4GB',    bandwidth: 0,  protocol: 'ap',   fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '5',  rank: 5,  status: 'active',    name: 'PoddyPod3',         handle: '@poddypod3@pods.memory.social',     webId: 'https://pods.memory.social/poddypod3',    atDid: 'did:plc:pod005', lastActivity: '2m ago', lastActivityTs: Date.now() - 120_000,       totalActivities: 70600,  mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: true,  storage: 1_073_741_824,   storageLabel: '1GB',    bandwidth: 6,  protocol: 'both', fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '6',  rank: 6,  status: 'active',    name: 'PoddyPod2',         handle: '@poddypod2@pods.memory.social',     webId: 'https://pods.memory.social/poddypod2',    atDid: 'did:plc:pod006', lastActivity: '3m ago', lastActivityTs: Date.now() - 180_000,       totalActivities: 201000, mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: true,  storage: 536_870_912,     storageLabel: '512MB',  bandwidth: 3,  protocol: 'ap',   fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '7',  rank: 7,  status: 'active',    name: 'activityPod2000',   handle: '@ap2000@pods.memory.social',        webId: 'https://pods.memory.social/ap2000',       atDid: 'did:plc:ap2000', lastActivity: '5m ago', lastActivityTs: Date.now() - 300_000,       totalActivities: 63000,  mrfFlags: 3, safetyHits: [{ source: 'cloudflare-csam', labels: ['csam'], count: 1 }, { source: 'google-vision', labels: ['graphic-media'], count: 2 }], dnsEnabled: false, storage: 2_684_354_560, storageLabel: '2.5GB', bandwidth: 8, protocol: 'both', fedStatus: 'allowed', rateLimitHits: 2  },
  { id: '8',  rank: 8,  status: 'suspended', name: 'activityPod1000',   handle: '@ap1000@pods.memory.social',        webId: 'https://pods.memory.social/ap1000',       atDid: 'did:plc:ap1000', lastActivity: '3d ago', lastActivityTs: Date.now() - 259_200_000,   totalActivities: 12000,  mrfFlags: 8, safetyHits: [{ source: 'safe-browsing', labels: ['phishing','malware'], count: 5 }],                     dnsEnabled: false, storage: 1_610_612_736,   storageLabel: '1.5GB',  bandwidth: 0,  protocol: 'ap',   fedStatus: 'defederated',  rateLimitHits: 47, activeDecisionId: '01HX1A2B3C4D5E6F7G8H9I0J' },
  { id: '9',  rank: 9,  status: 'active',    name: 'Dkpod',             handle: '@dkpod@pods.memory.social',         webId: 'https://pods.memory.social/dkpod',        atDid: 'did:plc:dkpod9', lastActivity: '9m ago', lastActivityTs: Date.now() - 540_000,       totalActivities: 409800, mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: true,  storage: 3_758_096_384,   storageLabel: '3.5GB',  bandwidth: 22, protocol: 'both', fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '10', rank: 10, status: 'active',    name: 'Pod #Man',          handle: '@podmain@pods.memory.social',       webId: 'https://pods.memory.social/podmain',      atDid: 'did:plc:man010', lastActivity: '12m ago',lastActivityTs: Date.now() - 720_000,       totalActivities: 413000, mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: true,  storage: 5_368_709_120,   storageLabel: '5GB',    bandwidth: 31, protocol: 'both', fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '11', rank: 11, status: 'active',    name: 'PoddyPod2000',      handle: '@poddypod2000@pods.memory.social',  webId: 'https://pods.memory.social/poddypod2000', atDid: 'did:plc:p2000',  lastActivity: '15m ago',lastActivityTs: Date.now() - 900_000,       totalActivities: 82000,  mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: false, storage: 429_496_729,     storageLabel: '410MB',  bandwidth: 4,  protocol: 'ap',   fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '12', rank: 12, status: 'active',    name: 'MyPodP1',           handle: '@mypodp1@pods.memory.social',       webId: 'https://pods.memory.social/mypodp1',      atDid: undefined,        lastActivity: '18m ago',lastActivityTs: Date.now() - 1_080_000,     totalActivities: 7,      mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: false, storage: 10_485_760,      storageLabel: '10MB',   bandwidth: 0,  protocol: 'ap',   fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '13', rank: 13, status: 'idle',      name: 'MyPodP2',           handle: '@mypodp2@pods.memory.social',       webId: 'https://pods.memory.social/mypodp2',      atDid: undefined,        lastActivity: '22m ago',lastActivityTs: Date.now() - 1_320_000,     totalActivities: 4,      mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: false, storage: 8_388_608,       storageLabel: '8MB',    bandwidth: 0,  protocol: 'ap',   fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '14', rank: 14, status: 'active',    name: 'MyPodP3',           handle: '@mypodp3@pods.memory.social',       webId: 'https://pods.memory.social/mypodp3',      atDid: undefined,        lastActivity: '30m ago',lastActivityTs: Date.now() - 1_800_000,     totalActivities: 5,      mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: false, storage: 12_582_912,      storageLabel: '12MB',   bandwidth: 0,  protocol: 'ap',   fedStatus: 'allowed',      rateLimitHits: 0  },
  { id: '15', rank: 15, status: 'active',    name: '89kpod',            handle: '@89kpod@pods.memory.social',        webId: 'https://pods.memory.social/89kpod',       atDid: 'did:plc:k89015', lastActivity: '45m ago',lastActivityTs: Date.now() - 2_700_000,     totalActivities: 89000,  mrfFlags: 0, safetyHits: [],                                                                                          dnsEnabled: true,  storage: 1_879_048_192,   storageLabel: '1.75GB', bandwidth: 7,  protocol: 'both', fedStatus: 'allowed',      rateLimitHits: 0  },
])

// ── Sort + filter ─────────────────────────────────────────────────────────────

const search       = ref('')
const sortKey      = ref<SortKey>('lastActivity')
const sortAsc      = ref(false)
const statusFilter = ref<PodStatus | ''>('')
const fedFilter    = ref<FedStatus | ''>('')

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return String(n)
}

const sortedPods = computed(() => {
  let list = pods.value.filter(p => {
    const q = search.value.toLowerCase()
    if (q && !p.name.toLowerCase().includes(q) && !p.handle.toLowerCase().includes(q)) return false
    if (statusFilter.value && p.status !== statusFilter.value) return false
    if (fedFilter.value && p.fedStatus !== fedFilter.value) return false
    return true
  })

  list = [...list].sort((a, b) => {
    let va: number | string = 0
    let vb: number | string = 0
    switch (sortKey.value) {
      case 'name':            va = a.name.toLowerCase();   vb = b.name.toLowerCase();   break
      case 'lastActivity':    va = a.lastActivityTs;        vb = b.lastActivityTs;        break
      case 'totalActivities': va = a.totalActivities;       vb = b.totalActivities;       break
      case 'storage':         va = a.storage;               vb = b.storage;               break
      case 'bandwidth':       va = a.bandwidth;             vb = b.bandwidth;             break
    }
    if (va < vb) return sortAsc.value ? -1 : 1
    if (va > vb) return sortAsc.value ?  1 : -1
    return 0
  })
  return list
})

function setSort(key: SortKey) {
  if (sortKey.value === key) { sortAsc.value = !sortAsc.value } else { sortKey.value = key; sortAsc.value = false }
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return '↕'
  return sortAsc.value ? '↑' : '↓'
}

// ── Status helpers ────────────────────────────────────────────────────────────

function statusDot(s: PodStatus) {
  if (s === 'active')    return 'bg-green-400'
  if (s === 'idle')      return 'bg-gray-300'
  if (s === 'suspended') return 'bg-orange-400'
  return 'bg-red-500'
}

function fedBadge(f: FedStatus): { label: string; cls: string } {
  if (f === 'allowed')     return { label: 'Allowed',     cls: 'bg-green-50 text-green-600' }
  if (f === 'silenced')    return { label: 'Silenced',    cls: 'bg-orange-50 text-orange-600' }
  if (f === 'defederated') return { label: 'Defederated', cls: 'bg-red-50 text-red-600' }
  return                          { label: 'Pending',     cls: 'bg-gray-50 text-gray-500' }
}

function protocolBadge(p: Protocol): { label: string; cls: string } {
  if (p === 'both') return { label: 'AP+AT', cls: 'bg-purple-50 text-purple-600' }
  if (p === 'ap')   return { label: 'AP',    cls: 'bg-blue-50 text-blue-600' }
  return                   { label: 'AT',    cls: 'bg-sky-50 text-sky-600' }
}

function mrfFlagColor(n: number) {
  if (n === 0) return 'text-gray-300'
  if (n <= 2)  return 'text-orange-400'
  return 'text-red-500'
}

// ── Action panel (per-pod slide-in) ──────────────────────────────────────────

const { pending, error: moderationError, applyDecision, revokeDecision, listDecisions } = usePodModeration()

const actionPanel = reactive<{
  open: boolean
  pod: Pod | null
  action: ModerationAction
  reason: string
  labels: string[]
  labelInput: string
  decisions: import('@/composables/usePodModeration').ModerationDecision[]
}>({
  open: false,
  pod: null,
  action: 'filter',
  reason: '',
  labels: [],
  labelInput: '',
  decisions: [],
})

async function openActions(pod: Pod) {
  actionPanel.pod = pod
  actionPanel.action = pod.fedStatus === 'defederated' ? 'block' : 'filter'
  actionPanel.reason = ''
  actionPanel.labels = []
  actionPanel.labelInput = ''
  actionPanel.open = true
  // Fetch existing decisions for this pod
  actionPanel.decisions = await listDecisions({
    targetWebId: pod.webId,
    targetAtDid: pod.atDid,
    limit: 10,
    includeRevoked: true,
  })
}

function closePanel() { actionPanel.open = false; actionPanel.pod = null }

function addLabel() {
  const v = actionPanel.labelInput.trim().toLowerCase()
  if (v && !actionPanel.labels.includes(v)) actionPanel.labels.push(v)
  actionPanel.labelInput = ''
}

async function submitAction() {
  if (!actionPanel.pod) return
  const result = await applyDecision({
    targetWebId:  actionPanel.pod.webId,
    targetAtDid:  actionPanel.pod.atDid,
    targetHandle: actionPanel.pod.handle,
    action:       actionPanel.action,
    labels:       actionPanel.labels.length ? actionPanel.labels : undefined,
    reason:       actionPanel.reason || undefined,
  })
  if (result) {
    // Update local state
    const pod = pods.value.find(p => p.id === actionPanel.pod!.id)
    if (pod) {
      pod.activeDecisionId = result.id
      if (result.action === 'suspend') pod.status = 'suspended'
      if (result.action === 'block' || result.action === 'filter') pod.fedStatus = 'defederated'
      pod.mrfFlags += 1
    }
    actionPanel.decisions.unshift(result)
    actionPanel.reason = ''
    actionPanel.labels = []
  }
}

async function submitRevoke(decisionId: string) {
  const result = await revokeDecision(decisionId)
  if (result) {
    const idx = actionPanel.decisions.findIndex(d => d.id === decisionId)
    if (idx !== -1) actionPanel.decisions[idx] = result
  }
}

// Quick inline actions
async function quickAction(pod: Pod, action: ModerationAction) {
  const result = await applyDecision({
    targetWebId:  pod.webId,
    targetAtDid:  pod.atDid,
    targetHandle: pod.handle,
    action,
    reason: `Quick ${action} from Pod Management`,
  })
  if (result) {
    if (action === 'suspend') pod.status = 'suspended'
    if (action === 'block' || action === 'filter') pod.fedStatus = 'defederated'
    if (action === 'label' || action === 'warn') pod.mrfFlags += 1
    pod.activeDecisionId = result.id
  }
}

async function quickEnable(pod: Pod) {
  if (!pod.activeDecisionId) return
  const result = await revokeDecision(pod.activeDecisionId)
  if (result) {
    pod.status = 'active'
    pod.fedStatus = 'allowed'
    pod.activeDecisionId = undefined
  }
}

// ── Safety signal display ─────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  'google-vision':   'Vision',
  'google-video':    'Video',
  'safe-browsing':   'SafeBrowse',
  'cloudflare-csam': 'CSAM',
  'pdq-hash':        'PDQ',
}

function safetyLabel(source: string): string { return SOURCE_LABELS[source] ?? source }
function safetyColor(source: string): string {
  if (source === 'cloudflare-csam' || source === 'pdq-hash') return 'bg-red-100 text-red-600'
  if (source === 'safe-browsing') return 'bg-orange-100 text-orange-600'
  return 'bg-yellow-50 text-yellow-600'
}
</script>

<template>
  <div class="flex h-full">
    <!-- ── Main table area ──────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Header -->
      <header class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-3">
        <h1 class="text-[14px] font-semibold text-gray-800 flex-shrink-0">Pod Management</h1>

        <div class="flex items-center gap-2 flex-1 justify-end">
          <!-- Last Activity sort shortcut -->
          <button
            class="flex items-center gap-1 text-[11px] font-medium bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
            @click="setSort('lastActivity')"
          >
            Last Activity
            <svg class="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
          </button>

          <!-- Sort dropdown -->
          <select
            class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none"
            :value="sortKey"
            @change="setSort(($event.target as HTMLSelectElement).value as SortKey)"
          >
            <option value="name">Sort: Name</option>
            <option value="lastActivity">Sort: Last Activity</option>
            <option value="totalActivities">Sort: Total Activities</option>
            <option value="storage">Sort: Storage</option>
            <option value="bandwidth">Sort: Bandwidth</option>
          </select>

          <!-- Status filter -->
          <select v-model="statusFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
            <option value="">Status: All</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="suspended">Suspended</option>
            <option value="error">Error</option>
          </select>

          <!-- Fed filter -->
          <select v-model="fedFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
            <option value="">Federation: All</option>
            <option value="allowed">Allowed</option>
            <option value="silenced">Silenced</option>
            <option value="defederated">Defederated</option>
            <option value="pending">Pending</option>
          </select>

          <!-- Search -->
          <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 w-40">
            <svg class="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" placeholder="Search…" class="text-[11px] bg-transparent outline-none w-full placeholder-gray-300 text-gray-700"/>
          </div>
        </div>
      </header>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full text-[11px] border-collapse">
          <thead class="sticky top-0 z-10 bg-white border-b border-gray-100">
            <tr>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-400 w-8">#</th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-400">Pod</th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none" @click="setSort('lastActivity')">
                Last Active {{ sortIcon('lastActivity') }}
              </th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none" @click="setSort('totalActivities')">
                Activities {{ sortIcon('totalActivities') }}
              </th>
              <th class="text-center px-3 py-2.5 font-semibold text-gray-400">MRF</th>
              <th class="text-center px-3 py-2.5 font-semibold text-gray-400">Safety</th>
              <th class="text-center px-3 py-2.5 font-semibold text-gray-400">DNS</th>
              <th class="text-center px-3 py-2.5 font-semibold text-gray-400">Proto</th>
              <th class="text-center px-3 py-2.5 font-semibold text-gray-400 cursor-pointer hover:text-gray-600 select-none" @click="setSort('storage')">
                Storage {{ sortIcon('storage') }}
              </th>
              <th class="text-left px-3 py-2.5 font-semibold text-gray-400">Federation</th>
              <th class="text-right px-3 py-2.5 font-semibold text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pod in sortedPods"
              :key="pod.id"
              class="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-default"
              :class="pod.status === 'suspended' ? 'opacity-60' : ''"
            >
              <!-- # -->
              <td class="px-3 py-2.5 text-gray-300 font-medium">{{ pod.rank }}</td>

              <!-- Pod name + handle -->
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDot(pod.status)"></span>
                  <div class="min-w-0">
                    <div class="font-semibold text-gray-700 truncate max-w-[120px]">{{ pod.name }}</div>
                    <div class="text-[10px] text-gray-400 truncate max-w-[120px]">{{ pod.handle }}</div>
                  </div>
                  <!-- Rate-limit warning -->
                  <span
                    v-if="pod.rateLimitHits > 0"
                    class="flex-shrink-0 text-[9px] font-semibold bg-orange-50 text-orange-500 px-1 py-0.5 rounded"
                    title="Rate-limit bucket exhausted"
                  >RL×{{ pod.rateLimitHits }}</span>
                </div>
              </td>

              <!-- Last active -->
              <td class="px-3 py-2.5 text-gray-500">{{ pod.lastActivity }}</td>

              <!-- Total activities -->
              <td class="px-3 py-2.5 text-right font-medium text-gray-600">{{ fmt(pod.totalActivities) }}</td>

              <!-- MRF flags -->
              <td class="px-3 py-2.5 text-center font-semibold" :class="mrfFlagColor(pod.mrfFlags)">
                {{ pod.mrfFlags > 0 ? pod.mrfFlags : '—' }}
              </td>

              <!-- Safety signals -->
              <td class="px-3 py-2.5 text-center">
                <div v-if="pod.safetyHits.length" class="flex flex-wrap gap-0.5 justify-center">
                  <span
                    v-for="hit in pod.safetyHits"
                    :key="hit.source"
                    class="text-[9px] font-semibold px-1 py-0.5 rounded"
                    :class="safetyColor(hit.source)"
                    :title="hit.labels.join(', ')"
                  >{{ safetyLabel(hit.source) }}×{{ hit.count }}</span>
                </div>
                <span v-else class="text-gray-200">—</span>
              </td>

              <!-- DNS (FEP-612d) -->
              <td class="px-3 py-2.5 text-center">
                <span v-if="pod.dnsEnabled" class="text-green-500 font-semibold text-[10px]">✓</span>
                <span v-else class="text-gray-200">—</span>
              </td>

              <!-- Protocol -->
              <td class="px-3 py-2.5 text-center">
                <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" :class="protocolBadge(pod.protocol).cls">
                  {{ protocolBadge(pod.protocol).label }}
                </span>
              </td>

              <!-- Storage -->
              <td class="px-3 py-2.5 text-center">
                <span class="text-[rgb(99,100,246)] font-semibold">{{ pod.storageLabel }}</span>
              </td>

              <!-- Federation status -->
              <td class="px-3 py-2.5">
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="fedBadge(pod.fedStatus).cls">
                  {{ fedBadge(pod.fedStatus).label }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-3 py-2.5 text-right">
                <div class="flex items-center gap-1 justify-end">
                  <!-- If suspended/defederated → show Enable -->
                  <button
                    v-if="pod.status === 'suspended' || pod.fedStatus === 'defederated'"
                    class="text-[10px] font-semibold bg-green-50 text-green-600 hover:bg-green-100 px-2 py-1 rounded-lg transition-colors"
                    :disabled="pending"
                    @click="quickEnable(pod)"
                  >
                    Enable
                  </button>
                  <!-- Otherwise → show Disable -->
                  <button
                    v-else
                    class="text-[10px] font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 px-2 py-1 rounded-lg transition-colors"
                    :disabled="pending"
                    @click="quickAction(pod, 'filter')"
                  >
                    Disable
                  </button>
                  <!-- More actions -->
                  <button
                    class="text-[10px] font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                    @click="openActions(pod)"
                  >
                    •••
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-if="sortedPods.length === 0" class="text-center text-gray-400 py-12 text-[12px]">
          No pods match the current filter.
        </p>
      </div>
    </div>

    <!-- ── Action slide-in panel ────────────────────────────────────────────── -->
    <Transition name="slide">
      <aside
        v-if="actionPanel.open"
        class="w-[320px] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col h-full overflow-y-auto"
      >
        <!-- Panel header -->
        <div class="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div class="min-w-0">
            <p class="text-[12px] font-semibold text-gray-700 truncate">{{ actionPanel.pod?.name }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ actionPanel.pod?.handle }}</p>
          </div>
          <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="closePanel">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="flex-1 px-4 py-4 space-y-5">

          <!-- Identity chip row -->
          <div class="flex flex-wrap gap-1.5">
            <span v-if="actionPanel.pod?.webId" class="text-[9px] font-medium bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
              AP: {{ actionPanel.pod.webId.replace('https://', '') }}
            </span>
            <span v-if="actionPanel.pod?.atDid" class="text-[9px] font-medium bg-sky-50 text-sky-500 px-1.5 py-0.5 rounded">
              AT: {{ actionPanel.pod.atDid }}
            </span>
          </div>

          <!-- Safety signals -->
          <section v-if="actionPanel.pod?.safetyHits.length">
            <p class="text-[10px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Safety Signals</p>
            <div class="space-y-1.5">
              <div
                v-for="hit in actionPanel.pod.safetyHits"
                :key="hit.source"
                class="flex items-center justify-between rounded-xl px-3 py-2"
                :class="safetyColor(hit.source)"
              >
                <span class="text-[10px] font-semibold">{{ safetyLabel(hit.source) }}</span>
                <div class="flex gap-1 flex-wrap justify-end">
                  <span v-for="lbl in hit.labels" :key="lbl" class="text-[9px] bg-white/60 px-1 py-0.5 rounded">{{ lbl }}</span>
                </div>
                <span class="text-[10px] font-bold ml-2">×{{ hit.count }}</span>
              </div>
            </div>
          </section>

          <!-- Rate-limit status -->
          <section v-if="(actionPanel.pod?.rateLimitHits ?? 0) > 0">
            <p class="text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Rate Limiting</p>
            <div class="rounded-xl bg-orange-50 px-3 py-2 flex justify-between text-[11px]">
              <span class="text-orange-600">Bucket exhausted</span>
              <span class="font-bold text-orange-700">{{ actionPanel.pod?.rateLimitHits }}× in 24h</span>
            </div>
          </section>

          <!-- Apply action -->
          <section>
            <p class="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Apply Moderation Decision</p>
            <div class="space-y-3">
              <!-- Action picker -->
              <div class="grid grid-cols-5 gap-1">
                <button
                  v-for="a in (['label','warn','filter','block','suspend'] as ModerationAction[])"
                  :key="a"
                  class="text-[10px] font-semibold py-1.5 rounded-lg capitalize transition-colors"
                  :class="actionPanel.action === a
                    ? 'bg-[rgb(99,100,246)] text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'"
                  @click="actionPanel.action = a"
                >{{ a }}</button>
              </div>

              <!-- Reason -->
              <textarea
                v-model="actionPanel.reason"
                placeholder="Reason (optional)"
                rows="2"
                class="w-full text-[11px] rounded-xl border border-gray-200 px-3 py-2 outline-none resize-none focus:border-[rgb(99,100,246)] placeholder-gray-300"
              ></textarea>

              <!-- Extra labels -->
              <div>
                <p class="text-[10px] text-gray-400 mb-1">Additional AT labels</p>
                <div class="flex gap-1 flex-wrap mb-1.5">
                  <span
                    v-for="lbl in actionPanel.labels"
                    :key="lbl"
                    class="flex items-center gap-0.5 text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full"
                  >{{ lbl }}<button class="hover:text-red-700" @click="actionPanel.labels.splice(actionPanel.labels.indexOf(lbl),1)">×</button></span>
                </div>
                <div class="flex gap-1.5">
                  <input
                    v-model="actionPanel.labelInput"
                    type="text"
                    placeholder="Add label…"
                    class="flex-1 text-[11px] rounded-lg border border-gray-200 px-2 py-1 outline-none focus:border-[rgb(99,100,246)] placeholder-gray-300"
                    @keyup.enter="addLabel"
                  />
                  <button class="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors" @click="addLabel">Add</button>
                </div>
              </div>

              <!-- Submit -->
              <button
                class="w-full text-[12px] font-semibold bg-[rgb(99,100,246)] text-white py-2 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors disabled:opacity-50"
                :disabled="pending"
                @click="submitAction"
              >
                {{ pending ? 'Applying…' : `Apply ${actionPanel.action}` }}
              </button>

              <!-- Error -->
              <p v-if="moderationError" class="text-[10px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{{ moderationError }}</p>
            </div>
          </section>

          <!-- Decision history -->
          <section v-if="actionPanel.decisions.length">
            <p class="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Decision History</p>
            <div class="space-y-2">
              <div
                v-for="d in actionPanel.decisions"
                :key="d.id"
                class="rounded-xl border border-gray-100 px-3 py-2"
                :class="d.revoked ? 'opacity-50' : ''"
              >
                <div class="flex justify-between items-start gap-2">
                  <div>
                    <div class="flex gap-1 flex-wrap">
                      <span class="text-[10px] font-semibold capitalize text-gray-700">{{ d.action }}</span>
                      <span v-for="lbl in d.labels" :key="lbl" class="text-[9px] bg-red-50 text-red-500 px-1 py-0.5 rounded">{{ lbl }}</span>
                    </div>
                    <p v-if="d.reason" class="text-[10px] text-gray-400 mt-0.5">{{ d.reason }}</p>
                    <div class="flex gap-1 mt-1 flex-wrap">
                      <span class="text-[9px]" :class="d.atLabelEmitted ? 'text-green-500' : 'text-gray-300'">AT label {{ d.atLabelEmitted ? '✓' : '–' }}</span>
                      <span class="text-[9px]" :class="d.atStatusUpdated ? 'text-green-500' : 'text-gray-300'">AT status {{ d.atStatusUpdated ? '✓' : '–' }}</span>
                      <span class="text-[9px] font-medium uppercase" :class="d.revoked ? 'text-gray-400' : 'text-purple-500'">{{ d.protocols }}</span>
                    </div>
                  </div>
                  <button
                    v-if="!d.revoked"
                    class="flex-shrink-0 text-[9px] text-gray-400 hover:text-red-500 transition-colors"
                    :disabled="pending"
                    @click="submitRevoke(d.id)"
                  >revoke</button>
                  <span v-else class="flex-shrink-0 text-[9px] text-gray-300">revoked</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); opacity: 0; }
</style>
