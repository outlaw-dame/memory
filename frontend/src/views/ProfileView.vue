<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/i18n'
import { useWallStore, type WallPost } from '@/stores/wallStore'
import AppIcon from '@/components/AppIcon.vue'
import WallComposer from '@/components/WallComposer.vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { treaty } from '@elysiajs/eden'

const authStore = useAuthStore()
const wallStore = useWallStore()
const router = useRouter()
const { t } = useI18n()

const client = treaty(getApiBaseUrl(), {
  onRequest() {
    return { headers: buildApiHeaders({ authToken: authStore.token || undefined }) }
  }
}) as any // eslint-disable-line @typescript-eslint/no-explicit-any

interface OwnPost {
  id: number
  content: string
  hashtags: string[]
  postType: string
  createdAt: string | null
  objectUri: string | null
  name: string | null
  summary: string | null
}

const ownPosts = ref<OwnPost[]>([])
const isLoadingPosts = ref(false)
const postsError = ref<string | null>(null)

type Tab = 'posts' | 'wall'
const activeTab = ref<Tab>('wall')

function goToSettings() {
  router.push({ name: 'settings' })
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

async function loadOwnPosts() {
  if (!authStore.user?.webId) return
  isLoadingPosts.value = true
  postsError.value = null
  try {
    const encoded = encodeURIComponent(authStore.user.webId)
    const { data, status } = await client.wall[encoded].posts.get({ query: { limit: 20, offset: 0 } })
    if (status === 200 && data) {
      ownPosts.value = (data as { posts: OwnPost[] }).posts
    } else {
      postsError.value = t('wall.errors.loadFailed')
    }
  } catch {
    postsError.value = t('wall.errors.loadFailed')
  } finally {
    isLoadingPosts.value = false
  }
}

onMounted(async () => {
  if (authStore.user?.webId) {
    await Promise.all([
      loadOwnPosts(),
      wallStore.fetchWallPosts(authStore.user.webId),
    ])
  }
})
</script>

<template>
  <div class="own-profile">
    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="own-profile__header">
      <div class="own-profile__avatar-wrap">
        <div class="own-profile__avatar" aria-hidden="true">
          {{ authStore.user?.name ? initials(authStore.user.name) : '?' }}
        </div>
      </div>

      <div class="text-center">
        <p class="text-lg font-semibold leading-tight">{{ authStore.user?.name || '—' }}</p>
        <p class="mt-1 text-sm text-dark-50 break-all">{{ authStore.user?.webId || '' }}</p>
      </div>

      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[rgba(55,55,55,0.12)]"
        @click="goToSettings"
      >
        {{ t('settings.title') }}
        <AppIcon name="chevron-right" :size="16" color="rgba(55,55,55,0.4)" />
      </button>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────── -->
    <div class="own-profile__tabs" role="tablist">
      <button
        role="tab"
        :aria-selected="activeTab === 'posts'"
        class="own-profile__tab"
        :class="{ 'own-profile__tab--active': activeTab === 'posts' }"
        @click="activeTab = 'posts'"
      >
        {{ t('profile.posts') }}
      </button>
      <button
        role="tab"
        :aria-selected="activeTab === 'wall'"
        class="own-profile__tab"
        :class="{ 'own-profile__tab--active': activeTab === 'wall' }"
        @click="activeTab = 'wall'"
      >
        {{ t('profile.wall') }}
        <span v-if="wallStore.wallPosts.length > 0" class="own-profile__tab-badge">
          {{ wallStore.wallPosts.length }}
        </span>
      </button>
    </div>

    <!-- ── Posts panel ────────────────────────────────────────────────── -->
    <div v-show="activeTab === 'posts'" class="own-profile__panel" role="tabpanel">
      <div v-if="isLoadingPosts" class="own-profile__empty">
        {{ t('common.states.loading') }}
      </div>
      <div v-else-if="postsError" class="own-profile__error">
        {{ postsError }}
      </div>
      <p v-else-if="ownPosts.length === 0" class="own-profile__empty">
        {{ t('profile.postsEmpty') }}
      </p>
      <ul v-else class="own-profile__wall-list">
        <li
          v-for="post in ownPosts"
          :key="post.id"
          class="own-profile__wall-item"
        >
          <div class="own-profile__wall-item-header">
            <div class="own-profile__wall-item-avatar" aria-hidden="true">
              {{ authStore.user?.name ? initials(authStore.user.name) : '?' }}
            </div>
            <div class="own-profile__wall-item-meta">
              <span
                v-if="post.postType === 'article'"
                class="own-profile__wall-item-badge"
              >{{ t('feed.article.badge') }}</span>
              <time class="own-profile__wall-item-date" :datetime="post.createdAt ?? undefined">
                {{ formatDate(post.createdAt) }}
              </time>
            </div>
          </div>
          <h2 v-if="post.name" class="own-profile__wall-item-title">{{ post.name }}</h2>
          <p class="own-profile__wall-item-content">{{ post.content }}</p>
        </li>
      </ul>
    </div>

    <!-- ── Wall panel ─────────────────────────────────────── -->
    <div v-show="activeTab === 'wall'" class="own-profile__panel" role="tabpanel">
      <!-- Own wall composer -->
      <WallComposer
        v-if="authStore.user"
        :target-web-id="authStore.user.webId"
        :target-name="authStore.user.name"
        :is-own-wall="true"
        class="own-profile__composer"
      />

      <div v-if="wallStore.isLoading" class="own-profile__empty">
        {{ t('common.states.loading') }}
      </div>
      <p v-else-if="wallStore.wallPosts.length === 0" class="own-profile__empty">
        {{ t('wall.emptyOwn') }}
      </p>
      <ul v-else class="own-profile__wall-list">
        <li
          v-for="post in (wallStore.wallPosts as WallPost[])"
          :key="post.id"
          class="own-profile__wall-item"
        >
          <div class="own-profile__wall-item-header">
            <div class="own-profile__wall-item-avatar" aria-hidden="true">
              {{ initials(post.author.name) }}
            </div>
            <div class="own-profile__wall-item-meta">
              <span class="own-profile__wall-item-author">{{ post.author.name }}</span>
              <time class="own-profile__wall-item-date" :datetime="post.createdAt ?? undefined">
                {{ formatDate(post.createdAt) }}
              </time>
            </div>
            <!-- Wall owner can always delete -->
            <button
              type="button"
              class="own-profile__wall-item-delete"
              :aria-label="t('wall.deletePost')"
              @click="wallStore.deleteWallPost(post.id)"
            >
              <AppIcon name="trash" :size="16" />
            </button>
          </div>
          <p class="own-profile__wall-item-content">{{ post.content }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.own-profile {
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: 4rem;
}

.own-profile__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1.25rem 1.5rem;
}

.own-profile__avatar-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: var(--color-accent, #6366f1);
  opacity: 0.12;
  position: relative;
}

.own-profile__avatar {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
  color: var(--color-accent, #6366f1);
  opacity: 1;
}

/* ─── Tabs ───────────────────────────────────────────────── */
.own-profile__tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  padding: 0 1.25rem;
}

.own-profile__tab {
  position: relative;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted, #6b7280);
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: color 0.15s;
}

.own-profile__tab::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  background: transparent;
  transition: background 0.15s;
}

.own-profile__tab--active {
  color: var(--color-primary, #6366f1);
  font-weight: 600;
}

.own-profile__tab--active::after {
  background: var(--color-primary, #6366f1);
}

.own-profile__tab-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  background: var(--color-primary, #6366f1);
  color: #fff;
  border-radius: 9999px;
  padding: 0.0625rem 0.375rem;
}

/* ─── Panels ─────────────────────────────────────────────── */
.own-profile__panel {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.own-profile__empty {
  text-align: center;
  color: var(--color-text-muted, #6b7280);
  padding: 2rem 1rem;
  font-size: 0.875rem;
}

.own-profile__composer {
  margin-bottom: 0.5rem;
}

/* ─── Wall posts ─────────────────────────────────────────── */
.own-profile__wall-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.own-profile__wall-item {
  padding: 0.875rem 1rem;
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
}

.own-profile__wall-item-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.own-profile__wall-item-avatar {
  flex-shrink: 0;
  width: 1.875rem;
  height: 1.875rem;
  border-radius: 50%;
  background: var(--color-secondary, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.6875rem;
  user-select: none;
}

.own-profile__wall-item-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
}

.own-profile__wall-item-author {
  font-size: 0.8125rem;
  font-weight: 600;
}

.own-profile__wall-item-date {
  font-size: 0.6875rem;
  color: var(--color-text-muted, #6b7280);
}

.own-profile__wall-item-delete {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted, #6b7280);
  padding: 0.25rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.own-profile__wall-item-delete:hover {
  color: var(--color-danger, #ef4444);
}

.own-profile__wall-item-content {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
  word-break: break-word;
}

.own-profile__wall-item-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--color-text, #111827);
}

.own-profile__wall-item-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: color-mix(in srgb, var(--color-primary, #6366f1) 10%, transparent);
  color: var(--color-primary, #6366f1);
  border-radius: 0.25rem;
  padding: 0.0625rem 0.375rem;
  margin-right: 0.25rem;
}

.own-profile__error {
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, #ef4444 8%, transparent);
  color: #b91c1c;
  border-radius: 0.75rem;
  font-size: 0.875rem;
}
</style>
