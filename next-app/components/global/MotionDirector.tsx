'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { NAVIGATION_ITEMS } from './navbar/_constants/navigation-items'
import { isPhoneScreen } from '@/lib/screen'

/**
 * Mise en scène des changements de page et des fenêtres sur écran large (voir app/motion.css).
 *
 * Pages : au clic sur un lien, le sens du trajet est posé sur <html data-onyx-nav> avant la
 * View Transition : glissé vers la droite ou la gauche entre sections voisines de la barre de
 * navigation, plongée vers une fiche (l'affiche cliquée s'envole et grandit vers le centre de
 * l'écran), remontée quand on en ressort.
 *
 * Fenêtres : elles jaillissent du bouton cliqué et y retournent en se fermant. La fermeture
 * est jouée sur une copie inerte, puisque React a déjà retiré la fenêtre.
 */

type NavKind = 'next' | 'prev' | 'dive' | 'hero' | 'rise'

/** Fiches (média, personne, collection, torrent) : on y plonge depuis les listes */
const DETAIL = /^\/dashboard\/(media\/(?!discover(?:\/|$))[^/]+|person\/[^/]+|downloads\/[^/]+)/
const MEDIA_PAGE = /^\/dashboard\/media\/(?!discover$|collection$)[^/]+$/
const SECTIONS = NAVIGATION_ITEMS.map((item) => item.href)
const VEIL = '[class*="bg-black/"]'

const depth = (path: string) => path.split('/').filter(Boolean).length
const calm = () => isPhoneScreen() || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Rang de la section dans la barre de navigation, -1 hors des sections */
function sectionOf(path: string) {
  let best = -1
  SECTIONS.forEach((href, i) => {
    if ((path === href || path.startsWith(`${href}/`)) && (best < 0 || href.length > SECTIONS[best].length)) best = i
  })
  return best === 0 && path !== SECTIONS[0] ? -1 : best
}

function navKind(from: string, to: string): Exclude<NavKind, 'hero'> | null {
  if (from === to) return null
  const toDetail = DETAIL.test(to)
  const fromDetail = DETAIL.test(from)
  if (toDetail !== fromDetail) return toDetail ? 'dive' : 'rise'
  if (!toDetail) {
    const a = sectionOf(from)
    const b = sectionOf(to)
    if (a >= 0 && b >= 0 && a !== b) return b > a ? 'next' : 'prev'
  }
  return depth(to) >= depth(from) ? 'dive' : 'rise'
}

// État partagé dans un objet : un simple `let` relu dans un délai peut être figé à la compilation
const nav: { token: number; hero: Element | null } = { token: 0, hero: null }
const HERO_VARS = ['--onyx-hero-x', '--onyx-hero-y', '--onyx-hero-scale']

function clearNav() {
  const root = document.documentElement
  delete root.dataset.onyxNav
  HERO_VARS.forEach((name) => root.style.removeProperty(name))
  nav.hero?.removeAttribute('data-onyx-hero')
  nav.hero = null
}

/** Efface le sens après `delay`, sauf si un autre trajet a commencé entre-temps */
function clearNavLater(delay: number) {
  const token = nav.token
  window.setTimeout(() => {
    if (token === nav.token) clearNav()
  }, delay)
}

function prepareNav(kind: NavKind, image?: Element) {
  clearNav()
  const root = document.documentElement
  root.dataset.onyxNav = kind
  if (image) {
    // L'affiche cliquée sort de la page (paire « onyx-hero ») et file vers le haut de l'écran
    // en grandissant, pendant que la fiche approche derrière elle
    const box = image.getBoundingClientRect()
    root.style.setProperty('--onyx-hero-x', `${Math.round(innerWidth / 2 - (box.left + box.width / 2))}px`)
    root.style.setProperty('--onyx-hero-y', `${Math.round(innerHeight * 0.4 - (box.top + box.height / 2))}px`)
    root.style.setProperty('--onyx-hero-scale', `${Math.min(innerWidth / Math.max(box.width, 1), 6).toFixed(2)}`)
    nav.hero = image
    image.setAttribute('data-onyx-hero', '')
  }
  nav.token++
  // Filet de sécurité si le clic ne mène finalement nulle part
  clearNavLater(5000)
}

function onLinkClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || calm()) return
  const link = (event.target as Element | null)?.closest?.('a[href]')
  if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download')) return
  const url = new URL(link.href)
  if (url.origin !== location.origin) return
  const kind = navKind(location.pathname, url.pathname)
  if (!kind) return
  const poster = kind === 'dive' && MEDIA_PAGE.test(url.pathname) && link.closest('.onyx-page')
    ? link.querySelector('img')
    : null
  if (poster) prepareNav('hero', poster)
  else prepareNav(kind)
}

/* ---------- Fenêtres ---------- */

let pointer = { x: 0, y: 0, at: -Infinity }

function onPointerDown(event: PointerEvent) {
  pointer = { x: event.clientX, y: event.clientY, at: performance.now() }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const box = document.activeElement?.getBoundingClientRect()
  if (box) pointer = { x: box.left + box.width / 2, y: box.top + box.height / 2, at: performance.now() }
}

function isOverlay(el: Element): boolean {
  return el instanceof HTMLElement
    && el.matches('.fixed.inset-0')
    && !el.hasAttribute('data-onyx-ghost')
    && (el.matches(VEIL) || el.querySelector(`:scope > .absolute.inset-0${VEIL}`) !== null)
}

/** Fenêtres ajoutées ou retirées : le nœud lui-même ou un enveloppe proche (portail, fragment) */
function overlaysIn(node: Node): HTMLElement[] {
  if (!(node instanceof HTMLElement)) return []
  if (isOverlay(node)) return [node]
  return Array.from(node.querySelectorAll<HTMLElement>(':scope > .fixed.inset-0, :scope > * > .fixed.inset-0')).filter(isOverlay)
}

/** Origine de l'ouverture, depuis le centre de l'écran : le dernier clic s'il est récent */
function stampOrigin(overlay: HTMLElement) {
  const fresh = performance.now() - pointer.at < 1500
  overlay.style.setProperty('--onyx-ox', `${Math.round(fresh ? pointer.x - innerWidth / 2 : 0)}px`)
  overlay.style.setProperty('--onyx-oy', `${Math.round(fresh ? pointer.y - innerHeight / 2 : 48)}px`)
}

function windowOf(overlay: HTMLElement) {
  return Array.from(overlay.children).find((child) => !child.matches('.absolute, .fixed')) as HTMLElement | undefined
}

function playClose(overlay: HTMLElement) {
  const ghost = overlay.cloneNode(true) as HTMLElement
  ghost.setAttribute('data-onyx-ghost', '')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  // Aucun doublon d'identifiant ou de champ de formulaire le temps de la sortie
  ghost.removeAttribute('id')
  ghost.querySelectorAll('[id], [name]').forEach((el) => {
    el.removeAttribute('id')
    el.removeAttribute('name')
  })
  // Pas de lecture relancée ni de requête pour une copie qui vit 300 ms
  ghost.querySelectorAll('iframe, video, audio, canvas').forEach((media) => {
    const box = document.createElement('div')
    box.className = media.getAttribute('class') ?? ''
    box.style.background = '#000'
    media.replaceWith(box)
  })
  document.body.appendChild(ghost)
  const ox = ghost.style.getPropertyValue('--onyx-ox') || '0px'
  const oy = ghost.style.getPropertyValue('--onyx-oy') || '48px'
  const veil = ghost.matches(VEIL) ? null : ghost.querySelector<HTMLElement>(`:scope > .absolute.inset-0${VEIL}`)
  const fade = veil
    ? veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' })
    : ghost.animate([{}, { backgroundColor: 'rgb(0 0 0 / 0)', backdropFilter: 'blur(0px)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' })
  windowOf(ghost)?.animate(
    [
      { opacity: 1, translate: '0 0', scale: '1', filter: 'blur(0px)' },
      { opacity: 0, translate: `${ox} ${oy}`, scale: '0.3', filter: 'blur(10px)' },
    ],
    { duration: 300, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }
  )
  fade.onfinish = () => ghost.remove()
}

function onMutations(records: MutationRecord[]) {
  if (calm()) return
  const added: HTMLElement[] = []
  const removed: HTMLElement[] = []
  for (const record of records) {
    record.addedNodes.forEach((node) => added.push(...overlaysIn(node)))
    // Un nœud seulement déplacé est déjà revenu dans le document
    record.removedNodes.forEach((node) => !node.isConnected && removed.push(...overlaysIn(node)))
  }
  if (added.length && removed.length) {
    // Une fenêtre en remplace une autre (chargement puis contenu) : ni fermeture ni nouvelle
    // ouverture, seul le nouveau contenu se dépose
    for (const overlay of added) {
      overlay.setAttribute('data-onyx-swap', '')
      for (const name of ['--onyx-ox', '--onyx-oy']) overlay.style.setProperty(name, removed[0].style.getPropertyValue(name))
    }
    return
  }
  added.forEach(stampOrigin)
  removed.forEach(playClose)
}

export function MotionDirector() {
  const pathname = usePathname()

  useEffect(() => {
    const observer = new MutationObserver(onMutations)
    observer.observe(document.body, { childList: true, subtree: true })
    const onBack = () => !calm() && prepareNav('rise')
    document.addEventListener('click', onLinkClick, true)
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('popstate', onBack)
    return () => {
      observer.disconnect()
      document.removeEventListener('click', onLinkClick, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('popstate', onBack)
    }
  }, [])

  // La nouvelle page est là : le sens reste posé le temps de la transition, puis s'efface
  useEffect(() => {
    clearNavLater(1200)
  }, [pathname])

  return null
}
