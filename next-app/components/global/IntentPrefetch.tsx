'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { PrefetchKind } from 'next/dist/client/components/router-reducer/router-reducer-types'

/** Une page déjà préchargée n'est pas redemandée avant ce délai (cache du routeur : 30 s) */
const REUSE_MS = 25_000
/** Survol minimal avant de précharger : traverser une grille d'affiches ne charge rien */
const HOVER_MS = 60

/**
 * Préchargement complet d'une page dès que l'intention de clic se dessine : survol d'un lien
 * (au moins 60 ms), focus clavier, ou doigt posé sur l'écran. Entre ce moment et le clic
 * (souvent 150 à 400 ms), le serveur prépare la page ; au clic, elle s'affiche aussitôt, sans
 * squelette de chargement. Ne change rien d'autre : mêmes liens, même navigation.
 */
export function IntentPrefetch() {
  const router = useRouter()

  useEffect(() => {
    const done = new Map<string, number>()
    let timer: number | undefined

    const targetOf = (event: Event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download')) return null
      const url = new URL(link.href, location.href)
      if (url.origin !== location.origin || !url.pathname.startsWith('/dashboard')) return null
      const href = url.pathname + url.search
      return href === location.pathname + location.search ? null : href
    }
    const prefetch = (href: string) => {
      const now = Date.now()
      if (now - (done.get(href) ?? 0) < REUSE_MS) return
      done.set(href, now)
      router.prefetch(href, { kind: 'full' as PrefetchKind })
    }
    const onHover = (event: Event) => {
      window.clearTimeout(timer)
      const href = targetOf(event)
      if (href) timer = window.setTimeout(() => prefetch(href), HOVER_MS)
    }
    const onLeave = () => window.clearTimeout(timer)
    const onNow = (event: Event) => {
      const href = targetOf(event)
      if (href) prefetch(href)
    }

    document.addEventListener('pointerover', onHover, { passive: true })
    document.addEventListener('pointerout', onLeave, { passive: true })
    document.addEventListener('touchstart', onNow, { passive: true })
    document.addEventListener('focusin', onNow)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerover', onHover)
      document.removeEventListener('pointerout', onLeave)
      document.removeEventListener('touchstart', onNow)
      document.removeEventListener('focusin', onNow)
    }
  }, [router])

  return null
}
