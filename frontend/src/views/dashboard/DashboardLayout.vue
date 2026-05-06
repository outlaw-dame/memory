<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const dashboardExpanded = ref(true)

const navSections = [
  { id: 'network',      label: 'Network',      route: '/dashboard/network'      as string | null },
  { id: 'applications', label: 'Applications', route: '/dashboard/applications' as string | null },
  { id: 'data',         label: 'Data',         route: '/dashboard/data'         as string | null },
  {
    id: 'dashboard',
    label: 'Dashboard',
    route: null as string | null,
    children: [
      { id: 'overview',      label: 'Overview',               route: '/dashboard' },
      { id: 'pods',          label: 'Pods',                   route: '/dashboard/pods' },
      { id: 'federation',    label: 'Federation Control',     route: '/dashboard/federation' },
      { id: 'incidents',     label: 'Global Incidents',       route: '/dashboard/incidents' },
      { id: 'system-config', label: 'System Configuration',   route: '/dashboard/system-config' },
      { id: 'billing',       label: 'Billing & Subscription', route: '/dashboard/billing' },
      { id: 'audit',         label: 'Audit & Compliance',     route: '/dashboard/audit' },
    ],
  },
  { id: 'settings', label: 'Settings', route: '/settings' },
]

function isActive(r: string | null) {
  if (!r) return false
  if (r === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(r)
}

function navigate(r: string | null) {
  if (r) router.push(r)
}

const displayName = computed(() => auth.user?.name ?? 'User')
const handle = computed(() => auth.user?.email ? auth.user.email.split('@')[0] : '')
const initials = computed(() => displayName.value.slice(0, 1).toUpperCase())
</script>

<template>
  <div class="flex h-screen bg-white overflow-hidden">
    <!-- ── Sidebar ──────────────────────────────────────── -->
    <aside class="w-[220px] flex-shrink-0 flex flex-col border-r border-gray-100 bg-white">
      <!-- Logo -->
      <div class="px-5 pt-5 pb-4">
        <span class="text-lg font-[Butler,serif] tracking-tight">dashboard.</span>
      </div>

      <!-- User card -->
      <div class="mx-3 mb-4 flex items-center justify-between rounded-2xl bg-[rgba(250,247,243,1)] px-3 py-2.5">
        <div class="flex items-center gap-2 min-w-0">
          <div class="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
            {{ initials }}
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-gray-800 truncate leading-tight">{{ displayName }}</p>
            <p class="text-[10px] text-gray-400 truncate leading-tight">{{ handle }}</p>
          </div>
        </div>
        <button class="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(246,99,99,0.15)] flex items-center justify-center">
          <AppIcon name="notifications" :size="14" color="rgb(246,99,99)" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 space-y-0.5">
        <template v-for="item in navSections" :key="item.id">
          <!-- Top-level item with children (Dashboard section) -->
          <template v-if="item.children">
            <button
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              @click="dashboardExpanded = !dashboardExpanded"
            >
              <AppIcon name="dashboard" :size="14" color="currentColor" class="opacity-60 flex-shrink-0" />
              <span>{{ item.label }}</span>
              <AppIcon
                name="chevron-down"
                :size="12"
                color="currentColor"
                class="ml-auto opacity-50 transition-transform"
                :class="dashboardExpanded ? 'rotate-180' : ''"
              />
            </button>
            <div v-if="dashboardExpanded" class="ml-3 mt-0.5 space-y-0.5">
              <button
                v-for="child in item.children"
                :key="child.id"
                class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[11px] transition-colors"
                :class="isActive(child.route)
                  ? 'bg-[rgba(246,99,99,0.12)] text-[rgb(200,60,60)] font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 font-medium'"
                @click="navigate(child.route)"
              >
                <AppIcon name="dashboard" :size="12" color="currentColor" class="opacity-60 flex-shrink-0" />
                <span>{{ child.label }}</span>
              </button>
            </div>
          </template>

          <!-- Top-level item without children -->
          <button
            v-else
            class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors"
            :class="isActive(item.route) ? 'bg-[rgba(246,99,99,0.12)] text-[rgb(200,60,60)]' : 'text-gray-600 hover:bg-gray-50'"
            @click="navigate(item.route)"
          >
            <AppIcon name="dashboard" :size="14" color="currentColor" class="opacity-60 flex-shrink-0" />
            <span>{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <!-- ── Mini stats strip ──────────────────────────── -->
      <div class="mx-3 mb-3 rounded-2xl bg-[rgba(250,247,243,1)] px-3 py-3 space-y-2">
        <div class="flex justify-between text-[10px]">
          <span class="text-gray-400">System Health</span>
          <span class="font-semibold text-green-500">Good</span>
        </div>
        <div class="flex justify-between text-[10px]">
          <span class="text-gray-400">Active Pods</span>
          <span class="font-semibold text-gray-700">323</span>
        </div>
        <div class="flex gap-3 text-[10px]">
          <div class="flex-1">
            <div class="flex justify-between mb-0.5">
              <span class="text-gray-400">Bandwidth</span>
              <span class="font-semibold text-gray-600">70%</span>
            </div>
            <div class="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-[rgb(99,100,246)]" style="width:70%"></div>
            </div>
          </div>
          <div class="flex-1">
            <div class="flex justify-between mb-0.5">
              <span class="text-gray-400">Storage</span>
              <span class="font-semibold text-gray-600">49%</span>
            </div>
            <div class="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-[rgb(99,100,246)]" style="width:49%"></div>
            </div>
          </div>
        </div>
        <div class="flex justify-between text-[10px]">
          <span class="text-gray-400">Critical Alerts</span>
          <span class="font-semibold text-red-500">48 <span class="text-gray-300 font-normal">· 1 last 24h</span></span>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-gray-100">
        <div class="mb-2">
          <p class="text-[11px] font-semibold text-gray-700">Your Contact Link</p>
          <p class="text-[10px] text-gray-400">Use a link to connect.</p>
          <button class="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors">
            <AppIcon name="copy" :size="12" color="currentColor" />
            Copy
          </button>
        </div>
        <p class="text-[9px] text-gray-300">©2025 <span class="font-[Butler,serif]">memory.</span></p>
        <div class="flex gap-1 text-[9px] text-gray-300 mt-0.5">
          <a href="#" class="hover:underline">Imprint</a>
          <span>•</span>
          <a href="#" class="hover:underline">Privacy Policy</a>
          <span>•</span>
          <a href="#" class="hover:underline">Contact</a>
        </div>
      </div>
    </aside>

    <!-- ── Main content ──────────────────────────────────── -->
    <main class="flex-1 overflow-y-auto bg-white">
      <RouterView />
    </main>
  </div>
</template>
