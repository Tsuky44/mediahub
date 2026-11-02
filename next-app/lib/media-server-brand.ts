/**
 * Couleurs des serveurs média, partout où on les choisit ou les nomme : Emby vert, Plex jaune,
 * Jellyfin bleu (globals.css : --color-emby, --color-plex, --color-jellyfin). Les classes sont
 * écrites en entier pour que Tailwind les génère.
 */
export type MediaServerBrand = 'emby' | 'plex' | 'jellyfin'

interface BrandClasses {
  /** Choix sélectionné (onglet, bouton de choix) : verre teinté, texte et liseré de la marque */
  selected: string
  /** Bouton d'action principal : plein, texte sombre */
  solid: string
  /** Petite étiquette */
  badge: string
  /** Texte ou icône */
  text: string
}

export const BRAND: Record<MediaServerBrand, BrandClasses> = {
  emby: {
    selected: 'bg-emby/15 text-emby ring-1 ring-inset ring-emby/40 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]',
    solid: 'bg-emby text-onyx-bg shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_30px_-14px_var(--color-emby)] hover:brightness-110',
    badge: 'bg-emby/15 text-emby border-emby/30',
    text: 'text-emby',
  },
  plex: {
    selected: 'bg-plex/15 text-plex ring-1 ring-inset ring-plex/40 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]',
    solid: 'bg-plex text-onyx-bg shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_30px_-14px_var(--color-plex)] hover:brightness-110',
    badge: 'bg-plex/15 text-plex border-plex/30',
    text: 'text-plex',
  },
  jellyfin: {
    selected: 'bg-jellyfin/15 text-jellyfin ring-1 ring-inset ring-jellyfin/40 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]',
    solid: 'bg-jellyfin text-onyx-bg shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_30px_-14px_var(--color-jellyfin)] hover:brightness-110',
    badge: 'bg-jellyfin/15 text-jellyfin border-jellyfin/30',
    text: 'text-jellyfin',
  },
}

export function isMediaServerBrand(value: string): value is MediaServerBrand {
  return value === 'emby' || value === 'plex' || value === 'jellyfin'
}

/**
 * Onyx n'a pas de couleur de marque : il reprend l'encre du thème (blanc cassé), comme son bouton
 * de connexion. Hors de BRAND pour ne pas changer les écrans qui testent isMediaServerBrand.
 */
export const ONYX_BRAND: BrandClasses = {
  selected: 'bg-white/15 text-onyx-ink ring-1 ring-inset ring-white/30 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]',
  solid: 'bg-onyx-ink text-onyx-bg shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] hover:brightness-95',
  badge: 'bg-white/10 text-onyx-ink border-white/25',
  text: 'text-onyx-ink',
}
