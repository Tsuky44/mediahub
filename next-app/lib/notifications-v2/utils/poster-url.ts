/**
 * poster-url.ts
 *
 * Source unique de vérité pour transformer un `posterPath` de payload en URL
 * d'image envoyable à un tiers (Evolution API, Web Push).
 *
 * Le champ `posterPath` arrive de sources hétérogènes :
 *  - TMDB      : chemin relatif `/xxxx.jpg` → préfixer par le CDN TMDB
 *  - Sonarr/Radarr : `/MediaCover/42/poster.jpg` → chemin INTERNE à l'instance,
 *    non résolvable depuis l'extérieur. Le préfixer par le CDN TMDB produit une
 *    URL 404 qu'Evolution accepte puis échoue à télécharger : on préfère ne rien
 *    envoyer (message texte) plutôt qu'une image cassée.
 *  - URL absolue (remotePoster d'un lookup Sonarr, proxy interne) → telle quelle
 */

/** Base CDN TMDB. w500 : bon compromis qualité/poids pour WhatsApp. */
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

/**
 * Construit l'URL publique du poster, ou `undefined` si aucune URL fiable ne
 * peut être produite. Ne jette jamais.
 */
export function buildPosterUrl(posterPath?: string | null): string | undefined {
  if (!posterPath) return undefined

  const path = String(posterPath).trim()
  if (path.length === 0) return undefined

  // Déjà une URL absolue → on fait confiance à la source.
  if (/^https?:\/\//i.test(path)) return path

  // Chemin interne Sonarr/Radarr : inatteignable depuis Evolution API.
  // On renvoie undefined pour retomber proprement sur un envoi texte.
  if (path.includes('/MediaCover/') || path.startsWith('MediaCover/')) return undefined

  // Chemin TMDB relatif.
  if (path.startsWith('/')) return `${TMDB_IMAGE_BASE}${path}`

  // Nom de fichier TMDB sans slash initial (`xxxx.jpg`).
  if (/^[\w-]+\.(jpg|jpeg|png|webp)$/i.test(path)) return `${TMDB_IMAGE_BASE}/${path}`

  return undefined
}

/**
 * `true` si `posterPath` est un chemin interne Sonarr/Radarr — utile pour
 * décider s'il faut tenter un enrichissement TMDB à la place.
 */
export function isInternalMediaCoverPath(posterPath?: string | null): boolean {
  if (!posterPath) return false
  const path = String(posterPath)
  return path.includes('/MediaCover/') || path.startsWith('MediaCover/')
}
