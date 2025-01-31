<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const authStore = useAuthStore()
</script>

<template>
  <div
    class="bottomBar p-(--padding-main) bg-linear-to-t from-pastel-light z-1 fixed bottom-0 left-0 flex w-full justify-between from-80% to-transparent"
    vif="route.name !== 'Login' && route.name !== 'Signup' && route.name !== 'Welcome'"
  >
    <div :class="{ active: route.name === 'home' }" @click="router.push({ name: 'home' })">
      <vs-icon iconName="Home2" />
    </div>
    <div>
      <vs-icon iconName="Global" />
    </div>
    <div>
      <vs-icon iconName="Note" />
    </div>
    <div>
      <vs-icon iconName="Messages2" />
    </div>
    <div>
      <vs-icon iconName="UserSquare" @click="authStore.logout()" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.bottomBar {
  > div {
    padding: 10.5px 18.5px;
    color: var(--color-black);
    border-radius: var(--radius-large);
  }
  .active {
    color: var(--color-primary);
    background-color: var(--color-primary-20);
  }
}
</style>
