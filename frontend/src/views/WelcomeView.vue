<script setup lang="ts">
import MemoryButton from '@/components/MemoryButton.vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()
</script>

<template>
  <div class="welcome grid h-full grid-rows-[fit-content(100%)_auto] items-stretch">
    <div>
      <div class="background">
        <div id="topRightCircle" />
        <div id="bottomCircle" />
        <div id="bottomRightCircle" />
        <div id="bottomLeftCircle" />
        <div id="topLeftCircle" />
      </div>
    </div>
    <div class="self-end">
      <div class="text-white">
        <h2 class="text-h1 pb-(--gap-default)">
          {{ t('welcome.heading') }}<br /><span class="text-pageTitle font-[Butler]">LOGO.</span>
        </h2>
        <p class="text-h3 pb-(--padding-huge)">
          {{ t('welcome.tagline') }}
        </p>
      </div>
      <div class="gap-(--gap-default) flex flex-col">
        <MemoryButton class="text-dark w-full bg-white" success @click="$router.push({ name: 'signin' })">
          {{ t('common.actions.signIn') }}
        </MemoryButton>
        <MemoryButton class="bg-white-20 w-full text-white" success @click="$router.push({ name: 'signup' })">
          {{ t('common.actions.signUp') }}
        </MemoryButton>
      </div>
      <div class="py-(--padding-large) gap-(--gap-default) mb-(--padding-main) flex justify-center text-white">
        <p>{{ t('welcome.terms') }}</p>
        <p>{{ t('welcome.imprint') }}</p>
        <p>{{ t('welcome.about') }}</p>
      </div>
    </div>
  </div>
</template>
