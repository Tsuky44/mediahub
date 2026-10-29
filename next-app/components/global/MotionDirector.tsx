'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { NAVIGATION_ITEMS } from './navbar/_constants/navigation-items'
import { isPhoneScreen } from '@/lib/screen'

/**
 * Mise en scène des changements de page et des fenêtres sur écran large (voir app/motion.css).
 *
 * Pages : au clic sur un lien, le sens du trajet est posé sur <html data-onyx-nav> : glissé vers
 * la droite ou la gauche entre sections voisines de la barre de navigation, plongée vers une fiche
 * (l'affiche cliquée se retourne sur l'image de fond de la fiche et fonce s'y poser, ou s'avance
 * au centre si l'image n'est pas connue), remontée quand on en ressort. La View
 * Transition ne joue que la sortie de l'ancienne page, brève : tant qu'elle dure, React retient
 * l'affichage du contenu qui arrive. L'arrivée de la nouvelle page est jouée sur la page
 * elle-même (motion.css), sans rien bloquer.
 *
 * Fenêtres : elles jaillissent du bouton cliqué et y retournent en se fermant. La fermeture
 * est jouée sur une copie inerte, puisque React a déjà retiré la fenêtre.
 */

type NavKind = 'next' | 'prev' | 'dive' | 'hero' | 'fly' | 'rise'

/** Fiches (média, personne, collection, torrent) : on y plonge depuis les listes */
const DETAIL = /^\/dashboard\/(media\/(?!discover(?:\/|$))[^/]+|person\/[^/]+|downloads\/[^/]+)/
const MEDIA_PAGE = /^\/dashboard\/media\/(?!discover$|collection$)[^/]+$/
const SECTIONS = NAVIGATION_ITEMS.map((item) => item.href)
const VEIL = '[class*="bg-black/"]'

const depth = (path: string) => path.split('/').filter(Boolean).length
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
/** Téléphone : pas de transition de page (template.tsx), seul l'envol vers une fiche est joué */
const calm = () => isPhoneScreen() || still()

/** Rang de la section dans la barre de navigation, -1 hors des sections */
function sectionOf(path: string) {
  let best = -1
  SECTIONS.forEach((href, i) => {
    if ((path === href || path.startsWith(`${href}/`)) && (best < 0 || href.length > SECTIONS[best].length)) best = i
  })
  return best === 0 && path !== SECTIONS[0] ? -1 : best
}

function navKind(from: string, to: string): Exclude<NavKind, 'hero' | 'fly'> | null {
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
const nav: { token: number; ghost: HeroGhost | null; fly: FlyGhost | null } = { token: 0, ghost: null, fly: null }

interface HeroGhost {
  layer: HTMLElement
  poster: HTMLElement
  frame: HTMLElement
  flight: Animation
}

function clearNav() {
  delete document.documentElement.dataset.onyxNav
  document.querySelectorAll('.onyx-page[data-onyx-leaving]').forEach((el) => el.removeAttribute('data-onyx-leaving'))
}

/** Efface le sens après `delay`, sauf si un autre trajet a commencé entre-temps */
function clearNavLater(delay: number) {
  const token = nav.token
  window.setTimeout(() => {
    if (token === nav.token) clearNav()
  }, delay)
}

/**
 * Plongée depuis une affiche : une copie de la carte (son cadre, sans les textes de survol)
 * se soulève dès le clic, sans attendre le serveur, et s'avance au centre de l'écran pendant
 * que la page quittée s'assombrit. Elle se dissout quand la fiche est arrivée derrière elle.
 * La copie bouge à l'intérieur d'un calque fixe plein écran : pendant la transition de page, ce
 * calque garde la même place et son contenu reste animé, l'affiche ne se fige donc jamais.
 */
function launchHero(frame: HTMLElement) {
  const box = frame.getBoundingClientRect()
  if (!box.width || !box.height) return
  const style = getComputedStyle(frame)
  const layer = document.createElement('div')
  layer.className = 'onyx-hero-layer'
  layer.setAttribute('aria-hidden', 'true')
  const poster = frame.cloneNode(true) as HTMLElement
  poster.removeAttribute('id')
  poster.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  poster.inert = true
  poster.classList.add('onyx-hero-ghost')
  Object.assign(poster.style, {
    position: 'absolute',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    borderRadius: style.borderTopLeftRadius === '0px' ? '12px' : style.borderTopLeftRadius,
  })
  layer.appendChild(poster)
  document.body.appendChild(layer)
  frame.style.visibility = 'hidden'
  // Pose : centrée, à une hauteur d'affiche confortable (pas d'agrandissement démesuré)
  const scale = Math.min(Math.max((innerHeight * 0.56) / box.height, 1), 2.4)
  const dx = Math.round(innerWidth / 2 - (box.left + box.width / 2))
  const dy = Math.round(innerHeight * 0.46 - (box.top + box.height / 2))
  const pose = `translate(${dx}px, ${dy}px) scale(${scale.toFixed(3)})`
  const flight = poster.animate(
    [
      { transform: 'none', boxShadow: '0 0 0 rgb(0 0 0 / 0)' },
      { transform: 'translateY(-4px) scale(1.04)', boxShadow: '0 18px 40px rgb(0 0 0 / 0.45)', offset: 0.18 },
      { transform: pose, boxShadow: '0 40px 100px rgb(0 0 0 / 0.65)' },
    ],
    { duration: 380, easing: 'cubic-bezier(0.25, 0.9, 0.3, 1)', fill: 'forwards' }
  )
  nav.ghost = { layer, poster, frame, flight }
}

/**
 * La fiche est là : la copie de l'affiche se fond aussitôt dans la page (flou et fondu), tout en
 * finissant sa course, sans temps d'arrêt devant la fiche.
 */
function dissolveHero(restore = false) {
  const ghost = nav.ghost
  if (!ghost) return
  nav.ghost = null
  if (restore) ghost.frame.style.visibility = ''
  const out = ghost.poster.animate(
    [
      { opacity: 1, filter: 'blur(0px)' },
      { opacity: 0.85, filter: 'blur(2px)', offset: 0.3 },
      { opacity: 0, filter: 'blur(16px)' },
    ],
    { duration: 420, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
  )
  const remove = () => ghost.layer.remove()
  out.onfinish = remove
  out.oncancel = remove
}

/* ---------- Envol vers une fiche : l'affiche se retourne sur l'image de fond ---------- */

/**
 * Image de fond de la fiche (MediaBackdrop) : bord à bord, cadrée au quart haut
 * (object-[center_25%]) et zoomée à 110 % au départ (onyx-kenburns). Images TMDB en 16:9.
 */
const BACKDROP = { focusY: 0.25, zoom: 1.1, ratio: 16 / 9 }
/** Temps forts (ms) : la carte se retourne, l'image fonce à sa place, s'y écrase et rebondit */
const FLY = { turn: 420, flight: 430, squash: 520 }
const LAND = FLY.turn + FLY.flight

interface FlyGhost {
  layer: HTMLElement
  frame: HTMLElement
  flight: HTMLElement
  /** Fin de l'écrasement (horloge des animations, pas des minuteurs) */
  squashed: Promise<unknown>
  landed: boolean
  done: boolean
  observer: MutationObserver
}

function backdropImage(src: string, className: string) {
  const img = new Image()
  img.alt = ''
  img.decoding = 'async'
  img.draggable = false
  img.className = className
  img.src = src
  return img
}

const lerp = (a: number, b: number, p: number) => a + (b - a) * p

/** Hauteur de l'image de fond de la fiche (MediaBackdrop : h-[70vh] md:h-[88vh]), en unités CSS */
function backdropHeight() {
  const probe = document.createElement('div')
  probe.style.cssText = `position:fixed;top:0;visibility:hidden;pointer-events:none;height:${isPhoneScreen() ? 70 : 88}vh`
  document.body.appendChild(probe)
  const height = probe.offsetHeight
  probe.remove()
  return height
}

/** Affiche floutée sous l'image de fond tant que celle-ci n'est pas prête (réseau lent) */
function placeholder(poster: string | undefined, cover: HTMLImageElement) {
  if (!poster || cover.complete) return []
  const blur = backdropImage(poster, 'onyx-fly-blur')
  cover.decode().then(
    () => blur.remove(),
    () => undefined
  )
  return [blur]
}

/**
 * La carte cliquée (copie de son cadre) se soulève et se retourne : au dos, l'image de fond de la
 * fiche. Relayée par une copie plein écran de cette image, qui fonce jusqu'à la place exacte de
 * l'image de fond de la fiche en s'étirant, s'y écrase et rebondit légèrement. Tout est calculé à
 * l'avance et ne bouge que par transformations : fluide même pendant que la fiche se charge.
 * La fiche reste masquée jusqu'à l'atterrissage ; la copie se glisse alors sous ses textes (qui
 * tombent en place pendant l'écrasement), puis s'efface sur l'image de la fiche, identique.
 */
function launchFly(frame: HTMLElement, backdrop: string) {
  const box = frame.getBoundingClientRect()
  if (!box.width || !box.height) return false
  const radius = parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 12
  const W = document.documentElement.clientWidth
  const H = backdropHeight()
  const poster = frame.querySelector('img')?.currentSrc || undefined

  const layer = document.createElement('div')
  layer.className = 'onyx-hero-layer onyx-fly-layer'
  layer.setAttribute('aria-hidden', 'true')

  // Carte à la taille de l'affiche : recto la copie de l'affiche, verso l'image de fond
  const card = document.createElement('div')
  card.className = 'onyx-fly-card'
  Object.assign(card.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    borderRadius: `${radius}px`,
  })
  const turn = document.createElement('div')
  turn.className = 'onyx-fly-turn'
  const front = frame.cloneNode(true) as HTMLElement
  front.removeAttribute('id')
  front.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  front.classList.add('onyx-hero-ghost', 'onyx-fly-face')
  const back = document.createElement('div')
  back.className = 'onyx-fly-face onyx-fly-back'
  const cover = backdropImage(backdrop, 'onyx-fly-cover')
  back.append(...placeholder(poster, cover), cover)
  turn.append(front, back)
  card.append(turn)

  // Image plein écran, à sa taille finale, ramenée à chaque image au cadre du moment
  const flight = document.createElement('div')
  flight.className = 'onyx-fly'
  flight.style.width = `${W}px`
  flight.style.height = `${H}px`
  const squash = document.createElement('div')
  squash.className = 'onyx-fly-squash'
  const end = W / H > BACKDROP.ratio ? { w: W, h: W / BACKDROP.ratio } : { w: H * BACKDROP.ratio, h: H }
  const img = backdropImage(backdrop, 'onyx-fly-img')
  img.style.width = `${end.w}px`
  img.style.height = `${end.h}px`
  squash.append(...placeholder(poster, img), img)
  flight.append(squash)

  layer.append(card, flight)
  document.body.appendChild(layer)
  frame.style.visibility = 'hidden'

  card.animate(
    [
      { scale: 1, boxShadow: '0 0 0 rgb(0 0 0 / 0)' },
      { scale: 1.08, boxShadow: '0 30px 70px rgb(0 0 0 / 0.6)', offset: 0.55 },
      { scale: 1, boxShadow: '0 12px 30px rgb(0 0 0 / 0.4)' },
    ],
    { duration: FLY.turn, easing: 'ease-in-out', fill: 'both' }
  )
  turn.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }], {
    duration: FLY.turn,
    easing: 'cubic-bezier(0.45, 0, 0.2, 1)',
    fill: 'both',
  })
  // Relais : retournée, la carte montre exactement ce que montre l'image plein écran à cet instant
  const relay: KeyframeAnimationOptions = { duration: 1, delay: FLY.turn, fill: 'both' }
  card.animate([{ opacity: 1 }, { opacity: 0 }], relay)
  flight.animate([{ opacity: 0 }, { opacity: 1 }], relay)

  // Trajet : cadre de l'affiche -> place de l'image de fond. Le conteneur est agrandi (non
  // uniformément), l'image l'est en sens inverse pour rester « cover » du cadre du moment.
  const outer: Keyframe[] = []
  const inner: Keyframe[] = []
  const corner: Keyframe[] = []
  const N = 40
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1)
    const r = { x: lerp(box.left, 0, p), y: lerp(box.top, 0, p), w: lerp(box.width, W, p), h: lerp(box.height, H, p) }
    const sx = r.w / W
    const sy = r.h / H
    const dw = Math.max(r.w, r.h * BACKDROP.ratio)
    const dh = dw / BACKDROP.ratio
    const k = (BACKDROP.zoom * dw) / end.w
    const tx = (r.w / 2 - (BACKDROP.zoom * dw) / 2) / sx
    const ty = (r.h / 2 + BACKDROP.zoom * ((r.h - dh) * BACKDROP.focusY - r.h / 2)) / sy
    const round = radius * (1 - p)
    outer.push({ transform: `translate(${r.x}px, ${r.y}px) scale(${sx}, ${sy})` })
    // La fiche montre son image à 80 % sur le fond de la page
    inner.push({ transform: `translate(${tx}px, ${ty}px) scale(${k / sx}, ${k / sy})`, opacity: 1 - 0.2 * p })
    corner.push({ borderRadius: `${round / sx}px / ${round / sy}px` })
  }
  const trip: KeyframeAnimationOptions = { duration: FLY.flight, delay: FLY.turn, easing: 'cubic-bezier(0.5, 0, 0.75, 0.3)', fill: 'both' }
  const landing = flight.animate(outer, trip)
  img.animate(inner, trip)
  squash.animate(corner, trip)

  // Étirée par la vitesse, écrasée à l'arrivée, un rebond, posée ; un éclat de lumière à l'impact
  const total = LAND + FLY.squash
  const bounce = squash.animate(
    [
      { scale: '1 1', offset: 0 },
      { scale: '1 1', offset: FLY.turn / total },
      { scale: '0.99 1.035', offset: LAND / total },
      { scale: '1.024 0.952', offset: (LAND + 140) / total },
      { scale: '0.996 1.012', offset: (LAND + 290) / total },
      { scale: '1 1', offset: 1 },
    ].map((kf) => ({ ...kf, easing: 'ease-in-out' })),
    { duration: total, fill: 'both' }
  )
  img.animate(
    [
      { filter: 'brightness(1)', offset: 0 },
      { filter: 'brightness(1)', offset: LAND / total },
      { filter: 'brightness(1.14)', offset: (LAND + 40) / total },
      { filter: 'brightness(1)', offset: 1 },
    ].map((kf) => ({ ...kf, easing: 'ease-out' })),
    { duration: total, fill: 'both' }
  )

  // La fiche reste masquée jusqu'à l'atterrissage, puis on guette son image de fond
  document.documentElement.dataset.onyxFly = ''
  const fly: FlyGhost = {
    layer,
    frame,
    flight,
    squashed: bounce.finished.catch(() => undefined),
    landed: false,
    done: false,
    observer: new MutationObserver(() => settleFly()),
  }
  fly.observer.observe(document.body, { childList: true, subtree: true })
  // Atterrissage à la fin réelle du trajet (les animations démarrent à l'image suivante, parfois
  // plus tard si la page est occupée)
  landing.finished.then(
    () => {
      fly.landed = true
      settleFly()
    },
    () => undefined
  )
  nav.fly = fly
  return true
}

/**
 * Atterrissage, dès que l'image a atteint sa place et que la fiche est là : la copie passe dans la
 * fiche, juste au-dessus de son image de fond (sous ses fondus et ses textes), et la fiche
 * apparaît, ses textes tombant en place. La copie s'efface une fois l'écrasement joué et l'image
 * de la fiche prête.
 */
function settleFly() {
  const fly = nav.fly
  if (!fly || !fly.landed || fly.done) return
  const page = document.querySelector<HTMLElement>('.onyx-page:not([data-onyx-leaving])')
  const target = page?.querySelector<HTMLElement>('[data-onyx-backdrop]')
  if (!page || !target) return
  fly.done = true
  fly.observer.disconnect()
  page.setAttribute('data-onyx-drop', '')
  delete document.documentElement.dataset.onyxFly
  const backdrop = target.querySelector<HTMLImageElement>(':scope > img')
  if (!backdrop) {
    // Fiche sans image de fond : la copie s'efface sur place
    nav.fly = null
    const out = fly.layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' })
    out.onfinish = () => fly.layer.remove()
    out.oncancel = () => fly.layer.remove()
    return
  }
  const box = target.getBoundingClientRect()
  fly.flight.style.left = `${-box.left}px`
  fly.flight.style.top = `${-box.top}px`
  backdrop.after(fly.flight)
  fly.layer.remove()
  const decoded = backdrop.decode().catch(() => undefined)
  const late = new Promise((done) => window.setTimeout(done, 2500))
  void Promise.race([Promise.all([decoded, fly.squashed]), late]).then(() => fadeFly(fly))
}

function fadeFly(fly: FlyGhost) {
  if (nav.fly === fly) nav.fly = null
  const out = fly.flight.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease-out', fill: 'forwards' })
  out.onfinish = () => fly.flight.remove()
  out.oncancel = () => fly.flight.remove()
}

/** Envol interrompu (autre clic, retour, fiche trop longue à venir) : la copie s'efface */
function dropFly(restore = false) {
  const fly = nav.fly
  if (!fly) return
  nav.fly = null
  fly.observer.disconnect()
  delete document.documentElement.dataset.onyxFly
  if (restore) fly.frame.style.visibility = ''
  if (fly.done) return
  const out = fly.layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' })
  out.onfinish = () => fly.layer.remove()
  out.oncancel = () => fly.layer.remove()
}

/** Image de fond d'une fiche : chargée dès que le pointeur s'attarde sur sa carte */
const preloaded = new Set<string>()
let intent = 0

function preloadBackdrop(src: string | undefined) {
  if (!src || preloaded.has(src)) return
  preloaded.add(src)
  backdropImage(src, '')
}

function onPointerOver(event: PointerEvent) {
  window.clearTimeout(intent)
  const link = (event.target as Element | null)?.closest?.('a[data-onyx-backdrop]')
  if (!(link instanceof HTMLAnchorElement) || still()) return
  intent = window.setTimeout(() => preloadBackdrop(link.dataset.onyxBackdrop), 140)
}

function prepareNav(kind: NavKind, frame?: HTMLElement, backdrop?: string) {
  clearNav()
  dissolveHero(true)
  dropFly(true)
  // Sans image de fond connue (ou affiche invisible), l'affiche s'avance au centre (écran large)
  if (kind === 'fly' && !(frame && backdrop && launchFly(frame, backdrop))) {
    if (isPhoneScreen()) return
    kind = 'hero'
  }
  document.documentElement.dataset.onyxNav = kind
  // La page quittée est marquée : l'arrivée animée ne concerne que la nouvelle page
  document.querySelectorAll('.onyx-page').forEach((el) => el.setAttribute('data-onyx-leaving', ''))
  if (frame && kind === 'hero') launchHero(frame)
  nav.token++
  const token = nav.token
  // Filet de sécurité si le clic ne mène finalement nulle part
  window.setTimeout(() => {
    if (token !== nav.token) return
    clearNav()
    dissolveHero(true)
    dropFly(true)
  }, 6000)
}

/**
 * Ce que l'on voit de l'affiche : son cadre (coins arrondis, découpe) plutôt que l'image seule,
 * qui peut être agrandie au survol et déborder de sa carte.
 */
function posterFrame(image: Element) {
  const imageBox = image.getBoundingClientRect()
  const area = imageBox.width * imageBox.height
  let frame: Element = image
  let el = image.parentElement
  for (let level = 0; el && level < 4; level++, el = el.parentElement) {
    const style = getComputedStyle(el)
    const box = el.getBoundingClientRect()
    if (box.width * box.height > area * 2.2) break
    if (style.overflow !== 'visible') {
      frame = el
      if (parseFloat(style.borderTopLeftRadius) > 0) break
    }
  }
  return frame
}

/**
 * Prépare la mise en scène d'une navigation vers `href` lancée sans lien (router.push…).
 * `hero` : l'élément qui s'envole vers une fiche (affiche d'une infobulle…) ; `backdrop` : l'image
 * de fond de cette fiche, si on la connaît.
 */
export function prepareNavTo(href: string, hero?: Element | null, backdrop?: string) {
  if (still()) return
  const url = new URL(href, location.href)
  if (url.origin !== location.origin) return
  const kind = navKind(location.pathname, url.pathname)
  if (!kind) return
  const toMedia = hero instanceof HTMLElement && kind === 'dive' && MEDIA_PAGE.test(url.pathname)
  if (isPhoneScreen()) {
    // Téléphone : l'envol seulement ; tout autre trajet laisse la page changer normalement
    if (toMedia && backdrop) prepareNav('fly', hero, backdrop)
    else {
      clearNav()
      dropFly(true)
    }
  } else if (toMedia) prepareNav('fly', hero, backdrop)
  else prepareNav(kind)
}

function onLinkClick(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || still()) return
  const link = (event.target as Element | null)?.closest?.('a[href]')
  if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== '_self') || link.hasAttribute('download')) return
  const image = link.closest('.onyx-page') ? link.querySelector('img') : null
  prepareNavTo(link.href, image && posterFrame(image), link.dataset.onyxBackdrop)
}

/* ---------- Fenêtres ---------- */

let pointer = { x: 0, y: 0, at: -Infinity }

function onPointerDown(event: PointerEvent) {
  pointer = { x: event.clientX, y: event.clientY, at: performance.now() }
  const link = (event.target as Element | null)?.closest?.('a[data-onyx-backdrop]')
  if (link instanceof HTMLAnchorElement && !still()) preloadBackdrop(link.dataset.onyxBackdrop)
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
    // Retour arrière : remontée sur écran large ; sur téléphone, un envol en cours s'efface
    const onBack = () => (calm() ? dropFly(true) : prepareNav('rise'))
    document.addEventListener('click', onLinkClick, true)
    document.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    document.addEventListener('pointerover', onPointerOver, { passive: true })
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('popstate', onBack)
    return () => {
      observer.disconnect()
      document.removeEventListener('click', onLinkClick, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('popstate', onBack)
    }
  }, [])

  // La nouvelle page est là : la copie de l'affiche s'y fond aussitôt ; le sens reste posé le
  // temps de l'arrivée, puis s'efface
  useEffect(() => {
    const token = nav.token
    const id = window.setTimeout(() => token === nav.token && dissolveHero(), 60)
    // Envol : la fiche a 2,5 s pour poser son image de fond, sinon elle s'affiche telle quelle
    const giveUp = window.setTimeout(() => token === nav.token && !nav.fly?.done && dropFly(true), 2500)
    clearNavLater(1200)
    return () => {
      window.clearTimeout(id)
      window.clearTimeout(giveUp)
    }
  }, [pathname])

  return null
}
