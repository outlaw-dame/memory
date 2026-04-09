<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { getSessionPolicyConfig, isOperatorDiagnosticsEnabled } from '@/utils/sessionPolicy'

const notificationsStore = useNotificationsStore()
const sessionPolicy = getSessionPolicyConfig()

onMounted(async () => {
  try {
    await notificationsStore.initialize()
  } catch (error) {
    console.error('[NotificationsView] initialization failed:', error)
  }
})

const emptyMessage = computed(() => {
  if (!notificationsStore.status?.installed) {
    return 'Authorize Memory on your pod to start receiving inbox notifications.'
  }
  if (!notificationsStore.status?.hasInboxWebhook) {
    if (notificationsStore.status?.upgradeNeeded) {
      return 'Memory needs an authorization update before inbox notifications can be activated.'
    }
    return 'Memory is authorized but the inbox webhook is not active yet.'
  }
  if (notificationsStore.deferPodReauth) {
    return 'Using current trusted browser session. Re-authorization will be requested later if still required.'
  }
  return 'No notifications have been delivered yet.'
})

const showOperatorDiagnostics = computed(() => {
  if (!isOperatorDiagnosticsEnabled()) return false
  return !!notificationsStore.status?.expectedFrontendPolicy
})

function formatWhen(value: string | null) {
  if (!value) return 'Pending timestamp'
  return new Date(value).toLocaleString()
}

function getNotificationLabel(type: string) {
  switch (type) {
    case 'Add':
      return 'New inbox item'
    case 'Create':
      return 'New activity'
    case 'Update':
      return 'Updated activity'
    case 'Delete':
      return 'Deleted activity'
    default:
      return type
  }
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-[560px] flex-col gap-4 pb-24">
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[14px] uppercase tracking-[0.2em] text-dark/40">ActivityPods</p>
        <h1 class="font-[Butler] text-[42px] leading-none text-dark">notifications.</h1>
      </div>
      <button
        v-if="notificationsStore.status && !notificationsStore.deferPodReauth && (!notificationsStore.status.installed || (!notificationsStore.status.hasInboxWebhook && notificationsStore.status.upgradeNeeded))"
        type="button"
        class="rounded-full bg-dark px-4 py-2 text-sm font-medium text-white"
        @click="notificationsStore.beginAuthorization()"
      >
        {{ notificationsStore.status.upgradeNeeded ? 'Update access' : 'Enable' }}
      </button>
    </header>

    <div v-if="notificationsStore.error" class="rounded-[28px] border border-[#f0b3b3] bg-[#fff1f1] px-5 py-4 text-[#8d2f2f]">
      {{ notificationsStore.error }}
    </div>

    <div v-if="notificationsStore.status" class="rounded-[28px] bg-pastel-light px-5 py-5 text-dark">
      <p class="text-[14px] uppercase tracking-[0.16em] text-dark/40">Status</p>
      <p class="mt-2 text-[20px] font-semibold">
        <span v-if="!notificationsStore.status.installed">Authorization required</span>
        <span v-else-if="notificationsStore.status.hasInboxWebhook">Watching {{ notificationsStore.status.inboxTopic }}</span>
        <span v-else-if="notificationsStore.deferPodReauth">Using active session while deferring re-auth prompt</span>
        <span v-else-if="notificationsStore.status.upgradeNeeded">Permissions update required</span>
        <span v-else>Webhook provisioning pending</span>
      </p>
    </div>

    <div v-if="showOperatorDiagnostics" class="rounded-[28px] border border-dark/15 bg-white px-5 py-5 text-dark/80">
      <p class="text-[12px] uppercase tracking-[0.16em] text-dark/40">Operator diagnostics</p>
      <p class="mt-2 text-[14px]">
        Frontend effective policy:
        <span class="font-semibold">
          session {{ sessionPolicy.sessionMaxAgeMs }}ms, defer {{ sessionPolicy.podReauthDeferMs }}ms
        </span>
      </p>
      <p class="mt-1 text-[14px]">
        API expected policy:
        <span class="font-semibold">
          session {{ notificationsStore.status?.expectedFrontendPolicy?.sessionMaxAgeMs }}ms,
          defer {{ notificationsStore.status?.expectedFrontendPolicy?.podReauthDeferMs }}ms
        </span>
      </p>
    </div>

    <div v-if="notificationsStore.isLoading" class="flex flex-col gap-3">
      <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-[28px] bg-pastel-light" />
    </div>

    <div v-else-if="notificationsStore.items.length === 0" class="rounded-[28px] bg-pastel-light px-6 py-8 text-center text-dark/70">
      {{ emptyMessage }}
    </div>

    <article
      v-for="item in notificationsStore.items"
      :key="item.id"
      class="rounded-[28px] bg-pastel-light px-5 py-5"
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-[14px] uppercase tracking-[0.16em] text-dark/40">{{ item.activityType }}</p>
          <h2 class="mt-1 text-[26px] leading-tight text-dark">{{ getNotificationLabel(item.activityType) }}</h2>
        </div>
        <p class="text-right text-[13px] text-dark/50">{{ formatWhen(item.publishedAt || item.createdAt) }}</p>
      </div>

      <dl class="mt-4 grid gap-2 text-[14px] text-dark/70">
        <div v-if="item.actorUri">
          <dt class="font-semibold text-dark">Actor</dt>
          <dd class="break-all">{{ item.actorUri }}</dd>
        </div>
        <div v-if="item.objectUri">
          <dt class="font-semibold text-dark">Object</dt>
          <dd class="break-all">{{ item.objectUri }}</dd>
        </div>
        <div v-if="item.targetUri">
          <dt class="font-semibold text-dark">Target</dt>
          <dd class="break-all">{{ item.targetUri }}</dd>
        </div>
      </dl>
    </article>
  </section>
</template>