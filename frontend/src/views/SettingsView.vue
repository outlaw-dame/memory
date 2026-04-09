<script setup lang="ts">
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <h2 class="text-xl font-semibold">Settings</h2>
    <RouterLink
      to="/settings/profile"
      class="rounded-default bg-pastel-light p-[var(--padding-main)] hover:bg-blue-100 transition-colors"
    >
      <h3 class="text-base font-semibold">Profile</h3>
      <p class="text-caption mt-1">Edit ActivityPub profile fields and verify rel=me links.</p>
    </RouterLink>
    <RouterLink
      to="/settings/feed-controls"
      class="rounded-default bg-pastel-light p-[var(--padding-main)] hover:bg-blue-100 transition-colors"
    >
      <h3 class="text-base font-semibold">Feed Controls</h3>
      <p class="text-caption mt-1">Configure timeline mode and protocol weights for unified feed ranking.</p>
    </RouterLink>
  </div>
</template>
