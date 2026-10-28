import { getPosterUrl } from './getPosterUrl'

/**
 * Télécharge en avance les affiches d'une liste (même URL que MediaCard) :
 * quand les cartes s'affichent, les images sont déjà dans le cache du navigateur.
 */
export function preloadPosters(items: { poster_path?: string | null }[]) {
  if (typeof window === 'undefined') return
  for (const item of items) {
    const url = getPosterUrl(item.poster_path ?? null, 'w342')
    if (url === '/placeholder.png') continue
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  }
}
