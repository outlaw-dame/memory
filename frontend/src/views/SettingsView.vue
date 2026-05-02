<script setup lang="ts">
import { useI18n } from '@/i18n'

const { availableLocales, locale, setLocale, t } = useI18n()

function onLocaleChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (target) {
    setLocale(target.value)
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <h2 class="text-xl font-semibold">{{ t('settings.title') }}</h2>

    <section class="rounded-default bg-pastel-light p-[var(--padding-main)]">
      <label class="flex flex-col gap-2 text-sm font-medium">
        {{ t('common.language') }}
        <select
          :value="locale"
          class="rounded border border-gray-300 bg-white px-3 py-2 font-normal"
          @change="onLocaleChange"
        >
          <option v-for="availableLocale in availableLocales" :key="availableLocale" :value="availableLocale">
            {{ t(`common.languages.${availableLocale}`) }}
          </option>
        </select>
      </label>
      <p class="text-caption mt-2">{{ t('settings.language.description') }}</p>
      <p class="text-caption mt-1">{{ t('settings.language.updatesImmediately') }}</p>
    </section>

    <RouterLink
      to="/settings/profile"
      class="rounded-default bg-pastel-light p-[var(--padding-main)] hover:bg-blue-100 transition-colors"
    >
      <h3 class="text-base font-semibold">{{ t('settings.cards.profile.title') }}</h3>
      <p class="text-caption mt-1">{{ t('settings.cards.profile.description') }}</p>
    </RouterLink>
    <RouterLink
      to="/settings/feed-controls"
      class="rounded-default bg-pastel-light p-[var(--padding-main)] hover:bg-blue-100 transition-colors"
    >
      <h3 class="text-base font-semibold">{{ t('settings.cards.feedControls.title') }}</h3>
      <p class="text-caption mt-1">{{ t('settings.cards.feedControls.description') }}</p>
    </RouterLink>
    <RouterLink
      to="/settings/moderation"
      class="rounded-default bg-pastel-light p-[var(--padding-main)] hover:bg-blue-100 transition-colors"
    >
      <h3 class="text-base font-semibold">{{ t('settings.cards.moderation.title') }}</h3>
      <p class="text-caption mt-1">{{ t('settings.cards.moderation.description') }}</p>
    </RouterLink>
  </div>
</template>
