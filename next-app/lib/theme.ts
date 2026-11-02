/**
 * Thèmes de l'interface.
 *
 * Le thème est porté par l'attribut `data-theme` sur `<html>` et consommé
 * en CSS (voir `app/themes.css`), qui suffit à re-skinner l'application
 * entière sans toucher un composant.
 *
 * Une exception assumée : la page Docker lit le thème via `useTheme()` pour
 * changer non pas ses couleurs mais sa **mise en page** — cartes en
 * `classique`, console tabulaire en `ardoise`. Les deux présentations
 * partagent tous leurs hooks et n'exposent que des composants différents.
 * Si d'autres pages suivent, garder ce principe : le thème choisit un
 * composant, il ne dissémine pas de conditions dans le code métier.
 *
 * La préférence est stockée dans le navigateur, pas en base : c'est un réglage
 * d'affichage personnel, il n'a pas à voyager avec le compte ni à passer par le
 * serveur.
 */

export const THEMES = [
  {
    id: 'studio',
    name: 'Studio',
    description: 'Surfaces graphite, navigation lisible et accents bleus discrets.',
  },
  {
    id: 'classique',
    name: 'Classique',
    description: 'Le thème historique : fond dégradé, accents indigo.',
  },
  {
    id: 'ardoise',
    name: 'Ardoise',
    description:
      "Sombre et plat, filets fins, accent discret. Présente Docker en console dense plutôt qu'en cartes.",
  },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'studio'

export const THEME_STORAGE_KEY = 'mediahub:theme'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((t) => t.id === value)
}

/**
 * Script injecté dans le <head>, avant le premier rendu.
 *
 * Il doit rester synchrone et sans dépendance : s'il s'exécutait après le
 * premier paint, l'utilisateur verrait le thème par défaut clignoter avant de
 * basculer sur le sien.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(${JSON.stringify(
  THEMES.map((t) => t.id)
)}.indexOf(t)===-1){t=${JSON.stringify(
  DEFAULT_THEME
)};}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(
  DEFAULT_THEME
)});}})();`
