<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/authStore'
import { useWallStore, type WallPost } from '@/stores/wallStore'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { treaty } from '@elysiajs/eden'
import WallComposer from '@/components/WallComposer.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppSegmentedControl from '@/design/components/AppSegmentedControl.vue'
import type { SegmentItem } from '@/design/components/AppSegmentedControl.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const wallStore = useWallStore()

const client = treaty(getApiBaseUrl(), {
  onRequest() {
    return { headers: buildApiHeaders({ authToken: authStore.token || undefined }) }
  }
}) as any // eslint-disable-line @typescript-eslint/no-explicit-any

type Tab = 'posts' | 'wall'
const activeTab = ref<Tab>('posts')

const tabs = computed<SegmentItem<Tab>[]>(() => [
  { value: 'posts', label: t('profile.posts') },
  { value: 'wall',  label: t('profile.wall') },
])

interface UserPost {
  id: number
  content: string
  hashtags: string[]
  postType: string
  createdAt: string | null
  objectUri: string | null
  name: string | null
  summary: string | null
  author: { id: number; name: string; webId: string }
}

const userPosts = ref<UserPost[]>([])
const isLoadingPosts = ref(false)
const postsError = ref<string | null>(null)

const profileUser = computed(() => wallStore.targetUser)
const isOwnProfile = computed(() =>
  authStore.user?.webId != null &&
  profileUser.value?.webId != null &&
  authStore.user.webId === profileUser.value.webId
)

function decodeWebId(raw: string): string {
  try { return decodeURIComponent(raw) } catch { return raw }
}

const targetWebId = computed(() => decodeWebId(String(route.params.webId ?? '')))

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

async function loadUserPosts() {
  if (!targetWebId.value) return
  isLoadingPosts.value = true
  postsError.value = null
  try {
    const encoded = encodeURIComponent(targetWebId.value)
    const { data, status } = await client.wall[encoded].posts.get({ query: { limit: 20, offset: 0 } })
    if (status === 200 && data) {
      userPosts.value = (data as { posts: UserPost[] }).posts
    } else {
      postsError.value = t('wall.errors.loadFailed')
    }
  } catch {
    postsError.value = t('wall.errors.loadFailed')
  } finally {
    isLoadingPosts.value = false
  }
}

async function loadAll() {
  if (!targetWebId.value) return
  await Promise.all([loadUserPosts(), wallStore.fetchWallPosts(targetWebId.value)])
}

onMounted(loadAll)
watch(() => route.params.webId, loadAll)

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="pb-20">
    <!-- Not-found state -->
    <div v-if="wallStore.error === 'wall.errors.notFound'" class="py-12 text-center text-sm text-label-secondary">
      {{ t('profile.notFound') }}
    </div>

    <template v-else>
      <!-- ── Profile header ──────────────────────────────────────────────────── -->
      <div class="flex items-center gap-4 px-(--padding-main) py-6">
        <div
          class="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center font-bold text-lg shrink-0 select-none"
          aria-hidden="true"
        >
          {{ profileUser ? initials(profileUser.name) : '?' }}
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-base font-bold text-label">{{ profileUser?.name ?? '—' }}</h1>
          <p class="text-xs text-label-secondary break-all mt-0.5">{{ profileUser?.webId ?? targetWebId }}</p>
        </div>
        <div class="shrink-0">
          <template v-if="isOwnProfile">
            <button
              type="button"
              class="bg-fill text-label text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-opacity hover:opacity-75"
              @click="router.push({ name: 'settings' })"
            >
              {{ t('profile.settings') }}
            </button>
          </template>
          <template v-else-if="authStore.isLoggedIn">
            <button
              type="button"
              class="bg-accent text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-opacity hover:opacity-85"
            >
              {{ t('profile.follow') }}
            </button>
          </template>
        </div>
      </div>

      <!-- ── Segmented tab control ───────────────────────────────────────────── -->
      <AppSegmentedControl
        :items="tabs"
        :model-value="activeTab"
        class="mx-(--padding-main) mb-4"
        @update:model-value="activeTab = $event"
      />

      <!-- ── Posts tab ──────────────────────────────────────────────────────── -->
      <div v-show="activeTab === 'posts'" role="tabpanel" class="flex flex-col gap-3 px-(--padding-main)">
        <div v-if="isLoadingPosts" class="py-8 text-center text-sm text-label-secondary">
          {{ t('common.states.loading') }}
        </div>
        <div v-else-if="postsError" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {{ postsError }}
        </div>
        <p v-else-if="userPosts.length === 0" class="py-8 text-center text-sm text-label-secondary">
          {{ t('profile.postsEmpty') }}
        </p>
        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="post in userPosts"
            :key="post.id"
            class="rounded-xl bg-surface border border-separator p-4"
          >
            <div class="flex items-center gap-2 mb-1">
              <span
                v-if="post.postType === 'article'"
                class="text-[11px] font-bold uppercase tracking-wide bg-accent/10 text-accent rounded px-1.5 py-0.5"
              >
                {{ t('feed.article.badge') }}
              </span>
              <time class="text-xs text-label-tertiary" :datetime="post.createdAt ?? undefined">
                {{ formatDate(post.createdAt) }}
              </time>
            </div>
            <h2 v-if="post.name" class="text-sm font-semibold text-label mb-1">{{ post.name }}</h2>
            <p class="text-sm text-label leading-relaxed line-clamp-4">{{ post.content }}</p>
          </li>
        </ul>
      </div>

      <!-- ── Wall tab ───────────────────────────────────────────────────────── -->
      <div v-show="activeTab === 'wall'" role="tabpanel" class="flex flex-col gap-3 px-(--padding-main)">
        <WallComposer
          v-if="authStore.isLoggedIn && !isOwnProfile && profileUser"
          :target-web-id="profileUser.webId"
          :target-name="profileUser.name"
          class="mb-1"
          @posted="() => wallStore.fetchWallPosts(targetWebId)"
        />

        <div v-if="wallStore.isLoading" class="py-8 text-center text-sm text-label-secondary">
          {{ t('common.states.loading') }}
        </div>
        <div
          v-else-if="wallStore.error && wallStore.error !== 'wall.errors.notFound'"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {{ t(wallStore.error as any) }}
        </div>
        <p v-else-if="wallStore.wallPosts.length === 0 && !wallStore.isLoading" class="py-8 text-center text-sm text-label-secondary">
          {{ t('wall.empty') }}
        </p>
        <ul v-else class="flex flex-col gap-3">
          <li
            v-for="post in (wallStore.wallPosts as WallPost[])"
            :key="post.id"
            class="rounded-xl bg-surface border border-separator p-4"
          >
            <div class="flex items-center gap-2.5 mb-3">
              <div
                class="w-8 h-8 rounded-full bg-accent/80 text-white flex items-center justify-center font-bold text-xs shrink-0 select-none"
                aria-hidden="true"
              >
                {{ initials(post.author.name) }}
              </div>
              <div class="flex-1 min-w-0">
                <span class="text-sm font-semibold text-label truncate block">{{ post.author.name }}</span>
                <time class="text-xs text-label-tertiary" :datetime="post.createdAt ?? undefined">
                  {{ formatDate(post.createdAt) }}
                </time>
              </div>
              <button
                v-if="authStore.isLoggedIn && (authStore.user?.webId === post.author.webId || isOwnProfile)"
                type="button"
                class="text-label-tertiary hover:text-red-500 transition-colors p-1 rounded-md shrink-0"
                :aria-label="t('wall.deletePost')"
                @click="wallStore.deleteWallPost(post.id)"
              >
                <AppIcon name="trash" :size="16" />
              </button>
            </div>
            <p class="text-sm text-label leading-relaxed wrap-break-word">{{ post.content }}</p>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
