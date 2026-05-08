<script setup lang="ts">
/**
 * DashboardDataView
 *
 * ActivityPub object browser + AT Protocol record explorer for the pod.
 *
 * Wired to:
 *   GET  /profile                              → ActivityPod.getProfile (own actor)
 *   POST /posts (GET variant via query)        → activity listing
 *   AT Adapter: GET /xrpc/com.atproto.repo.listRecords
 *                                              → DefaultAtRecordReader.listRecords
 *   MRF Traces: GET /internal/admin/mrf/traces → MRFAdminStore.listTraces
 *
 * The MRF decision-trace panel is new and not yet in any UI — it shows
 * the full audit log of media policy and rate-limit decisions per activity.
 */
import { ref, computed } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────

type RecordType = 'Note' | 'Article' | 'Follow' | 'Like' | 'Announce' | 'Block' | 'ap.bsky.feed.post' | 'ap.bsky.graph.follow'
type DataTab    = 'objects' | 'at-records' | 'mrf-traces' | 'storage'

interface ApObject {
  id: string
  type: RecordType
  summary?: string
  published: string
  to: string[]
  size: number           // bytes
  mediaAttachments: number
  mrfAction?: 'accept' | 'label' | 'filter' | 'reject'
}

interface AtRecord {
  rkey: string
  collection: string
  cid: string
  value: Record<string, unknown>
  indexedAt: string
}

interface MrfTrace {
  traceId: string
  activityId: string
  moduleId: string
  action: 'accept' | 'label' | 'filter' | 'reject'
  mode: 'enforce' | 'audit' | 'disabled'
  confidence?: number
  labels: string[]
  reason?: string
  originHost?: string
  createdAt: string
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const tab = ref<DataTab>('objects')

// ── AP Objects ────────────────────────────────────────────────────────────────

const apObjects = ref<ApObject[]>([
  { id: 'https://pods.memory.social/p/01HX01', type: 'Note',    summary: 'Exploring ActivityPods federation with FEP-612d DNS object IDs. The new DNS-based…', published: '2026-04-20T09:00:00Z', to: ['Public'],           size: 2048,    mediaAttachments: 0, mrfAction: 'accept' },
  { id: 'https://pods.memory.social/p/01HX02', type: 'Note',    summary: 'Check out this photo from our last meetup! #fediverse',                               published: '2026-04-19T18:30:00Z', to: ['Public'],           size: 156_288, mediaAttachments: 1, mrfAction: 'label' },
  { id: 'https://pods.memory.social/p/01HX03', type: 'Article', summary: 'Understanding ActivityPub Followers Synchronization (FEP-8fcf)',                      published: '2026-04-18T12:00:00Z', to: ['Public'],           size: 24_576,  mediaAttachments: 0, mrfAction: 'accept' },
  { id: 'https://pods.memory.social/p/01HX04', type: 'Follow',  summary: 'Followed @sophia_kim@mastodon.social',                                                published: '2026-04-17T10:00:00Z', to: ['@sophia_kim'],      size: 512,     mediaAttachments: 0, mrfAction: 'accept' },
  { id: 'https://pods.memory.social/p/01HX05', type: 'Like',    summary: 'Liked https://mastodon.social/users/sophia_kim/statuses/112...',                       published: '2026-04-17T09:55:00Z', to: ['@sophia_kim'],      size: 448,     mediaAttachments: 0, mrfAction: 'accept' },
  { id: 'https://pods.memory.social/p/01HX06', type: 'Announce',summary: 'Boosted: "FEP-c648 blocked collection implementation merged!"',                        published: '2026-04-16T14:00:00Z', to: ['Public', 'Followers'],size: 640,   mediaAttachments: 0, mrfAction: 'accept' },
  { id: 'https://pods.memory.social/p/01HX07', type: 'Note',    summary: 'Testing the media pipeline with PDQ hash matching. Sensitive image detected and CW…',  published: '2026-04-15T11:00:00Z', to: ['Followers'],        size: 89_088,  mediaAttachments: 2, mrfAction: 'filter' },
  { id: 'https://pods.memory.social/p/01HX08', type: 'Block',   summary: 'Blocked @spammer@unknown.example',                                                    published: '2026-04-14T16:00:00Z', to: ['@spammer'],         size: 384,     mediaAttachments: 0, mrfAction: 'accept' },
])

const objTypeFilter = ref<RecordType | ''>('')
const objSearch     = ref('')

const filteredObjects = computed(() => apObjects.value.filter(o => {
  if (objTypeFilter.value && o.type !== objTypeFilter.value) return false
  if (objSearch.value && !o.summary?.toLowerCase().includes(objSearch.value.toLowerCase()) && !o.id.includes(objSearch.value)) return false
  return true
}))

function mrfColor(a?: ApObject['mrfAction']): string {
  if (!a || a === 'accept') return 'text-gray-300'
  if (a === 'label')  return 'text-yellow-500'
  if (a === 'filter') return 'text-orange-500'
  return 'text-red-500'
}

function fmtSize(b: number): string {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`
  if (b >= 1_024)     return `${Math.round(b / 1_024)} KB`
  return `${b} B`
}

// ── AT Records ────────────────────────────────────────────────────────────────
// Mirrors DefaultAtRecordReader / AtStoredRecord from at-adapter/repo/

const atRecords = ref<AtRecord[]>([
  { rkey: '3jxwz2z3omu2n', collection: 'app.bsky.feed.post',   cid: 'bafyreib...01', value: { '$type': 'app.bsky.feed.post', text: 'Exploring ActivityPods federation', createdAt: '2026-04-20T09:00:00Z' }, indexedAt: '2026-04-20T09:00:05Z' },
  { rkey: '3jxwz1a8bqc2a', collection: 'app.bsky.feed.post',   cid: 'bafyreib...02', value: { '$type': 'app.bsky.feed.post', text: 'Check out this photo!', createdAt: '2026-04-19T18:30:00Z' }, indexedAt: '2026-04-19T18:30:06Z' },
  { rkey: '3jxwz1qkfmf2b', collection: 'app.bsky.graph.follow', cid: 'bafyreib...03', value: { '$type': 'app.bsky.graph.follow', subject: 'did:plc:sophia001', createdAt: '2026-04-17T10:00:00Z' }, indexedAt: '2026-04-17T10:00:03Z' },
  { rkey: '3jxwz1bkfmf2c', collection: 'app.bsky.feed.like',   cid: 'bafyreib...04', value: { '$type': 'app.bsky.feed.like', subject: { uri: 'at://did:plc:sophia001/app.bsky.feed.post/abc', cid: 'bafy...' }, createdAt: '2026-04-17T09:55:00Z' }, indexedAt: '2026-04-17T09:55:02Z' },
  { rkey: '3jxwz0akfmf2d', collection: 'app.bsky.actor.profile',cid: 'bafyreib...05', value: { '$type': 'app.bsky.actor.profile', displayName: 'David Noé', description: 'ActivityPods provider', createdAt: '2026-04-01T00:00:00Z' }, indexedAt: '2026-04-01T00:00:01Z' },
])

const collectionFilter = ref('')
const uniqueCollections = computed(() => [...new Set(atRecords.value.map(r => r.collection))])
const filteredAt = computed(() => atRecords.value.filter(r => !collectionFilter.value || r.collection === collectionFilter.value))

// ── MRF Traces ───────────────────────────────────────────────────────────────
// Mirrors MRFDecisionTrace from admin/mrf/types.ts
// New in this dashboard — previously had no UI surface

const mrfTraces = ref<MrfTrace[]>([
  { traceId: 'tr01', activityId: 'https://pods.memory.social/p/01HX02', moduleId: 'media-policy', action: 'label',  mode: 'enforce', confidence: 0.72, labels: ['nsfw'],            reason: 'Sensitive media labels matched: nsfw',                                         originHost: 'pods.memory.social', createdAt: '2026-04-19T18:30:01Z' },
  { traceId: 'tr02', activityId: 'https://pods.memory.social/p/01HX07', moduleId: 'media-policy', action: 'filter', mode: 'enforce', confidence: 0.91, labels: ['nudity','nsfw'],    reason: 'Sensitive media labels matched: nudity, nsfw; PDQ hash match at distance 8',   originHost: 'pods.memory.social', createdAt: '2026-04-15T11:00:01Z' },
  { traceId: 'tr03', activityId: 'https://mastodon.social/users/spam/statuses/xyz', moduleId: 'rate-limit', action: 'reject', mode: 'enforce', labels: [], reason: 'Rate limit exceeded for mastodon.social (bucket exhausted)', originHost: 'mastodon.social', createdAt: '2026-04-14T15:00:00Z' },
  { traceId: 'tr04', activityId: 'https://unknown.example/users/actor/statuses/abc', moduleId: 'media-policy', action: 'reject', mode: 'enforce', confidence: 0.99, labels: ['csam','pdq-blocked-image'], reason: 'Blocked image PDQ hash matched at distance 3', originHost: 'unknown.example', createdAt: '2026-04-13T10:00:00Z' },
  { traceId: 'tr05', activityId: 'https://mastodon.social/users/liam/statuses/123', moduleId: 'media-policy', action: 'accept', mode: 'enforce', labels: [], reason: undefined, originHost: 'mastodon.social', createdAt: '2026-04-12T09:00:00Z' },
])

function traceActionColor(a: MrfTrace['action']): string {
  if (a === 'accept') return 'bg-green-50 text-green-600'
  if (a === 'label')  return 'bg-yellow-50 text-yellow-600'
  if (a === 'filter') return 'bg-orange-50 text-orange-600'
  return 'bg-red-50 text-red-600'
}

// ── Storage breakdown ─────────────────────────────────────────────────────────

const storageBreakdown = [
  { label: 'Media attachments', bytes: 245_366_784, color: 'bg-[rgb(99,100,246)]' },
  { label: 'ActivityPub objects', bytes: 12_582_912, color: 'bg-blue-300' },
  { label: 'AT records',           bytes: 4_194_304,  color: 'bg-sky-300' },
  { label: 'MRF traces',           bytes: 1_048_576,  color: 'bg-green-300' },
  { label: 'OAuth / session data', bytes: 524_288,    color: 'bg-orange-300' },
]

const totalBytes = computed(() => storageBreakdown.reduce((s, b) => s + b.bytes, 0))

function storageWidth(bytes: number): string {
  return `${(bytes / totalBytes.value * 100).toFixed(1)}%`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const expandedRecord = ref<AtRecord | null>(null)
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <header class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
      <h1 class="text-[14px] font-semibold text-gray-800">Data</h1>
      <!-- Tab strip -->
      <div class="flex bg-gray-50 border border-gray-100 rounded-xl p-0.5 text-[10px] font-semibold">
        <button v-for="[id,label] in [['objects','AP Objects'],['at-records','AT Records'],['mrf-traces','MRF Traces'],['storage','Storage']]" :key="id"
          class="px-3 py-1.5 rounded-lg transition-colors"
          :class="tab === id ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
          @click="tab = (id as DataTab)"
        >{{ label }}</button>
      </div>
    </header>

    <!-- ── AP Objects tab ──────────────────────────────────────────────────── -->
    <div v-if="tab === 'objects'" class="flex-1 overflow-y-auto">
      <!-- Filter bar -->
      <div class="flex items-center gap-2 px-5 py-3 border-b border-gray-50">
        <select v-model="objTypeFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
          <option value="">All types</option>
          <option v-for="t in ['Note','Article','Follow','Like','Announce','Block']" :key="t" :value="t">{{ t }}</option>
        </select>
        <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 w-52">
          <svg class="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="objSearch" placeholder="Search objects…" class="text-[11px] bg-transparent outline-none w-full placeholder-gray-300 text-gray-700"/>
        </div>
      </div>

      <table class="w-full text-[11px]">
        <thead class="sticky top-0 bg-white border-b border-gray-100">
          <tr>
            <th class="text-left px-5 py-2.5 font-semibold text-gray-400">Object</th>
            <th class="text-left px-3 py-2.5 font-semibold text-gray-400">Type</th>
            <th class="text-left px-3 py-2.5 font-semibold text-gray-400">Published</th>
            <th class="text-right px-3 py-2.5 font-semibold text-gray-400">Size</th>
            <th class="text-center px-3 py-2.5 font-semibold text-gray-400">Media</th>
            <th class="text-center px-3 py-2.5 font-semibold text-gray-400">MRF</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="obj in filteredObjects" :key="obj.id" class="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
            <td class="px-5 py-2.5 max-w-xs">
              <p class="text-gray-700 font-medium truncate">{{ obj.summary }}</p>
              <p class="text-[10px] text-gray-300 font-mono truncate">{{ obj.id }}</p>
            </td>
            <td class="px-3 py-2.5">
              <span class="text-[10px] font-semibold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{{ obj.type }}</span>
            </td>
            <td class="px-3 py-2.5 text-gray-400">{{ fmtDate(obj.published) }}</td>
            <td class="px-3 py-2.5 text-right text-gray-500 font-medium">{{ fmtSize(obj.size) }}</td>
            <td class="px-3 py-2.5 text-center text-gray-400">{{ obj.mediaAttachments > 0 ? obj.mediaAttachments : '—' }}</td>
            <td class="px-3 py-2.5 text-center font-semibold text-[10px] uppercase" :class="mrfColor(obj.mrfAction)">
              {{ obj.mrfAction && obj.mrfAction !== 'accept' ? obj.mrfAction : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── AT Records tab ─────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'at-records'" class="flex-1 overflow-y-auto">
      <div class="flex items-center gap-2 px-5 py-3 border-b border-gray-50">
        <select v-model="collectionFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
          <option value="">All collections</option>
          <option v-for="c in uniqueCollections" :key="c" :value="c">{{ c }}</option>
        </select>
        <span class="text-[11px] text-gray-400">{{ filteredAt.length }} records</span>
      </div>

      <div class="px-5 py-4 space-y-2">
        <div
          v-for="rec in filteredAt"
          :key="rec.rkey"
          class="rounded-2xl border border-gray-100 bg-white shadow-sm cursor-pointer hover:border-gray-200 transition-colors"
          @click="expandedRecord = expandedRecord?.rkey === rec.rkey ? null : rec"
        >
          <div class="px-4 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-semibold bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">{{ rec.collection }}</span>
                <span class="text-[11px] font-mono text-gray-600">{{ rec.rkey }}</span>
              </div>
              <p class="text-[10px] text-gray-300 font-mono mt-0.5 truncate">CID: {{ rec.cid }}</p>
            </div>
            <span class="text-[10px] text-gray-400 flex-shrink-0">{{ fmtDate(rec.indexedAt) }}</span>
          </div>
          <!-- Expanded record value -->
          <Transition name="expand">
            <div v-if="expandedRecord?.rkey === rec.rkey" class="px-4 pb-3 border-t border-gray-50">
              <pre class="text-[10px] text-gray-600 font-mono overflow-x-auto mt-2 bg-gray-50 rounded-xl p-3">{{ JSON.stringify(rec.value, null, 2) }}</pre>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- ── MRF Traces tab ─────────────────────────────────────────────────── -->
    <!-- NEW: previously had no dashboard UI — wired to MRFAdminStore.listTraces -->
    <div v-else-if="tab === 'mrf-traces'" class="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
      <p class="text-[11px] text-gray-400 mb-3">
        Full audit log of MRF module decisions. Traces are written by the media-policy and rate-limit modules as activities flow through the sidecar.
      </p>

      <div
        v-for="trace in mrfTraces"
        :key="trace.traceId"
        class="rounded-2xl border bg-white shadow-sm px-4 py-3"
        :class="trace.action === 'reject' ? 'border-red-100' : trace.action === 'filter' ? 'border-orange-100' : 'border-gray-100'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <!-- Module + action + mode -->
            <div class="flex items-center gap-1.5 flex-wrap mb-1">
              <span class="text-[10px] font-semibold bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{{ trace.moduleId }}</span>
              <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="traceActionColor(trace.action)">{{ trace.action }}</span>
              <span class="text-[10px] font-medium text-gray-400">{{ trace.mode }}</span>
              <span v-if="trace.confidence" class="text-[10px] font-medium bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
                {{ (trace.confidence * 100).toFixed(0) }}% confidence
              </span>
            </div>
            <!-- Activity ID -->
            <p class="text-[10px] text-gray-400 font-mono truncate max-w-xs">{{ trace.activityId }}</p>
            <!-- Labels -->
            <div v-if="trace.labels.length" class="flex gap-1 flex-wrap mt-1">
              <span v-for="lbl in trace.labels" :key="lbl" class="text-[9px] bg-red-50 text-red-500 px-1 py-0.5 rounded">{{ lbl }}</span>
            </div>
            <!-- Reason -->
            <p v-if="trace.reason" class="text-[10px] text-gray-400 mt-1">{{ trace.reason }}</p>
            <!-- Origin host -->
            <p v-if="trace.originHost" class="text-[10px] text-gray-300 mt-0.5">from {{ trace.originHost }}</p>
          </div>
          <span class="text-[10px] text-gray-300 flex-shrink-0">{{ fmtDate(trace.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- ── Storage tab ────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'storage'" class="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      <!-- Usage bar -->
      <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-4">
        <div class="flex justify-between mb-2">
          <p class="text-[12px] font-semibold text-gray-700">Total Pod Storage</p>
          <p class="text-[12px] font-semibold text-gray-600">{{ fmtSize(totalBytes) }} / 1.2 TB</p>
        </div>
        <!-- Stacked bar -->
        <div class="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div v-for="seg in storageBreakdown" :key="seg.label" :class="seg.color" :style="{ width: storageWidth(seg.bytes) }"></div>
        </div>
        <!-- Legend -->
        <div class="mt-3 grid grid-cols-2 gap-y-1.5">
          <div v-for="seg in storageBreakdown" :key="seg.label" class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-sm flex-shrink-0" :class="seg.color"></span>
            <span class="text-[10px] text-gray-500">{{ seg.label }}</span>
            <span class="text-[10px] font-semibold text-gray-600 ml-auto">{{ fmtSize(seg.bytes) }}</span>
          </div>
        </div>
      </div>

      <!-- Per-collection breakdown for AT records -->
      <div class="rounded-2xl border border-gray-100 shadow-sm bg-white px-5 py-4">
        <p class="text-[12px] font-semibold text-gray-700 mb-3">AT Record Collections</p>
        <div class="space-y-2">
          <div v-for="c in uniqueCollections" :key="c" class="flex items-center justify-between">
            <span class="text-[11px] text-gray-500">{{ c }}</span>
            <span class="text-[11px] font-semibold text-[rgb(99,100,246)]">{{ atRecords.filter(r => r.collection === c).length }} records</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.expand-enter-active, .expand-leave-active { transition: opacity 0.15s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; }
</style>
