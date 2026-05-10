import type { UnifiedFeedItem } from '@/stores/atBridgeStore'
import type { ProtocolLogoName } from '@/design/logos/protocolLogoTypes'
import { NODEINFO_LOGO_MAP } from '@/design/logos/protocolLogoTypes'
import type { PostVisibility } from '@/design/components/PostVisibilityIcon.vue'

export interface ClientApp {
  name: string
  website?: string | null
}

export interface PostSourceMetadata {
  /** The transport protocol (atproto or activitypub). */
  protocol: ProtocolLogoName
  /**
   * The specific software platform, when known.
   * Starts as the same as `protocol`; NodeInfo detection will refine it later
   * (e.g. protocol='activitypub', software='mastodon').
   */
  software: ProtocolLogoName
  /** Human-readable source label for the detail/thread view. */
  label: string
  visibility: PostVisibility
  /** Application used to create the post, if available from the API. */
  client: ClientApp | null
}

// ── Resolvers ────────────────────────────────────────────────────────────────

export function resolveVisibility(item: UnifiedFeedItem): PostVisibility {
  // UnifiedFeedItem currently carries `isPublic: boolean`.
  // When the API exposes a richer visibility field this can be refined.
  if (item.isPublic) return 'public'
  return 'followers'
}

function resolveSoftware(item: UnifiedFeedItem): ProtocolLogoName {
  // Future: resolve via NodeInfo cache keyed on authorProviderEndpoint domain.
  // For now, infer from the source field.
  if (item.source === 'atproto') return 'bluesky'
  if (item.source === 'activitypods') return 'activitypods'
  return 'unknown'
}

function resolveClientApp(item: UnifiedFeedItem): ClientApp | null {
  // The Mastodon-compat API exposes an `application` field on statuses.
  // The sidecar/bridge doesn't forward it yet; this is the hook for when it does.
  const raw = (item as unknown as Record<string, unknown>).application
  if (!raw || typeof raw !== 'object') return null
  const app = raw as Record<string, unknown>
  const name = typeof app.name === 'string' ? app.name : null
  if (!name) return null
  return {
    name,
    website: typeof app.website === 'string' ? app.website : null,
  }
}

export function resolvePostSourceMetadata(item: UnifiedFeedItem): PostSourceMetadata {
  if (item.source === 'atproto') {
    return {
      protocol: 'atproto',
      software: 'bluesky',
      label: 'Bluesky · AT Protocol',
      visibility: resolveVisibility(item),
      client: resolveClientApp(item),
    }
  }

  if (item.source === 'activitypods') {
    const software = resolveSoftware(item)
    const softwareLabel = software === 'activitypods' ? 'ActivityPods' : software
    return {
      protocol: 'activitypub',
      software,
      label: `${softwareLabel} · ActivityPub`,
      visibility: resolveVisibility(item),
      client: resolveClientApp(item),
    }
  }

  // Unknown source — use the authorProviderEndpoint domain for the label if available.
  let domain = 'Unknown'
  try { domain = new URL(item.authorProviderEndpoint).hostname } catch { /* noop */ }
  const software: ProtocolLogoName = NODEINFO_LOGO_MAP[domain] ?? 'unknown'
  return {
    protocol: 'fediverse',
    software,
    label: domain,
    visibility: resolveVisibility(item),
    client: resolveClientApp(item),
  }
}
