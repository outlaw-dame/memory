<script setup lang="ts">
import { ref, computed } from 'vue'

interface Incident {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  source: 'mrf-auto' | 'provider-dashboard' | 'at-firehose' | 'system'
  affectedPod?: string
  timestamp: string
  status: 'open' | 'investigating' | 'resolved'
}

const incidents = ref<Incident[]>([
  { id: '1', severity: 'critical', title: 'CSAM label detected — content blocked',     description: 'Media policy MRF blocked an attachment from mastodon.social matching known CSAM PDQ hash.', source: 'mrf-auto',           affectedPod: 'Pooooood',  timestamp: '3m ago',  status: 'open' },
  { id: '2', severity: 'critical', title: 'Account suspended via AT takedown',          description: 'com.atproto.admin.updateSubjectStatus called for did:plc:abc123 following moderation decision.',  source: 'provider-dashboard', affectedPod: 'DenPod',    timestamp: '14m ago', status: 'investigating' },
  { id: '3', severity: 'warning',  title: 'Rate limit triggered — spammer.example',    description: 'Instance spammer.example exceeded 1000 activities/hr. Token bucket exhausted, activities queued.', source: 'mrf-auto',           affectedPod: undefined,   timestamp: '1h ago',  status: 'resolved' },
  { id: '4', severity: 'warning',  title: 'Bandwidth spike on Pooooood',               description: 'Bandwidth utilization reached 89% — above the 85% alert threshold set for this pod.',            source: 'system',             affectedPod: 'Pooooood',  timestamp: '2h ago',  status: 'resolved' },
  { id: '5', severity: 'critical', title: '!hide label received from AT firehose',      description: 'External AT labeler emitted !hide for did:plc:xyz789 — user suspended cross-protocol.',           source: 'at-firehose',        affectedPod: '58Pod',     timestamp: '3h ago',  status: 'open' },
  { id: '6', severity: 'info',     title: 'New peer joined federation — gts.example',  description: 'GoToSocial instance at gts.example.com began federating. Awaiting trust score evaluation.',        source: 'system',             affectedPod: undefined,   timestamp: '4h ago',  status: 'resolved' },
  { id: '7', severity: 'warning',  title: 'Media content warning applied (bulk)',       description: '12 posts from akkoma.social auto-flagged with "Sensitive media" CW by media-policy MRF.',          source: 'mrf-auto',           affectedPod: undefined,   timestamp: '5h ago',  status: 'resolved' },
  { id: '8', severity: 'critical', title: 'Storage alert — 950GB threshold reached',   description: 'Total cluster storage reached 950GB alert threshold. Current usage: 1.12TB/1.2TB.',                source: 'system',             affectedPod: undefined,   timestamp: '6h ago',  status: 'investigating' },
])

const severityFilter = ref<'' | 'critical' | 'warning' | 'info'>('')
const statusFilter    = ref<'' | 'open' | 'investigating' | 'resolved'>('')

const filtered = computed(() => incidents.value.filter(i => {
  const matchSev = !severityFilter.value || i.severity === severityFilter.value
  const matchSt  = !statusFilter.value    || i.status === statusFilter.value
  return matchSev && matchSt
}))

function severityStyle(s: Incident['severity']) {
  if (s === 'critical') return { dot: 'bg-red-500',    badge: 'bg-red-50 text-red-600' }
  if (s === 'warning')  return { dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600' }
  return                       { dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-600' }
}

function statusStyle(s: Incident['status']) {
  if (s === 'open')          return 'bg-red-50 text-red-500'
  if (s === 'investigating') return 'bg-orange-50 text-orange-500'
  return 'bg-green-50 text-green-600'
}

function sourceLabel(s: Incident['source']) {
  const map: Record<string, string> = {
    'mrf-auto': 'MRF Auto', 'provider-dashboard': 'Dashboard',
    'at-firehose': 'AT Firehose', 'system': 'System',
  }
  return map[s] ?? s
}

function resolve(incident: Incident) {
  incident.status = 'resolved'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <h1 class="text-[15px] font-semibold text-gray-800">Global Incidents</h1>
        <span class="text-[13px] font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full">
          {{ incidents.filter(i => i.status !== 'resolved').length }} open
        </span>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="severityFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select v-model="statusFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-2.5">
      <div
        v-for="incident in filtered"
        :key="incident.id"
        class="rounded-2xl border bg-white px-4 py-3.5 shadow-sm"
        :class="incident.severity === 'critical' ? 'border-red-100' : incident.severity === 'warning' ? 'border-orange-100' : 'border-gray-100'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-2.5 min-w-0">
            <span class="mt-1 w-2 h-2 rounded-full flex-shrink-0" :class="severityStyle(incident.severity).dot"></span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[12px] font-semibold text-gray-700">{{ incident.title }}</span>
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full" :class="severityStyle(incident.severity).badge">
                  {{ incident.severity }}
                </span>
                <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500">
                  {{ sourceLabel(incident.source) }}
                </span>
                <span v-if="incident.affectedPod" class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500">
                  {{ incident.affectedPod }}
                </span>
              </div>
              <p class="text-[11px] text-gray-400 mt-1">{{ incident.description }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-[10px] font-medium px-2 py-1 rounded-full" :class="statusStyle(incident.status)">
              {{ incident.status }}
            </span>
            <span class="text-[10px] text-gray-300">{{ incident.timestamp }}</span>
            <button
              v-if="incident.status !== 'resolved'"
              class="text-[10px] text-gray-400 hover:text-green-600 transition-colors px-2 py-1 rounded-lg hover:bg-green-50"
              @click="resolve(incident)"
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
      <p v-if="filtered.length === 0" class="text-center text-gray-400 text-[12px] py-8">
        No incidents match the current filter.
      </p>
    </div>
  </div>
</template>
