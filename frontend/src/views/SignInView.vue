<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '@/design/semantic/AppNavbar.vue'
import SignInForm from '@/components/SignInForm.vue'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace({ name: 'welcome' })
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <AppNavbar :title-key="'app.title.signin'" :show-back="true" @back="goBack" />
    <div class="flex-1 overflow-y-auto px-(--padding-main) pt-6">
      <h2 class="text-largeHeader font-bold mb-6">{{ t('signin.title') }}</h2>
      <SignInForm />
    </div>
  </div>
</template>

<style scoped>
/* Back link styling to match existing app design */
.app-topbar-back-link {
  --f7-link-color: var(--color-primary, #000);
  --f7-icon-size: 24px;
  --f7-icon-color: var(--color-primary, #000);
  cursor: pointer;
  padding: 0 12px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title styling */
.app-topbar-title {
  font-family: var(--font-family);
  font-size: var(--text-size-large);
  font-weight: 600;
  color: var(--color-primary, #000);
  text-align: center;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Navbar customization */
:deep(.navbar) {
  --f7-navbar-height: 44px;
  --f7-navbar-bg-color: transparent;
  --f7-navbar-border-color: transparent;
  --f7-navbar-text-color: var(--color-primary, #000);
  --f7-navbar-title-text-color: var(--color-primary, #000);
  background: transparent;
  height: 44px;
  min-height: 44px;
}

:deep(.navbar-inner) {
  height: 100%;
  padding: 0;
}

:deep(.navbar-inner:before) {
  content: none;
}

:deep(.navbar-center) {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}

:deep(.navbar:after) {
  content: none;
}
</style>
