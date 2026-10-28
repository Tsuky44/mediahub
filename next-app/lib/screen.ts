/** Largeur d'écran de téléphone (en dessous du point de rupture `md` de Tailwind, 768 px). */
export const PHONE_QUERY = '(max-width: 767px)'

export function isPhoneScreen(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches
}
