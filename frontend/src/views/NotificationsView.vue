<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { getSessionPolicyConfig, isOperatorDiagnosticsEnabled } from '@/utils/sessionPolicy'
import { useI18n } from '@/i18n'

const notificationsStore = useNotificationsStore()
const sessionPolicy = getSessionPolicyConfig()
const { formatDateTime, t } = useI18n()

onMounted(async () => {
  try {
    await notificationsStore.initialize()
  } catch (error) {
    console.error('[NotificationsView] initialization failed:', error)
  }
})

const emptyMessage = computed(() => {
  if (!notificationsStore.status?.installed) {
    return t('notifications.empty.install')
  }
  if (!notificationsStore.status?.hasInboxWebhook) {
    if (notificationsStore.status?.upgradeNeeded) {
      return t('notifications.empty.upgrade')
    }
    return t('notifications.empty.webhookInactive')
  }
  if (notificationsStore.deferPodReauth) {
    return t('notifications.empty.deferPrompt')
  }
  return t('notifications.empty.noneDelivered')
})

const showOperatorDiagnostics = computed(() => {
  if (!isOperatorDiagnosticsEnabled()) return false
  return !!notificationsStore.status?.expectedFrontendPolicy
})

function formatWhen(value: string | null) {
  if (!value) return t('common.labels.pendingTimestamp')
  return formatDateTime(value, { dateStyle: 'medium', timeStyle: 'short' })
}

function getNotificationLabel(type: string) {
  switch (type) {
    case 'Add':
      return t('notifications.labels.add')
    case 'Create':
      return t('notifications.labels.create')
    case 'Update':
      return t('notifications.labels.update')
    case 'Delete':
      return t('notifications.labels.delete')
    default:
      return type
  }
}
</script>

<template>
  <section class="mx-auto flex w-full max-w-[560px] flex-col gap-4 pb-24">
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-[14px] uppercase tracking-[0.2em] text-dark/40">{{ t('notifications.product') }}</p>
        <h1 class="font-[Butler] text-[42px] leading-none text-dark">{{ t('notifications.title') }}</h1>
      </div>
      <button
        v-if="notificationsStore.status && !notificationsStore.deferPodReauth && (!notificationsStore.status.installed || (!notificationsStore.status.hasInboxWebhook && notificationsStore.status.upgradeNeeded))"
        type="button"
        class="rounded-full bg-dark px-4 py-2 text-sm font-medium text-white"
        @click="notificationsStore.beginAuthorization()"
      >
        {{ notificationsStore.status.upgradeNeeded ? t('common.actions.updateAccess') : t('common.actions.enable') }}
      </button>
    </header>

    <div v-if="notificationsStore.error" class="rounded-[28px] border border-[#f0b3b3] bg-[#fff1f1] px-5 py-4 text-[#8d2f2f]">
      {{ notificationsStore.error }}
    </div>

    <div v-if="notificationsStore.status" class="rounded-[28px] bg-pastel-light px-5 py-5 text-dark">
      <p class="text-[14px] uppercase tracking-[0.16em] text-dark/40">{{ t('notifications.statusLabel') }}</p>
      <p class="mt-2 text-[20px] font-semibold">
        <span v-if="!notificationsStore.status.installed">{{ t('notifications.status.authorizationRequired') }}</span>
        <span v-else-if="notificationsStore.status.hasInboxWebhook">{{ t('notifications.status.watching', { topic: notificationsStore.status.inboxTopic }) }}</span>
        <span v-else-if="notificationsStore.deferPodReauth">{{ t('notifications.status.deferPrompt') }}</span>
        <span v-else-if="notificationsStore.status.upgradeNeeded">{{ t('notifications.status.permissionsUpdateRequired') }}</span>
        <span v-else>{{ t('notifications.status.webhookPending') }}</span>
      </p>
    </div>

    <div v-if="showOperatorDiagnostics" class="rounded-[28px] border border-dark/15 bg-white px-5 py-5 text-dark/80">
      <p class="text-[12px] uppercase tracking-[0.16em] text-dark/40">{{ t('notifications.operatorDiagnostics') }}</p>
      <p class="mt-2 text-[14px]">
        {{ t('notifications.frontendPolicy') }}
        <span class="font-semibold">
          session {{ sessionPolicy.sessionMaxAgeMs }}ms, defer {{ sessionPolicy.podReauthDeferMs }}ms
        </span>
      </p>
      <p class="mt-1 text-[14px]">
        {{ t('notifications.apiPolicy') }}
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
          <dt class="font-semibold text-dark">{{ t('notifications.fields.actor') }}</dt>
          <dd class="break-all">{{ item.actorUri }}</dd>
        </div>
        <div v-if="item.objectUri">
          <dt class="font-semibold text-dark">{{ t('notifications.fields.object') }}</dt>
          <dd class="break-all">{{ item.objectUri }}</dd>
        </div>
        <div v-if="item.targetUri">
          <dt class="font-semibold text-dark">{{ t('notifications.fields.target') }}</dt>
          <dd class="break-all">{{ item.targetUri }}</dd>
        </div>
      </dl>
    </article>
  </section>
</template>
