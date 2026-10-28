'use client'

import { ViewTransition, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { PHONE_QUERY } from '@/lib/screen'

let guardInstalled = false
let transitionsDisabled = false

/**
 * Sur un écran de téléphone, pas de transition de page : sur mobile, elle décalait
 * les boutons flottants au défilement. React démarre une transition dès qu'un
 * <ViewTransition> est monté ; on lui présente donc le navigateur comme ne gérant
 * pas les View Transitions (chemin prévu par React : la page change normalement).
 */
function installPhoneTransitionGuard() {
  if (guardInstalled) return
  guardInstalled = true
  const query = window.matchMedia(PHONE_QUERY)
  const apply = () => {
    if (query.matches && !transitionsDisabled) {
      Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true, writable: true })
      transitionsDisabled = true
    } else if (!query.matches && transitionsDisabled) {
      // La méthode du prototype redevient visible
      delete (document as Partial<Pick<Document, 'startViewTransition'>>).startViewTransition
      transitionsDisabled = false
    }
  }
  apply()
  query.addEventListener('change', apply)
}

/**
 * Remonté à chaque navigation. Les navigations de Next étant des transitions React,
 * l'ancienne et la nouvelle page forment une paire « onyx-page » animée par le
 * navigateur (View Transitions, voir app/motion.css) : l'ancienne recule et
 * s'estompe pendant que les blocs de la nouvelle arrivent un à un. Les
 * rafraîchissements de données ne déclenchent rien (default="none"). Sur
 * téléphone, seule l'arrivée des blocs est jouée (onyx-arrive, partout).
 *
 * Next ne remonte ce gabarit que si la rubrique change (/dashboard/media → fiche
 * reste dans « media ») : la clé sur l'adresse donne aussi une paire ancienne /
 * nouvelle page dans une même rubrique (médiathèque → fiche, fiche → fiche).
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  useEffect(installPhoneTransitionGuard, [])
  const pathname = usePathname()
  return (
    <ViewTransition key={pathname} name="onyx-page" default="none" share="auto">
      <div className="onyx-page">{children}</div>
    </ViewTransition>
  )
}
