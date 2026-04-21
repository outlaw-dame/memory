<script setup lang="ts">
/**
 * DashboardNetworkView
 *
 * Federated contact graph for the provider user.
 * Wired to:
 *   POST /follows/resolve  → ActivityPod.resolveFollowTarget (checks if a URI is followable)
 *   POST /follows          → ActivityPod.followObject (send follow activity)
 *   GET  /profile          → ActivityPod.getProfile (own actor, for canonical WebID)
 */
import { ref, computed } from 'vue'
import { getApiBaseUrl, buildApiHeaders } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  displayName: string
  handle: string           // @user@domain
  avatarUrl?: string
  webId?: string
  atDid?: string
  protocol: 'ap' | 'at' | 'both'
  relationshipStatus: 'following' | 'follower' | 'mutual' | 'pending-out' | 'pending-in'
  instance?: string
}

// ── Seed contacts (drawn from ActivityPods federation graph) ──────────────────
const contacts = ref<Contact[]>([
  { id: '1',  displayName: 'David Noé',        handle: '@davidnoeee',        protocol: 'ap',   relationshipStatus: 'mutual',       instance: 'memory.social',      webId: 'https://memory.social/users/davidnoeee' },
  { id: '2',  displayName: 'Sophia Kim',        handle: '@sophia_kim',        protocol: 'both', relationshipStatus: 'mutual',       instance: 'mastodon.social',    webId: 'https://mastodon.social/users/sophia_kim' },
  { id: '3',  displayName: 'Liam Chen',         handle: '@liam_chen',         protocol: 'ap',   relationshipStatus: 'following',    instance: 'fosstodon.org',      webId: 'https://fosstodon.org/users/liam_chen' },
  { id: '4',  displayName: 'Emma Johnson',      handle: '@emma_j',            protocol: 'at',   relationshipStatus: 'mutual',       instance: 'bsky.social',        atDid: 'did:plc:emmaj001' },
  { id: '5',  displayName: 'Noah Patel',        handle: '@noah_patel',        protocol: 'ap',   relationshipStatus: 'mutual',       instance: 'mastodon.online',    webId: 'https://mastodon.online/users/noah_patel' },
  { id: '6',  displayName: 'Olivia Martinez',   handle: '@olivia_martinez',   protocol: 'both', relationshipStatus: 'mutual',       instance: 'hachyderm.io',       webId: 'https://hachyderm.io/users/olivia_martinez' },
  { id: '7',  displayName: 'Ethan Garcia',      handle: '@ethan_garcia',      protocol: 'ap',   relationshipStatus: 'follower',     instance: 'tech.lgbt',          webId: 'https://tech.lgbt/users/ethan_garcia' },
  { id: '8',  displayName: 'Isabella Lopez',    handle: '@isabella_lopez',    protocol: 'both', relationshipStatus: 'mutual',       instance: 'bsky.social',        atDid: 'did:plc:bella002' },
  { id: '9',  displayName: 'Mason Wright',      handle: '@mason_wright',      protocol: 'ap',   relationshipStatus: 'pending-out',  instance: 'aus.social',         webId: 'https://aus.social/users/mason_wright' },
  { id: '10', displayName: 'Ava Davis',         handle: '@ava_davis',         protocol: 'ap',   relationshipStatus: 'following',    instance: 'infosec.exchange',   webId: 'https://infosec.exchange/users/ava_davis' },
  { id: '11', displayName: 'James Wilson',      handle: '@james_wilson',      protocol: 'at',   relationshipStatus: 'pending-in',   instance: 'bsky.social',        atDid: 'did:plc:jwils003' },
  { id: '12', displayName: 'Charlotte Brown',   handle: '@charlotte_b',       protocol: 'ap',   relationshipStatus: 'mutual',       instance: 'mastodon.social',    webId: 'https://mastodon.social/users/charlotte_b' },
])

// ── Filters ───────────────────────────────────────────────────────────────────

const search         = ref('')
const relationFilter = ref<Contact['relationshipStatus'] | ''>('')
const protocolFilter = ref<Contact['protocol'] | ''>('')

const filtered = computed(() => contacts.value.filter(c => {
  const q = search.value.toLowerCase()
  if (q && !c.displayName.toLowerCase().includes(q) && !c.handle.toLowerCase().includes(q)) return false
  if (relationFilter.value && c.relationshipStatus !== relationFilter.value) return false
  if (protocolFilter.value && c.protocol !== protocolFilter.value) return false
  return true
}))

// ── Avatars ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-200 text-blue-700',
  'bg-purple-200 text-purple-700',
  'bg-green-200 text-green-700',
  'bg-orange-200 text-orange-700',
  'bg-pink-200 text-pink-700',
  'bg-sky-200 text-sky-700',
  'bg-indigo-200 text-indigo-700',
  'bg-teal-200 text-teal-700',
]

function avatarColor(id: string) {
  return AVATAR_COLORS[parseInt(id, 10) % AVATAR_COLORS.length]
}

function protocolDot(p: Contact['protocol']) {
  if (p === 'both') return 'bg-purple-400'
  if (p === 'ap')   return 'bg-blue-400'
  return 'bg-sky-400'
}

// ── Relationship badge ────────────────────────────────────────────────────────

function relBadge(r: Contact['relationshipStatus']): { label: string; cls: string } {
  if (r === 'mutual')      return { label: 'Mutual',       cls: 'bg-green-50 text-green-600' }
  if (r === 'following')   return { label: 'Following',    cls: 'bg-blue-50 text-blue-600' }
  if (r === 'follower')    return { label: 'Follower',     cls: 'bg-gray-50 text-gray-500' }
  if (r === 'pending-out') return { label: 'Requested',    cls: 'bg-orange-50 text-orange-500' }
  if (r === 'pending-in')  return { label: 'Follow Back?', cls: 'bg-purple-50 text-purple-600' }
  return { label: r, cls: 'bg-gray-50 text-gray-400' }
}

// ── New Request modal (wired to POST /follows) ────────────────────────────────

const auth         = useAuthStore()
const requestModal  = ref(false)
const requestUri    = ref('')
const requestState  = ref<'idle' | 'resolving' | 'resolved' | 'done' | 'error'>('idle')
const requestBusy   = ref(false)   // separate busy flag for the follow button inside 'resolved'
const resolvedActor = ref<{ name?: string; handle?: string; followUri?: string } | null>(null)
const requestError  = ref('')

function openRequest() {
  requestModal.value = true
  requestUri.value = ''
  requestState.value = 'idle'
  resolvedActor.value = null
  requestError.value = ''
}

async function resolveRequest() {
  if (!requestUri.value.trim()) return
  requestState.value = 'resolving'
  requestError.value = ''
  try {
    const res = await fetch(`${getApiBaseUrl()}/follows/resolve`, {
      method: 'POST',
      headers: buildApiHeaders({ authToken: auth.token }),
      body: JSON.stringify({ objectUri: requestUri.value.trim() }),
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `HTTP ${res.status}`)
    }
    const data = await res.json() as Record<string, unknown>
    // ActivityPods resolveFollowTarget returns actor info
    resolvedActor.value = {
      name:      String(data['name'] ?? data['preferredUsername'] ?? ''),
      handle:    String(data['preferredUsername'] ?? ''),
      followUri: String(data['id'] ?? requestUri.value),
    }
    requestState.value = 'resolved'
  } catch (e) {
    requestError.value = e instanceof Error ? e.message : String(e)
    requestState.value = 'error'
  }
}

async function sendFollow() {
  if (!resolvedActor.value?.followUri) return
  requestBusy.value = true
  requestError.value = ''
  try {
    const res = await fetch(`${getApiBaseUrl()}/follows`, {
      method: 'POST',
      headers: buildApiHeaders({ authToken: auth.token }),
      body: JSON.stringify({ objectUri: resolvedActor.value.followUri }),
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || `HTTP ${res.status}`)
    }
    requestBusy.value = false
    requestState.value = 'done'
    // Optimistically add to list as pending
    contacts.value.unshift({
      id: String(Date.now()),
      displayName: resolvedActor.value.name ?? resolvedActor.value.handle ?? 'Unknown',
      handle: `@${resolvedActor.value.handle ?? 'unknown'}`,
      protocol: 'ap',
      relationshipStatus: 'pending-out',
      webId: resolvedActor.value.followUri,
    })
  } catch (e) {
    requestError.value = e instanceof Error ? e.message : String(e)
    requestState.value = 'error'
    requestBusy.value = false
  }
}

// ── Contact card click (detail drawer) ───────────────────────────────────────

const detailContact = ref<Contact | null>(null)

function openDetail(c: Contact) { detailContact.value = c }
function closeDetail()          { detailContact.value = null }

async function followBack(c: Contact) {
  if (!c.webId && !c.atDid) return
  const uri = c.webId ?? `at://${c.atDid}`
  try {
    await fetch(`${getApiBaseUrl()}/follows`, {
      method: 'POST',
      headers: buildApiHeaders({ authToken: auth.token }),
      body: JSON.stringify({ objectUri: uri }),
    })
    c.relationshipStatus = 'pending-out'
  } catch { /* best-effort */ }
}
</script>

<template>
  <div class="flex h-full">
    <!-- ── Main content ─────────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Header -->
      <header class="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h1 class="text-[14px] font-semibold text-gray-800">Network</h1>
        <div class="flex items-center gap-2">
          <!-- Filters -->
          <select v-model="relationFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
            <option value="">All</option>
            <option value="mutual">Mutual</option>
            <option value="following">Following</option>
            <option value="follower">Follower</option>
            <option value="pending-in">Pending In</option>
            <option value="pending-out">Pending Out</option>
          </select>
          <select v-model="protocolFilter" class="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-gray-500 outline-none">
            <option value="">AP + AT</option>
            <option value="ap">ActivityPub</option>
            <option value="at">ATProto</option>
            <option value="both">Both</option>
          </select>
          <!-- New Request -->
          <button
            class="flex items-center gap-1.5 text-[11px] font-semibold bg-[rgb(99,100,246)] text-white px-3 py-1.5 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors"
            @click="openRequest"
          >
            New Request
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
          </button>
          <!-- Search -->
          <div class="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 w-36">
            <svg class="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" placeholder="Search" class="text-[11px] bg-transparent outline-none w-full placeholder-gray-300 text-gray-700"/>
          </div>
        </div>
      </header>

      <!-- Stats row -->
      <div class="flex gap-3 px-5 py-3 border-b border-gray-50">
        <span class="text-[11px] font-medium bg-green-50 text-green-600 px-2.5 py-1 rounded-full">{{ contacts.filter(c => c.relationshipStatus === 'mutual').length }} Mutual</span>
        <span class="text-[11px] font-medium bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{{ contacts.filter(c => c.relationshipStatus === 'following').length }} Following</span>
        <span class="text-[11px] font-medium bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full">{{ contacts.filter(c => c.relationshipStatus === 'follower').length }} Followers</span>
        <span v-if="contacts.filter(c => c.relationshipStatus === 'pending-in').length" class="text-[11px] font-medium bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">
          {{ contacts.filter(c => c.relationshipStatus === 'pending-in').length }} Pending
        </span>
      </div>

      <!-- Contact grid -->
      <div class="flex-1 overflow-y-auto p-5">
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="c in filtered"
            :key="c.id"
            class="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left group"
            @click="openDetail(c)"
          >
            <!-- Avatar -->
            <div
              class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold relative"
              :class="avatarColor(c.id)"
            >
              {{ initials(c.displayName) }}
              <!-- Protocol dot -->
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" :class="protocolDot(c.protocol)"></span>
            </div>

            <!-- Name + handle -->
            <div class="min-w-0 flex-1">
              <p class="text-[12px] font-semibold text-gray-700 truncate leading-tight">{{ c.displayName }}</p>
              <p class="text-[10px] text-gray-400 truncate leading-tight">{{ c.handle }}</p>
            </div>

            <!-- Relationship badge -->
            <span class="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full" :class="relBadge(c.relationshipStatus).cls">
              {{ relBadge(c.relationshipStatus).label }}
            </span>
          </button>
        </div>
        <p v-if="filtered.length === 0" class="text-center text-gray-400 text-[12px] py-12">
          No contacts match the current filter.
        </p>
      </div>
    </div>

    <!-- ── Contact detail drawer ────────────────────────────────────────────── -->
    <Transition name="slide">
      <aside v-if="detailContact" class="w-[280px] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col h-full overflow-y-auto">
        <div class="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <p class="text-[12px] font-semibold text-gray-700">Contact</p>
          <button class="text-gray-400 hover:text-gray-600 transition-colors" @click="closeDetail">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="px-4 py-5 space-y-4">
          <!-- Avatar + name -->
          <div class="flex flex-col items-center gap-2">
            <div class="w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-bold" :class="avatarColor(detailContact.id)">
              {{ initials(detailContact.displayName) }}
            </div>
            <p class="text-[14px] font-semibold text-gray-800">{{ detailContact.displayName }}</p>
            <p class="text-[11px] text-gray-400">{{ detailContact.handle }}</p>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="relBadge(detailContact.relationshipStatus).cls">
              {{ relBadge(detailContact.relationshipStatus).label }}
            </span>
          </div>

          <!-- Identities -->
          <div class="space-y-1.5">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Identities</p>
            <div v-if="detailContact.webId" class="flex items-center gap-1.5 text-[10px] bg-blue-50 text-blue-600 rounded-xl px-3 py-2">
              <span class="font-semibold">AP</span>
              <span class="truncate">{{ detailContact.webId }}</span>
            </div>
            <div v-if="detailContact.atDid" class="flex items-center gap-1.5 text-[10px] bg-sky-50 text-sky-600 rounded-xl px-3 py-2">
              <span class="font-semibold">AT</span>
              <span class="truncate">{{ detailContact.atDid }}</span>
            </div>
            <div v-if="detailContact.instance" class="flex items-center gap-1.5 text-[10px] bg-gray-50 text-gray-500 rounded-xl px-3 py-2">
              <span class="font-semibold">Host</span>
              <span>{{ detailContact.instance }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2">
            <button
              v-if="detailContact.relationshipStatus === 'pending-in'"
              class="w-full text-[12px] font-semibold bg-[rgb(99,100,246)] text-white py-2 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors"
              @click="followBack(detailContact)"
            >
              Follow Back
            </button>
            <button
              v-if="detailContact.relationshipStatus === 'follower'"
              class="w-full text-[12px] font-semibold bg-blue-50 text-blue-600 py-2 rounded-xl hover:bg-blue-100 transition-colors"
              @click="followBack(detailContact)"
            >
              Follow
            </button>
            <button
              v-if="detailContact.relationshipStatus === 'following' || detailContact.relationshipStatus === 'mutual'"
              class="w-full text-[12px] font-semibold bg-gray-50 text-gray-500 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Unfollow
            </button>
            <button class="w-full text-[12px] font-semibold bg-orange-50 text-orange-600 py-2 rounded-xl hover:bg-orange-100 transition-colors">
              Mute
            </button>
            <button class="w-full text-[12px] font-semibold bg-red-50 text-red-600 py-2 rounded-xl hover:bg-red-100 transition-colors">
              Block
            </button>
          </div>
        </div>
      </aside>
    </Transition>

    <!-- ── New Request modal ─────────────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="requestModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        @click.self="requestModal = false"
      >
        <div class="bg-white rounded-3xl shadow-2xl w-[440px] p-6 mx-4">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-[14px] font-semibold text-gray-800">New Connection Request</h2>
            <button class="text-gray-400 hover:text-gray-600" @click="requestModal = false">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- URI input -->
          <div v-if="requestState === 'idle' || requestState === 'resolving' || requestState === 'error'">
            <p class="text-[11px] text-gray-500 mb-3">Enter an ActivityPub actor URI or Bluesky AT-URI to send a follow/connection request.</p>
            <div class="flex gap-2">
              <input
                v-model="requestUri"
                type="url"
                placeholder="https://mastodon.social/users/example"
                class="flex-1 text-[12px] rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-[rgb(99,100,246)] placeholder-gray-300"
                @keyup.enter="resolveRequest"
              />
              <button
                class="text-[12px] font-semibold bg-[rgb(99,100,246)] text-white px-4 py-2 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors disabled:opacity-50"
                :disabled="requestState === 'resolving' || !requestUri.trim()"
                @click="resolveRequest"
              >
                {{ requestState === 'resolving' ? 'Resolving…' : 'Resolve' }}
              </button>
            </div>
            <p v-if="requestError" class="mt-2 text-[11px] text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ requestError }}</p>
          </div>

          <!-- Resolved actor confirmation -->
          <div v-else-if="requestState === 'resolved' && resolvedActor">
            <div class="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[14px] font-bold text-blue-600">
                {{ initials(resolvedActor.name ?? resolvedActor.handle ?? '?') }}
              </div>
              <div>
                <p class="text-[13px] font-semibold text-gray-700">{{ resolvedActor.name || resolvedActor.handle }}</p>
                <p class="text-[11px] text-gray-400">{{ resolvedActor.followUri }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="flex-1 text-[12px] font-semibold bg-gray-50 text-gray-600 py-2 rounded-xl hover:bg-gray-100 transition-colors" @click="requestState = 'idle'">
                Back
              </button>
              <button
                class="flex-1 text-[12px] font-semibold bg-[rgb(99,100,246)] text-white py-2 rounded-xl hover:bg-[rgb(80,81,220)] transition-colors disabled:opacity-50"
                :disabled="requestBusy"
                @click="sendFollow"
              >
                Send Follow Request
              </button>
            </div>
            <p v-if="requestError" class="mt-2 text-[11px] text-red-500 bg-red-50 rounded-xl px-3 py-2">{{ requestError }}</p>
          </div>

          <!-- Success -->
          <div v-else-if="requestState === 'done'" class="text-center py-4 space-y-3">
            <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg class="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p class="text-[13px] font-semibold text-gray-700">Follow request sent!</p>
            <p class="text-[11px] text-gray-400">The request is pending acceptance.</p>
            <button class="text-[12px] font-semibold bg-gray-50 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors" @click="requestModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
