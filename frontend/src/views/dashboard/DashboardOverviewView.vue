<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// ── Search ────────────────────────────────────────────────────────────────────
const search = ref('')

// ── Stats (would come from sidecar /metrics or a health endpoint) ─────────────
const stats = ref({
  totalPods: 450,
  totalPodsDelta: +20,
  activePods: 323,
  activePodsDeltaPct: 3,
  systemHealth: 'Good' as 'Good' | 'Degraded' | 'Critical',
  federationStatus: 'Connected' as 'Connected' | 'Partial' | 'Offline',
  criticalAlerts: 48,
})

// ── Sparkline helper ──────────────────────────────────────────────────────────
function makePath(points: number[], w = 240, h = 60): string {
  if (points.length < 2) return ''
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const xs = points.map((_, i) => (i / (points.length - 1)) * w)
  const ys = points.map(v => h - ((v - min) / range) * (h * 0.85) - h * 0.05)
  return xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
}

function makeArea(points: number[], w = 240, h = 60): string {
  const path = makePath(points, w, h)
  if (!path) return ''
  const lastX = w
  return `${path} L${lastX},${h} L0,${h} Z`
}

// ── Bandwidth data ────────────────────────────────────────────────────────────
const bandwidthPoints = [28, 35, 42, 38, 55, 62, 58, 70, 67, 72, 65, 78, 80, 74, 67]
const bandwidthCurrent = computed(() => bandwidthPoints[bandwidthPoints.length - 1])
const bandwidthAvg = computed(() => Math.round(bandwidthPoints.reduce((a, b) => a + b, 0) / bandwidthPoints.length))

const bandwidthPods = [
  { name: 'Pooooood', pct: 89, status: 'green' },
  { name: 'Pody45',   pct: 20, status: 'green' },
  { name: 'DenPod',   pct: 0,  status: 'orange' },
  { name: '58Pod',    pct: 14, status: 'green' },
  { name: 'PoddyPod', pct: 6,  status: 'green' },
]
const bandwidthAlertEnabled = ref(false)
const bandwidthAlertThreshold = 85

// ── Storage data ──────────────────────────────────────────────────────────────
const storagePoints = [30, 38, 42, 50, 55, 60, 58, 65, 70, 68, 75, 80, 85, 88, 93]
const storageUsed = '1.12TB'
const storageTotal = '1.2TB'

const storagePods = [
  { name: 'Pooooood',        size: '29GB',  status: 'green' },
  { name: 'DenPod',          size: '18.3GB', status: 'orange' },
  { name: '58Pod',           size: '9.2GB', status: 'green' },
  { name: 'Server Software', size: '983MB', status: 'green' },
  { name: 'PoddyPod',        size: '598MB', status: 'green' },
]
const storageAlertEnabled = ref(false)
const storageAlertThreshold = '950GB'

// Pod status dot color
function statusColor(s: string) {
  if (s === 'green')  return 'bg-green-400'
  if (s === 'orange') return 'bg-orange-400'
  return 'bg-red-400'
}

// Health badge colors
const healthClass = computed(() => {
  const h = stats.value.systemHealth
  if (h === 'Good') return 'text-green-500'
  if (h === 'Degraded') return 'text-yellow-500'
  return 'text-red-500'
})

const fedClass = computed(() => {
  const f = stats.value.federationStatus
  if (f === 'Connected') return 'text-green-500'
  if (f === 'Partial') return 'text-yellow-500'
  return 'text-red-500'
})

onMounted(() => {
  // Future: fetch real metrics from sidecar /admin/metrics
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- ── Page header ──────────────────────────────────────────────────────── -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <h1 class="text-[15px] font-semibold text-gray-800">Overview</h1>
      <div class="flex items-center gap-3">
        <!-- Time range -->
        <button class="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors">
          Last 24h
          <svg class="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
        </button>
        <!-- Search -->
        <div class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-[11px] text-gray-400 w-44 border border-gray-100">
          <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" placeholder="Search" class="bg-transparent outline-none w-full placeholder-gray-300 text-gray-700" />
        </div>
      </div>
    </header>

    <!-- ── Scrollable body ──────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">

      <!-- ── Stat cards row ────────────────────────────────────────────────── -->
      <div class="grid grid-cols-5 gap-3">
        <!-- Total Pods -->
        <div class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <p class="text-[10px] font-medium text-gray-400 mb-1">Total Pods</p>
          <p class="text-[22px] font-bold text-gray-800 leading-none">
            {{ stats.totalPods }}
            <span class="text-[13px] font-semibold text-green-500 ml-1">+{{ stats.totalPodsDelta }}</span>
          </p>
        </div>
        <!-- Active Pods -->
        <div class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <p class="text-[10px] font-medium text-gray-400 mb-1">Active Pods</p>
          <p class="text-[22px] font-bold text-gray-800 leading-none">
            {{ stats.activePods }}
            <span class="text-[13px] font-semibold text-green-500 ml-1">+{{ stats.activePodsDeltaPct }}%</span>
          </p>
        </div>
        <!-- System Health -->
        <div class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <p class="text-[10px] font-medium text-gray-400 mb-1">System Health</p>
          <p class="text-[22px] font-bold leading-none" :class="healthClass">{{ stats.systemHealth }}</p>
        </div>
        <!-- Federation Status -->
        <div class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <p class="text-[10px] font-medium text-gray-400 mb-1">Federation Status Overview</p>
          <p class="text-[18px] font-bold leading-none" :class="fedClass">{{ stats.federationStatus }}</p>
        </div>
        <!-- Critical Alerts -->
        <div class="rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <p class="text-[10px] font-medium text-gray-400 mb-1">Critical Alerts &amp; Incidents</p>
          <p class="text-[22px] font-bold text-red-500 leading-none">{{ stats.criticalAlerts }}</p>
        </div>
      </div>

      <!-- ── Chart panels row ──────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-4">

        <!-- Bandwidth panel -->
        <div class="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div class="px-4 pt-4 pb-0">
            <div class="flex items-start justify-between mb-1">
              <div>
                <p class="text-[11px] font-medium text-gray-400">Bandwidth</p>
                <p class="text-[22px] font-bold text-gray-800 leading-tight">
                  {{ bandwidthCurrent }}%
                  <span class="text-[12px] font-normal text-gray-400 ml-1">Avg: {{ bandwidthAvg }}%</span>
                </p>
              </div>
              <button class="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
                Last 24h
                <svg class="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <!-- Sparkline chart -->
          <div class="relative h-16 px-0">
            <!-- Y-axis labels -->
            <div class="absolute left-4 top-0 bottom-0 flex flex-col justify-between py-1 text-[8px] text-gray-300 pointer-events-none">
              <span>100%</span>
              <span>80%</span>
              <span>50%</span>
            </div>
            <!-- X-axis labels -->
            <div class="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-[8px] text-gray-300 pointer-events-none pb-0.5">
              <span>24h ago</span>
              <span>Last hour</span>
              <span>Now</span>
            </div>
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 240 60">
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgb(99,100,246)" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="rgb(99,100,246)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path :d="makeArea(bandwidthPoints)" fill="url(#bwGrad)" />
              <path :d="makePath(bandwidthPoints)" fill="none" stroke="rgb(99,100,246)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <!-- Pod list -->
          <div class="px-4 pb-1 space-y-1 mt-1">
            <div v-for="pod in bandwidthPods" :key="pod.name" class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusColor(pod.status)"></span>
                <span class="text-[11px] text-gray-600">{{ pod.name }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-semibold text-gray-500">{{ pod.pct }}%</span>
                <!-- Squiggle trend icon -->
                <svg class="w-4 h-3 text-gray-300" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M1 6 Q4 2 8 6 Q12 10 15 6" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Alert row -->
          <div class="mx-4 mb-3 mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span class="text-[11px] font-medium text-gray-500">Alert</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- Toggle -->
              <button
                class="w-8 h-4 rounded-full transition-colors relative flex-shrink-0"
                :class="bandwidthAlertEnabled ? 'bg-[rgb(99,100,246)]' : 'bg-gray-200'"
                @click="bandwidthAlertEnabled = !bandwidthAlertEnabled"
              >
                <span
                  class="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                  :class="bandwidthAlertEnabled ? 'left-[18px]' : 'left-0.5'"
                ></span>
              </button>
              <span class="text-[11px] font-semibold text-gray-400">{{ bandwidthAlertThreshold }}%</span>
            </div>
          </div>
        </div>

        <!-- Storage panel -->
        <div class="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div class="px-4 pt-4 pb-0">
            <div class="flex items-start justify-between mb-1">
              <div>
                <p class="text-[11px] font-medium text-gray-400">Storage</p>
                <p class="text-[22px] font-bold text-gray-800 leading-tight">
                  {{ storageUsed }}/{{ storageTotal }}
                </p>
              </div>
              <button class="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
                Last month
                <svg class="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>

          <!-- Sparkline chart -->
          <div class="relative h-16 px-0">
            <div class="absolute left-4 top-0 bottom-0 flex flex-col justify-between py-1 text-[8px] text-gray-300 pointer-events-none">
              <span>100%</span>
              <span>80%</span>
              <span>50%</span>
            </div>
            <div class="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-[8px] text-gray-300 pointer-events-none pb-0.5">
              <span>30d ago</span>
              <span>Yesterday</span>
              <span>Now</span>
            </div>
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 240 60">
              <defs>
                <linearGradient id="stGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgb(99,100,246)" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="rgb(99,100,246)" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path :d="makeArea(storagePoints)" fill="url(#stGrad)" />
              <path :d="makePath(storagePoints)" fill="none" stroke="rgb(99,100,246)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <!-- Pod list -->
          <div class="px-4 pb-1 space-y-1 mt-1">
            <div v-for="pod in storagePods" :key="pod.name" class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusColor(pod.status)"></span>
                <span class="text-[11px] text-gray-600">{{ pod.name }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-semibold text-[rgb(99,100,246)]">{{ pod.size }}</span>
                <svg class="w-4 h-3 text-gray-300" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M1 6 Q4 2 8 6 Q12 10 15 6" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          </div>

          <!-- Alert row -->
          <div class="mx-4 mb-3 mt-2 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span class="text-[11px] font-medium text-gray-500">Alert</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="w-8 h-4 rounded-full transition-colors relative flex-shrink-0"
                :class="storageAlertEnabled ? 'bg-[rgb(99,100,246)]' : 'bg-gray-200'"
                @click="storageAlertEnabled = !storageAlertEnabled"
              >
                <span
                  class="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all"
                  :class="storageAlertEnabled ? 'left-[18px]' : 'left-0.5'"
                ></span>
              </button>
              <span class="text-[11px] font-semibold text-gray-400">{{ storageAlertThreshold }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
