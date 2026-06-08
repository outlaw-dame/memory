<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAtBridgeStore } from '@/stores/atBridgeStore'
import { useI18n } from '@/i18n'
import {
  AppList,
  AppListItem,
  AppGroupedList,
  AppSlider
} from '@/design/semantic'

const store = useAtBridgeStore()
const { t } = useI18n()

const apWeight = ref(store.protocolWeights.activitypods)
const atWeight = ref(store.protocolWeights.atproto)

watch(
  () => store.protocolWeights,
  value => {
    apWeight.value = value.activitypods
    atWeight.value = value.atproto
  },
  { deep: true },
)

const ratioSummary = computed(() => {
  const total = apWeight.value + atWeight.value
  const apPct = Math.round((apWeight.value / total) * 100)
  const atPct = 100 - apPct
  return t('settings.feedControls.ratioSummary', { activitypub: apPct, atproto: atPct })
})

async function applyWeights() {
  await store.setProtocolWeights(apWeight.value, atWeight.value)
}

async function resetDefaults() {
  apWeight.value = 50
  atWeight.value = 50
  await store.setProtocolWeights(50, 50)
}

// Ensure weights stay in sync (sum to 100)
function updateWeights() {
  // This allows independent adjustment of each slider
  // The actual constraint is handled by the backend
}
</script>

<template>
  <div class="pb-20">
    <!-- Header -->
    <AppGroupedList :title="t('settings.feedControls.title')" :inset="true">
      <p class="app-settings-description">{{ t('settings.feedControls.description') }}</p>
    </AppGroupedList>

    <!-- Feed Mix Controls -->
    <AppGroupedList :title="t('settings.feedControls.feedMix')" :inset="true">
      <AppList :inset="false">
        <AppListItem>
          <template #title>
            {{ t('settings.feedControls.activitypubWeight') }}
          </template>
          <template #after>
            <AppSlider
              v-model="apWeight"
              :min="1"
              :max="99"
              :aria-label="t('settings.feedControls.activitypubWeight')"
              @change="updateWeights"
            />
          </template>
        </AppListItem>
        
        <AppListItem :title="String(apWeight)" class="text-center" />
        
        <AppListItem>
          <template #title>
            {{ t('settings.feedControls.atprotoWeight') }}
          </template>
          <template #after>
            <AppSlider
              v-model="atWeight"
              :min="1"
              :max="99"
              :aria-label="t('settings.feedControls.atprotoWeight')"
              @change="updateWeights"
            />
          </template>
        </AppListItem>
        
        <AppListItem :title="String(atWeight)" class="text-center" />
        
        <AppListItem :title="t('settings.feedControls.currentMix', { summary: ratioSummary })" class="font-semibold" />
      </AppList>
    </AppGroupedList>

    <!-- Actions -->
    <AppGroupedList :inset="true">
      <AppList :inset="false">
        <AppListItem>
          <template #after>
            <div class="flex gap-2">
              <button
                class="app-settings-button primary"
                @click="applyWeights"
                :aria-label="t('common.actions.apply')"
              >
                {{ t('common.actions.apply') }}
              </button>
              <button
                class="app-settings-button secondary"
                @click="resetDefaults"
                :aria-label="t('common.actions.reset')"
              >
                {{ t('common.actions.reset') }}
              </button>
            </div>
          </template>
        </AppListItem>
      </AppList>
    </AppGroupedList>

    <!-- Back Navigation -->
    <AppGroupedList :inset="true">
      <AppList :inset="false">
        <AppListItem
          link
          :title="t('common.actions.backToSettings')"
          @click="$router.push('/settings')"
          chevron-right
        />
      </AppList>
    </AppGroupedList>
  </div>
</template>

<style scoped>
/* Settings-specific styling */
.app-settings-description {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--color-secondary);
  padding: 0 var(--padding-main) 0.5rem;
}

.app-settings-button {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: var(--rounded);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.app-settings-button.primary {
  background-color: var(--color-accent, #1d9bf0);
  color: white;
  border: none;
}

.app-settings-button.secondary {
  background-color: var(--bg-color-secondary, #f7f7f7);
  color: var(--color-primary);
  border: 1px solid var(--color-secondary, #ccc);
}
</style>
