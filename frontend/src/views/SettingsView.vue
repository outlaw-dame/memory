<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useAppearanceStore } from '@/stores/appearanceStore'
import { AppList, AppListItem, AppGroupedList, AppSwitch } from '@/design/semantic'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

const router = useRouter()
const { availableLocales, locale, setLocale, t } = useI18n()
const notificationsStore = useNotificationsStore()
const appearance = useAppearanceStore()
const nativeUiProfile = useNativeUiProfile()

const windowHoursOptions = [
  { value: 24, label: t('settings.appearance.notifications.window.24h') },
  { value: 72, label: t('settings.appearance.notifications.window.72h') },
  { value: 168, label: t('settings.appearance.notifications.window.168h') },
  { value: 336, label: t('settings.appearance.notifications.window.336h') },
]

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

function handleToggleChange(value: boolean, setter: (value: boolean) => void) {
  setter(value)
}
</script>

<template>
  <div class="pb-20">

    <!-- ── Language ────────────────────────────────────────────────────────── -->
    <AppGroupedList :title="t('common.language')" :inset="true">
      <AppList :inset="false">
        <AppListItem>
          <template #title>
            {{ t('common.language') }}
          </template>
          <template #after>
            <select
              :value="locale"
              class="app-settings-select"
              @change="onLocaleChange"
              :aria-label="t('common.language')"
            >
              <option
                v-for="l in availableLocales"
                :key="l"
                :value="l"
              >{{ t(`common.languages.${l}`) }}</option>
            </select>
          </template>
        </AppListItem>
      </AppList>
      <p class="app-settings-description">{{ t('settings.language.description') }}</p>
      <p class="app-settings-description-secondary">{{ t('settings.language.updatesImmediately') }}</p>
    </AppGroupedList>

    <!-- ── Feed appearance ───────────────────────────────────────────────────── -->
    <AppGroupedList title="Feed" :inset="true">
      <AppList :inset="false">
        <AppListItem title="Show source badge" subtitle="Protocol logo next to each post">
          <template #after>
            <AppSwitch
              v-model="appearance.showProtocolBadge"
              @change="(value: boolean) => { appearance.showProtocolBadge = value }"
              :aria-label="t('settings.appearance.showSourceBadge')"
            />
          </template>
        </AppListItem>
        <AppListItem title="Show visibility indicator" subtitle="Lock icon on followers-only posts">
          <template #after>
            <AppSwitch
              v-model="appearance.showVisibilityIndicator"
              @change="(value: boolean) => { appearance.showVisibilityIndicator = value }"
              :aria-label="t('settings.appearance.showVisibilityIndicator')"
            />
          </template>
        </AppListItem>
        <AppListItem title="Show client app" subtitle="'via Memory / Tusky / …' in thread view">
          <template #after>
            <AppSwitch
              v-model="appearance.showClientApp"
              @change="(value: boolean) => { appearance.showClientApp = value }"
              :aria-label="t('settings.appearance.showClientApp')"
            />
          </template>
        </AppListItem>
      </AppList>
    </AppGroupedList>

    <!-- ── Notification grouping ───────────────────────────────────────────── -->
    <AppGroupedList :title="t('settings.appearance.title')" :inset="true">
      <AppList :inset="false">
        <AppListItem :title="t('settings.appearance.notifications.groupFollows')">
          <template #after>
            <AppSwitch
              :model-value="notificationsStore.groupingPreferences.includeFollows"
              @change="(value: boolean) => notificationsStore.setGroupingPreferences({ includeFollows: value })"
              :aria-label="t('settings.appearance.notifications.groupFollows')"
            />
          </template>
        </AppListItem>
        <AppListItem :title="t('settings.appearance.notifications.groupMentions')">
          <template #after>
            <AppSwitch
              :model-value="notificationsStore.groupingPreferences.includeMentions"
              @change="(value: boolean) => notificationsStore.setGroupingPreferences({ includeMentions: value })"
              :aria-label="t('settings.appearance.notifications.groupMentions')"
            />
          </template>
        </AppListItem>
        <AppListItem :title="t('settings.appearance.notifications.groupWindow')">
          <template #after>
            <select
              :value="notificationsStore.groupingPreferences.windowHours"
              class="app-settings-select"
              @change="onWindowHoursChange"
              :aria-label="t('settings.appearance.notifications.groupWindow')"
            >
              <option v-for="opt in windowHoursOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </template>
        </AppListItem>
      </AppList>
    </AppGroupedList>

    <!-- ── Navigation ──────────────────────────────────────────────────────── -->
    <AppGroupedList :title="t('settings.title')" :inset="true">
      <AppList :inset="false">
        <AppListItem
          link
          :title="t('settings.cards.profile.title')"
          :subtitle="t('settings.cards.profile.description')"
          @click="router.push('/settings/profile')"
          chevron-right
        />
        <AppListItem
          link
          :title="t('settings.cards.feedControls.title')"
          :subtitle="t('settings.cards.feedControls.description')"
          @click="router.push('/settings/feed-controls')"
          chevron-right
        />
        <AppListItem
          link
          :title="t('settings.cards.moderation.title')"
          :subtitle="t('settings.cards.moderation.description')"
          @click="router.push('/settings/moderation')"
          chevron-right
        />
      </AppList>
    </AppGroupedList>

  </div>
</template>
