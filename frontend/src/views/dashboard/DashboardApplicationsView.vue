<script setup lang="ts">
/**
 * DashboardApplicationsView
 *
 * Shows OAuth client authorizations and AT Protocol app sessions for the pod.
 *
 * Wired to the sidecar's OAuth infrastructure:
 *   OAuthGrantStore (Redis)   — active grants per app
 *   OAuthRefreshTokenStore    — active refresh tokens per client
 *   OAuthAuthorizationServer  — metadata + revoke endpoint
 *
 * Sidecar OAuth endpoints (from OAuthFastifyBridge / OAuthRouteHandlers):
 *   GET  /oauth/grants              → list active grants  (not yet exposed; would need thin route)
 *   POST /oauth/revoke              → revoke token (RFC 7009)
 *   GET  /oauth/clients             → list known clients  (not yet exposed)
 *   GET  /oauth/authorization-server → AS metadata
 */
import { ref, computed } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AppGrant {
  id: string
  clientId: string
  clientName: string
  clientUri?: string
  clientDescription?: string
  protocol: 'at' | 'ap-oauth' | 'api-token'
  scopes: string[]
  grantedAt: string
  lastUsed?: string
  expiresAt?: string
  active: boolean
  atDid?: string          // for AT protocol sessions — which DID is authorized
  dpopBound: boolean
}

// ── Data (mirrors OAuthGrantRecord shape from OAuthTypes.ts) ──────────────────

const grants = ref<AppGrant[]>([
  {
    id: 'g1', clientId: 'did:web:bsky.app',
    clientName: 'Bluesky',
    clientUri: 'https://bsky.app',
    clientDescription: 'Official Bluesky client — AT Protocol OAuth 2.0',
    protocol: 'at',
    scopes: ['atproto', 'transition:generic'],
    grantedAt: '2026-04-10T14:22:00Z',
    lastUsed: '2026-04-20T09:05:00Z',
    active: true,
    atDid: 'did:plc:abc123',
    dpopBound: true,
  },
  {
    id: 'g2', clientId: 'did:web:ivory.social',
    clientName: 'Ivory',
    clientUri: 'https://tapbots.com/ivory',
    clientDescription: 'Ivory for Mastodon — AT Protocol client',
    protocol: 'at',
    scopes: ['atproto', 'transition:chat.bsky'],
    grantedAt: '2026-04-08T11:00:00Z',
    lastUsed: '2026-04-19T18:30:00Z',
    active: true,
    atDid: 'did:plc:abc123',
    dpopBound: true,
  },
  {
    id: 'g3', clientId: 'https://memory.social/apps/native',
    clientName: 'memory. (mobile)',
    clientUri: 'https://memory.social',
    clientDescription: 'Official memory. mobile client via OIDC',
    protocol: 'ap-oauth',
    scopes: ['openid', 'profile', 'pods:read', 'pods:write'],
    grantedAt: '2026-04-01T08:00:00Z',
    lastUsed: '2026-04-20T10:45:00Z',
    active: true,
    dpopBound: false,
  },
  {
    id: 'g4', clientId: 'https://thirdparty.example/app',
    clientName: 'PodBridge',
    clientUri: 'https://thirdparty.example',
    clientDescription: 'Cross-pod migration tool',
    protocol: 'ap-oauth',
    scopes: ['pods:read'],
    grantedAt: '2026-03-15T12:00:00Z',
    lastUsed: '2026-03-20T09:00:00Z',
    expiresAt: '2026-04-15T12:00:00Z',
    active: false,
    dpopBound: false,
  },
  {
    id: 'g5', clientId: 'local:api-token:dashboard',
    clientName: 'Dashboard API Token',
    clientUri: undefined,
    clientDescription: 'Provider admin token for the memory. dashboard',
    protocol: 'api-token',
    scopes: ['admin:read', 'admin:write', 'provider:read', 'provider:write'],
    grantedAt: '2026-04-01T00:00:00Z',
    lastUsed: '2026-04-20T10:55:00Z',
    active: true,
    dpopBound: false,
  },
])

const filter = ref<'all' | 'at' | 'ap-oauth' | 'api-token'>('all')
const search = ref('')

const filtered = computed(() => grants.value.filter(g => {
  if (filter.value !== 'all' && g.protocol !== filter.value) return false
  const q = search.value.toLowerCase()
  if (q && !g.clientName.toLowerCase().includes(q) && !g.clientId.toLowerCase().includes(q)) return false
  return true
}))

// ── Revoke ────────────────────────────────────────────────────────────────────
// POST /oauth/revoke (RFC 7009) — sidecar exposes this at the AT OAuth bridge
// Also DELETE /internal/admin/session/:grantId for provider-level revocation

const revoking = ref<string | null>(null)

async function revoke(grant: AppGrant) {
  revoking.value = grant.id
  try {
    // Sidecar: POST /oauth/revoke with token_hint
    // For now: mark locally inactive (real call would hit the OAuth bridge)
    await new Promise(r => setTimeout(r, 400)) // simulated network
    grant.active = false
  } finally {
    revoking.value = null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function protocolBadge(p: AppGrant['protocol']): { label: string; cls: string } {
  if (p === 'at')        return { label: 'ATProto OAuth',  cls: 'bg-sky-50 text-sky-600' }
  if (p === 'ap-oauth')  return { label: 'AP / OIDC',      cls: 'bg-blue-50 text-blue-600' }
  return                        { label: 'API Token',       cls: 'bg-purple-50 text-purple-600' }
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function scopeColor(scope: string): string {
  if (scope.startsWith('admin'))    return 'bg-red-50 text-red-600'
  if (scope.startsWith('provider')) return 'bg-orange-50 text-orange-600'
  if (scope.includes('write'))      return 'bg-yellow-50 text-yellow-600'
  if (scope === 'atproto')          return 'bg-sky-50 text-sky-500'
  return 'bg-gray-50 text-gray-500'
}

// ── New token modal (placeholder for API token creation) ─────────────────────
const newTokenModal = ref(false)
const newTokenName  = ref('')
const newTokenScopes = ref<string[]>([])
const AVAILABLE_SCOPES = ['admin:read', 'admin:write', 'provider:read', 'provider:write', 'pods:read', 'pods:write']

function toggleScope(s: string) {
  const i = newTokenScopes.value.indexOf(s)
  if (i === -1) newTokenScopes.value.push(s)
  else          newTokenScopes.value.splice(i, 1)
}

function createToken() {
  if (!newTokenName.value.trim()) return
  grants.value.unshift({
    id: String(Date.now()),
    clientId: `local:api-token:${newTokenName.value.toLowerCase().replace(/\s+/g, '-')}`,
    clientName: newTokenName.value,
    protocol: 'api-token',
    scopes: [...newTokenScopes.value],
    grantedAt: new Date().toISOString(),
    active: true,
    dpopBound: false,
  })
  newTokenModal.value = false
  newTokenName.value = ''
  newTokenScopes.value = []
}
</script>

<template>
  <div class="flex flex-col h-full">

    <!-- Header -->
    <header class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
      <h1 class="text-[14px] font-semibold text-gray-800">Applications</h1>
      <div class="flex items-center gap-2">
        <!-- Protocol filter tabs -->
        <div class="flex bg-gray-50 border border-gray-100 rounded-xl p-0.5 text-[10px] font-semibold">
          <button v-for="tab in [['all','All'],['at','ATProto'],['ap-oauth','AP/OIDC'],['api-token','API']]" :key="tab[0]"
            class="px-2.5 py-1 rounded-lg transition-colors"
            :class="filter === tab[0] ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
            @click="filter = (tab[0] as typeof filter)"
          >{{ tab[1] }}</button>
        </div>
        <!-- Search -->
        <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 w-36">
          <svg class="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" placeholder="Search…" class="text-[11px] bg-transparent outline-none w-full placeholder-gray-300 text-gray-700"/>
        </div>
        <!-- New token -->
        <button
          class="flex items-center gap-1.5 text-[11px] font-semibold bg-[rgb(99,100,246)] text-white px-3 py-1.5 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors"
          @click="newTokenModal = true"
        >
          New Token
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
        </button>
      </div>
    </header>

    <!-- Stats strip -->
    <div class="flex gap-3 px-5 py-3 border-b border-gray-50">
      <span class="text-[11px] font-medium bg-green-50 text-green-600 px-2.5 py-1 rounded-full">{{ grants.filter(g => g.active).length }} Active</span>
      <span class="text-[11px] font-medium bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full">{{ grants.filter(g => g.protocol === 'at' && g.active).length }} AT Protocol</span>
      <span class="text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{{ grants.filter(g => g.protocol === 'ap-oauth' && g.active).length }} AP/OIDC</span>
      <span class="text-[11px] font-medium bg-gray-50 text-gray-400 px-2.5 py-1 rounded-full">{{ grants.filter(g => !g.active).length }} Revoked</span>
    </div>

    <!-- Grants list -->
    <div class="flex-1 overflow-y-auto px-5 py-4 space-y-3">
      <div
        v-for="g in filtered"
        :key="g.id"
        class="rounded-2xl border bg-white shadow-sm"
        :class="g.active ? 'border-gray-100' : 'border-gray-50 opacity-50'"
      >
        <div class="px-4 py-3.5 flex items-start justify-between gap-4">
          <!-- App icon + info -->
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <!-- App initial avatar -->
            <div class="w-9 h-9 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center text-[13px] font-bold text-gray-500">
              {{ g.clientName.slice(0, 1).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[12px] font-semibold text-gray-700">{{ g.clientName }}</span>
                <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" :class="protocolBadge(g.protocol).cls">
                  {{ protocolBadge(g.protocol).label }}
                </span>
                <span v-if="g.dpopBound" class="text-[9px] font-semibold bg-green-50 text-green-500 px-1.5 py-0.5 rounded-full">DPoP bound</span>
                <span v-if="!g.active" class="text-[9px] font-semibold bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full">revoked</span>
              </div>
              <p v-if="g.clientDescription" class="text-[10px] text-gray-400 mt-0.5">{{ g.clientDescription }}</p>
              <p class="text-[9px] text-gray-300 mt-0.5 font-mono truncate max-w-xs">{{ g.clientId }}</p>
            </div>
          </div>

          <!-- Dates + revoke -->
          <div class="flex-shrink-0 text-right space-y-1">
            <p class="text-[10px] text-gray-400">Granted {{ fmtDate(g.grantedAt) }}</p>
            <p v-if="g.lastUsed" class="text-[10px] text-gray-400">Last used {{ fmtDateTime(g.lastUsed) }}</p>
            <p v-if="g.expiresAt && !g.active" class="text-[10px] text-red-400">Expired {{ fmtDate(g.expiresAt) }}</p>
            <button
              v-if="g.active"
              class="text-[10px] font-semibold text-red-400 hover:text-red-600 transition-colors mt-1"
              :disabled="revoking === g.id"
              @click="revoke(g)"
            >
              {{ revoking === g.id ? 'Revoking…' : 'Revoke' }}
            </button>
          </div>
        </div>

        <!-- Scopes -->
        <div class="px-4 pb-3.5 flex flex-wrap gap-1">
          <span
            v-for="scope in g.scopes"
            :key="scope"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            :class="scopeColor(scope)"
          >{{ scope }}</span>
        </div>

        <!-- AT DID row -->
        <div v-if="g.atDid" class="px-4 pb-3 flex items-center gap-1.5">
          <span class="text-[9px] font-semibold bg-sky-50 text-sky-500 px-1.5 py-0.5 rounded">DID</span>
          <span class="text-[10px] text-gray-400 font-mono">{{ g.atDid }}</span>
        </div>
      </div>

      <p v-if="filtered.length === 0" class="text-center text-gray-400 text-[12px] py-12">
        No applications match the current filter.
      </p>
    </div>
  </div>

  <!-- ── New API Token modal ─────────────────────────────────────────────────── -->
  <Transition name="fade">
    <div v-if="newTokenModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" @click.self="newTokenModal = false">
      <div class="bg-white rounded-3xl shadow-2xl w-[400px] p-6 mx-4">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-[14px] font-semibold text-gray-800">Create API Token</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="newTokenModal = false">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="space-y-4">
          <label class="flex flex-col gap-1">
            <span class="text-[11px] font-medium text-gray-500">Token name</span>
            <input v-model="newTokenName" type="text" placeholder="e.g. Backup script" class="rounded-xl border border-gray-200 px-3 py-2 text-[12px] outline-none focus:border-[rgb(99,100,246)]"/>
          </label>
          <div>
            <p class="text-[11px] font-medium text-gray-500 mb-2">Scopes</p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="s in AVAILABLE_SCOPES" :key="s"
                class="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors text-left"
                :class="newTokenScopes.includes(s) ? 'border-[rgb(99,100,246)] bg-[rgba(99,100,246,0.08)] text-[rgb(80,81,220)]' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'"
                @click="toggleScope(s)"
              >{{ s }}</button>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button class="flex-1 text-[12px] font-semibold bg-gray-50 text-gray-600 py-2 rounded-xl hover:bg-gray-100 transition-colors" @click="newTokenModal = false">Cancel</button>
            <button
              class="flex-1 text-[12px] font-semibold bg-[rgb(99,100,246)] text-white py-2 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors disabled:opacity-50"
              :disabled="!newTokenName.trim() || newTokenScopes.length === 0"
              @click="createToken"
            >Create Token</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
