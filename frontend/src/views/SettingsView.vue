<script setup lang="ts">
import { useRouter } from 'vue-router'
import { kList, kListItem, kToggle, kBlockTitle } from 'konsta/vue'
import { useI18n } from '@/i18n'
import { useNotificationsStore } from '@/stores/notificationsStore'

const router = useRouter()
const { availableLocales, locale, setLocale, t } = useI18n()
const notificationsStore = useNotificationsStore()

function onLocaleChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (target) setLocale(target.value)
}

function onWindowHoursChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  const windowHours = Number.parseInt(target.value, 10)
  if (Number.isFinite(windowHours)) {
    void notificationsStore.setGroupingPreferences({ windowHours })
  }
}
</script>

<template>
  <div class="pb-20">

    <!-- ── Language ────────────────────────────────────────────────────────── -->
    <kBlockTitle>{{ t('common.language') }}</kBlockTitle>
    <kList>
      <kListItem :title="t('common.language')">
        <template #after>
          <select
            :value="locale"
            class="rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm text-label focus:outline-none focus:ring-2 focus:ring-accent/20"
            @change="onLocaleChange"
          >
            <option
              v-for="l in availableLocales"
              :key="l"
              :value="l"
            >{{ t(`common.languages.${l}`) }}</option>
          </select>
        </template>
      </kListItem>
    </kList>
    <p class="px-(--padding-main) text-xs text-label-secondary">{{ t('settings.language.description') }}</p>
    <p class="px-(--padding-main) mt-0.5 text-xs text-label-tertiary">{{ t('settings.language.updatesImmediately') }}</p>

    <!-- ── Notification grouping ───────────────────────────────────────────── -->
    <kBlockTitle>{{ t('settings.appearance.title') }}</kBlockTitle>
    <kList>
      <kListItem :title="t('settings.appearance.notifications.groupFollows')">
        <template #after>
          <kToggle
            :checked="notificationsStore.groupingPreferences.includeFollows"
            @change="(e: Event) => notificationsStore.setGroupingPreferences({ includeFollows: (e.target as HTMLInputElement).checked })"
          />
        </template>
      </kListItem>
      <kListItem :title="t('settings.appearance.notifications.groupMentions')">
        <template #after>
          <kToggle
            :checked="notificationsStore.groupingPreferences.includeMentions"
            @change="(e: Event) => notificationsStore.setGroupingPreferences({ includeMentions: (e.target as HTMLInputElement).checked })"
          />
        </template>
      </kListItem>
      <kListItem :title="t('settings.appearance.notifications.groupWindow')">
        <template #after>
          <select
            :value="notificationsStore.groupingPreferences.windowHours"
            class="rounded-lg border border-separator bg-surface px-3 py-1.5 text-sm text-label focus:outline-none focus:ring-2 focus:ring-accent/20"
            @change="onWindowHoursChange"
          >
            <option :value="24">{{ t('settings.appearance.notifications.window.24h') }}</option>
            <option :value="72">{{ t('settings.appearance.notifications.window.72h') }}</option>
            <option :value="168">{{ t('settings.appearance.notifications.window.168h') }}</option>
            <option :value="336">{{ t('settings.appearance.notifications.window.336h') }}</option>
          </select>
        </template>
      </kListItem>
    </kList>

    <!-- ── Navigation ──────────────────────────────────────────────────────── -->
    <kBlockTitle>{{ t('settings.title') }}</kBlockTitle>
    <kList>
      <kListItem
        link
        :title="t('settings.cards.profile.title')"
        :subtitle="t('settings.cards.profile.description')"
        component="button"
        :link-props="{ type: 'button' }"
        @click="router.push('/settings/profile')"
      />
      <kListItem
        link
        :title="t('settings.cards.feedControls.title')"
        :subtitle="t('settings.cards.feedControls.description')"
        component="button"
        :link-props="{ type: 'button' }"
        @click="router.push('/settings/feed-controls')"
      />
      <kListItem
        link
        :title="t('settings.cards.moderation.title')"
        :subtitle="t('settings.cards.moderation.description')"
        component="button"
        :link-props="{ type: 'button' }"
        @click="router.push('/settings/moderation')"
      />
    </kList>

  </div>
</template>
