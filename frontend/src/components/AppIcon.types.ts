import type { Component } from 'vue'
import { Loader2 } from '@lucide/vue'

// ── Icon name catalogue ─────────────────────────────────────────────────────
// Every name here MUST have an entry in APP_ICON_REGISTRY.
// Adding a name without a mapping is a compile-time error (satisfies guard below).

export type AppIconName =
  // Navigation tabs (outline + filled state pairs)
  | 'home'               | 'home-filled'
  | 'explore'            | 'explore-filled'
  | 'messages'           | 'messages-filled'
  | 'notifications'      | 'notifications-filled'
  | 'profile'            | 'profile-filled'
  // Post actions
  | 'reply'
  | 'repost'
  | 'quote'
  | 'like'               | 'like-filled'
  | 'bookmark'           | 'bookmark-filled'
  | 'share'
  | 'more'
  // Compose / content
  | 'add'
  | 'check'
  | 'image'
  // Destructive
  | 'trash'
  // Utility
  | 'copy'
  | 'user-circle'
  // Navigation chrome
  | 'back'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  | 'settings'
  // System
  | 'loader'
  // Visibility
  | 'lock'
  | 'globe'
  | 'mail'
  // Protocol / network glyphs (custom inline SVG — generic, not platform logos)
  | 'fediverse'
  | 'verified-mark'

/** Names backed by project-owned inline SVG paths — not from any glyph library. */
export type CustomIconName = 'verified-mark' | 'fediverse'

// ── Icon source descriptors ─────────────────────────────────────────────────

export type IconSource =
  | { type: 'ionicon';  name: string }
  | { type: 'material'; name: string; fill?: 0 | 1 }
  | { type: 'lucide';   component: Component }
  | { type: 'custom';   name: CustomIconName }

export type PlatformIconDefinition = {
  /** iOS, macOS, web default */
  ios: IconSource
  /** Android Material Design */
  material: IconSource
  /**
   * Used when the primary source cannot render (e.g. Material font not yet loaded,
   * or offline on Android). Falls back to ios if omitted.
   */
  fallback?: IconSource
}

// ── Registry ────────────────────────────────────────────────────────────────
// The `satisfies` guard enforces that every AppIconName has an intentional mapping.
// Missing an entry here is a compile-time error — by design.
//
// Lucide is used only when explicitly chosen. It must never be an automatic fallback
// for an unmapped Ionicons name.

export const APP_ICON_REGISTRY = {
  // Navigation tabs
  'home':                  { ios: { type: 'ionicon',  name: 'home-outline'                 }, material: { type: 'material', name: 'home'                                } },
  'home-filled':           { ios: { type: 'ionicon',  name: 'home'                         }, material: { type: 'material', name: 'home',          fill: 1 as const    } },
  'explore':               { ios: { type: 'ionicon',  name: 'search-outline'                }, material: { type: 'material', name: 'explore'                             } },
  'explore-filled':        { ios: { type: 'ionicon',  name: 'search'                        }, material: { type: 'material', name: 'explore',       fill: 1 as const    } },
  'messages':              { ios: { type: 'ionicon',  name: 'chatbubble-outline'             }, material: { type: 'material', name: 'chat_bubble'                         } },
  'messages-filled':       { ios: { type: 'ionicon',  name: 'chatbubble'                    }, material: { type: 'material', name: 'chat_bubble',   fill: 1 as const    } },
  'notifications':         { ios: { type: 'ionicon',  name: 'notifications-outline'          }, material: { type: 'material', name: 'notifications'                       } },
  'notifications-filled':  { ios: { type: 'ionicon',  name: 'notifications'                 }, material: { type: 'material', name: 'notifications', fill: 1 as const    } },
  'profile':               { ios: { type: 'ionicon',  name: 'person-circle-outline'          }, material: { type: 'material', name: 'account_circle'                      } },
  'profile-filled':        { ios: { type: 'ionicon',  name: 'person-circle'                 }, material: { type: 'material', name: 'account_circle',fill: 1 as const    } },

  // Post actions
  'reply':                 { ios: { type: 'ionicon',  name: 'arrow-undo-outline'             }, material: { type: 'material', name: 'reply'                               } },
  'repost':                { ios: { type: 'ionicon',  name: 'repeat-outline'                 }, material: { type: 'material', name: 'repeat'                              } },
  'quote':                 { ios: { type: 'ionicon',  name: 'chatbubble-ellipses-outline'    }, material: { type: 'material', name: 'format_quote'                        } },
  'like':                  { ios: { type: 'ionicon',  name: 'heart-outline'                  }, material: { type: 'material', name: 'favorite'                            } },
  'like-filled':           { ios: { type: 'ionicon',  name: 'heart'                         }, material: { type: 'material', name: 'favorite',      fill: 1 as const    } },
  'bookmark':              { ios: { type: 'ionicon',  name: 'bookmark-outline'               }, material: { type: 'material', name: 'bookmark'                            } },
  'bookmark-filled':       { ios: { type: 'ionicon',  name: 'bookmark'                      }, material: { type: 'material', name: 'bookmark',      fill: 1 as const    } },
  'share':                 { ios: { type: 'ionicon',  name: 'share-outline'                  }, material: { type: 'material', name: 'share'                               } },
  'more':                  { ios: { type: 'ionicon',  name: 'ellipsis-horizontal-outline'    }, material: { type: 'material', name: 'more_horiz'                          } },

  // Compose / content
  'add':                   { ios: { type: 'ionicon',  name: 'add-outline'                    }, material: { type: 'material', name: 'add'                                 } },
  'check':                 { ios: { type: 'ionicon',  name: 'checkmark-outline'              }, material: { type: 'material', name: 'check'                               } },
  'image':                 { ios: { type: 'ionicon',  name: 'image-outline'                  }, material: { type: 'material', name: 'image'                               } },

  // Destructive
  'trash':                 { ios: { type: 'ionicon',  name: 'trash-outline'                  }, material: { type: 'material', name: 'delete'                              } },

  // Utility
  'copy':                  { ios: { type: 'ionicon',  name: 'copy-outline'                   }, material: { type: 'material', name: 'content_copy'                        } },
  'user-circle':           { ios: { type: 'ionicon',  name: 'person-circle-outline'          }, material: { type: 'material', name: 'account_circle'                      } },

  // Navigation chrome
  'back':                  { ios: { type: 'ionicon',  name: 'chevron-back-outline'            }, material: { type: 'material', name: 'arrow_back'                          } },
  'chevron-right':         { ios: { type: 'ionicon',  name: 'chevron-forward-outline'         }, material: { type: 'material', name: 'chevron_right'                       } },
  'chevron-down':          { ios: { type: 'ionicon',  name: 'chevron-down-outline'             }, material: { type: 'material', name: 'expand_more'                         } },
  'close':                 { ios: { type: 'ionicon',  name: 'close-outline'                   }, material: { type: 'material', name: 'close'                               } },
  'settings':              { ios: { type: 'ionicon',  name: 'settings-outline'                }, material: { type: 'material', name: 'settings'                            } },

  // System — Lucide Loader2 is an explicit design choice for the spinner;
  // Material Symbols progress_activity is used on Android when the font is ready.
  'loader': {
    ios:      { type: 'lucide',   component: Loader2 as Component },
    material: { type: 'material', name: 'progress_activity' },
    fallback: { type: 'lucide',   component: Loader2 as Component },
  },

  // Visibility
  'lock':          { ios: { type: 'ionicon',  name: 'lock-closed-outline' }, material: { type: 'material', name: 'lock'              } },
  'globe':         { ios: { type: 'ionicon',  name: 'globe-outline'        }, material: { type: 'material', name: 'public'             } },
  'mail':          { ios: { type: 'ionicon',  name: 'mail-outline'          }, material: { type: 'material', name: 'mail'               } },

  // Generic Fediverse glyph — use for settings/info contexts, not platform logos.
  // Platform-specific logos live in src/design/logos/ProtocolLogo.vue.
  'fediverse':     { ios: { type: 'custom', name: 'fediverse'    }, material: { type: 'custom', name: 'fediverse'    } },
  'verified-mark': { ios: { type: 'custom', name: 'verified-mark' }, material: { type: 'custom', name: 'verified-mark' } },
} satisfies Record<AppIconName, PlatformIconDefinition>

// Back-compat alias — remove once all callsites use AppIconName.
/** @deprecated Use AppIconName */
export type IconName = AppIconName
