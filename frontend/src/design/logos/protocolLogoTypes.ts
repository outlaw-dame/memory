/**
 * Protocol / Fediverse software logos.
 *
 * These are platform/brand logos, not generic UI glyphs.
 * Use ProtocolLogo.vue to render them — do NOT add these to AppIcon.
 *
 * SVG sources / attribution:
 *   - Custom project glyphs (fediverse, activitypub, activitypods, atproto, fedify)
 *   - Simplified representations of open-source project marks
 *   - Wakest's Fediverse Iconography collection is the recommended source for
 *     production-quality project SVGs when real brand assets are needed.
 *
 * When replacing a placeholder SVG with a real brand asset, update the SVG in
 * PROTOCOL_LOGO_SVGS in ProtocolLogo.vue and note the license here.
 */

export type ProtocolLogoName =
  // Generic / protocol-level
  | 'fediverse'       // generic Fediverse network (asterism concept)
  | 'activitypub'     // ActivityPub protocol broadcast symbol
  // Platform-specific
  | 'activitypods'    // ActivityPods pod
  | 'atproto'         // AT Protocol @ symbol
  | 'bluesky'         // Bluesky butterfly
  | 'mastodon'        // Mastodon elephant
  | 'akkoma'          // Akkoma (Pleroma fork)
  | 'pleroma'         // Pleroma
  | 'misskey'         // Misskey / Calckey star
  | 'lemmy'           // Lemmy
  | 'pixelfed'        // Pixelfed camera
  | 'peertube'        // PeerTube play button
  | 'fedify'          // Fedify relay/framework
  | 'unknown'         // Fallback for unrecognised software

/** Maps a NodeInfo `software.name` string to a ProtocolLogoName. */
export const NODEINFO_LOGO_MAP: Record<string, ProtocolLogoName> = {
  mastodon:    'mastodon',
  pleroma:     'pleroma',
  akkoma:      'akkoma',
  misskey:     'misskey',
  calckey:     'misskey',
  firefish:    'misskey',
  iceshrimp:   'misskey',
  lemmy:       'lemmy',
  pixelfed:    'pixelfed',
  peertube:    'peertube',
  fedify:      'fedify',
  activitypods:'activitypods',
}
