<script setup lang="ts">
/**
 * ClientAppBadge — "via [AppName]" attribution pill.
 *
 * Shown in detail/thread view only when appearance.showClientApp is enabled.
 * Renders nothing when the client name is not available (API doesn't send it yet).
 *
 * The Mastodon-compat API exposes application[name] + application[website] on statuses.
 * When the sidecar begins forwarding that field, this component will light up automatically.
 */
import type { ClientApp } from './postSourceMetadata'

defineProps<{ client: ClientApp }>()
</script>

<template>
  <span class="text-caption text-dark-50">
    via {{ client.name }}
  </span>
</template>
