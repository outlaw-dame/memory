<script setup lang="ts">
import { ref } from 'vue'

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
  { id: 'media-policy',  label: 'Media Policy',      description: 'PDQ hash matching, sensitive label detection, content warnings', enabled: true },
  { id: 'rate-limit',    label: 'Rate Limit',         description: 'Per-instance inbound activity rate limiting via token bucket', enabled: true },
  { id: 'keyword-reject', label: 'Keyword Reject',   description: 'Reject activities matching configured keyword patterns',        enabled: false },
  { id: 'trust-eval',    label: 'Trust Evaluation',   description: 'Score-based trust evaluation for remote actors',               enabled: true },
])

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
