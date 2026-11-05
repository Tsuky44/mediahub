'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, Heart, Info, Loader2, Tv } from 'lucide-react'
import { PlayInPlatformButton } from '@/components/global/PlayInPlatformButton'
import { getPosterUrl } from '@/components/global/media-card/getPosterUrl'
import { useMediaCardActions } from '@/components/global/media-card/useMediaCardActions'
import { getLibraryPreview, type LibraryPreviewData } from '../preview-actions'

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Survol avant l'ouverture : traverser la grille n'ouvre rien */
const OPEN_MS = 520
/** Survol avant de demander les infos au serveur (prêtes à l'ouverture) */
const FETCH_MS = 160
/** Aperçu déjà ouvert, pointeur sur une autre affiche : fondu vers le nouveau, plus vite qu'une ouverture */
const SWITCH_MS = 240
const MARGIN = 12

// Infos déjà reçues (ou en cours) : un second survol s'ouvre complet aussitôt
const cache = new Map<string, Promise<LibraryPreviewData | null>>()
const ready = new Map<string, LibraryPreviewData | null>()
const load = (embyId: string) => {
  let pending = cache.get(embyId)
  if (!pending) {
    pending = getLibraryPreview(embyId).catch(() => null)
    pending.then((d) => ready.set(embyId, d))
    cache.set(embyId, pending)
    // Oublié au bout d'une minute : la progression a pu changer
    setTimeout(() => {
      cache.delete(embyId)
      ready.delete(embyId)
    }, 60_000)
  }
  return pending
}

/** À regarder plus tard et favori, en haut à droite de la bannière (état partagé avec l'affiche) */
function PreviewActions({ item }: { item: any }) {
  const { isFavorite, isWatchLater, isTogglingFavorite, isTogglingWatchLater, handleToggleFavorite, handleToggleWatchLater } =
    useMediaCardActions(item)
  const round = 'grid size-9 place-items-center rounded-full border transition-colors'
  const idle = 'border-white/15 bg-black/55 text-gray-200 hover:bg-black/75 hover:text-white'
  return (
    <div className="absolute right-3 top-3 z-10 flex gap-2">
      <button
        type="button"
        onClick={handleToggleWatchLater}
        disabled={isTogglingWatchLater}
        aria-pressed={isWatchLater}
        title={isWatchLater ? 'Retirer de « À regarder plus tard »' : 'À regarder plus tard'}
        className={`${round} ${isWatchLater ? 'border-white/40 bg-white/20 text-white' : idle}`}
      >
        {isTogglingWatchLater ? <Loader2 className="size-4 animate-spin" /> : <Tv className={`size-4 ${isWatchLater ? 'fill-current' : ''}`} />}
      </button>
      <button
        type="button"
        onClick={handleToggleFavorite}
        disabled={isTogglingFavorite}
        aria-pressed={isFavorite}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        className={`${round} ${isFavorite ? 'border-red-400/50 bg-red-500/25 text-red-300' : idle}`}
      >
        {isTogglingFavorite ? <Loader2 className="size-4 animate-spin" /> : <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />}
      </button>
    </div>
  )
}

interface Open {
  index: number
  rect: DOMRect
  /** Remplace un aperçu ouvert : l'ancien s'efface sur place pendant que le nouveau apparaît */
  switched?: boolean
}

type Shown = LibraryPreviewData & { endsAt?: string }

/** « Fin à 22:45 » : heure de fin si l'on lance la lecture maintenant */
const withEnd = (d: LibraryPreviewData | null | undefined): Shown | null | undefined =>
  d && d.status.minutes
    ? { ...d, endsAt: new Date(Date.now() + d.status.minutes * 60_000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
    : d

/**
 * Aperçu au survol d'une affiche de la médiathèque (souris seulement) : la bannière du média
 * (qui zoome doucement, comme l'affiche au survol), où l'on en est (épisode en cours, temps
 * restant, épisode suivant), « Reprendre / Lire dans » la plateforme de connexion, la fiche, et le
 * résumé. Il grandit depuis l'affiche ; quitter l'aperçu le referme.
 */
export function LibraryHoverPreview({ items, children }: { items: any[]; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null)
  const [closing, setClosing] = useState(false)
  const [data, setData] = useState<Shown | null | undefined>(undefined)
  const grid = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const timers = useRef<{ open?: number; fetch?: number; close?: number }>({})
  const hovered = useRef<number | null>(null)
  const canHover = useRef(false)
  // Clic vers la fiche : l'aperçu s'efface pendant l'envol (sans être retiré : le clic peut être rejoué)
  const leaving = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    canHover.current = mq.matches
    const sync = () => (canHover.current = mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const clear = (...keys: Array<'open' | 'fetch' | 'close'>) => keys.forEach((k) => window.clearTimeout(timers.current[k]))

  const close = useCallback(() => {
    clear('open', 'fetch', 'close')
    hovered.current = null
    setClosing(true)
  }, [])

  // Affiche sous le pointeur : enfant direct de la grille, et sa position dans la liste
  const cardIndex = (target: EventTarget | null) => {
    const root = grid.current?.firstElementChild
    let card = target instanceof Element ? target : null
    while (card && card.parentElement !== root) card = card.parentElement
    if (!root || !card) return null
    return { index: Array.prototype.indexOf.call(root.children, card) as number, card }
  }

  const leave = (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    clear('open', 'fetch', 'close')
    hovered.current = null
    leaving.current = true
    // Sous le calque de l'envol : son voile l'assombrit avec la page, la bannière s'agrandit par-dessus
    panel.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' })
    // Navigation annulée : l'aperçu se referme pour de bon
    window.setTimeout(() => {
      if (!leaving.current) return
      leaving.current = false
      setOpen(null)
    }, 4000)
  }

  const onPointerOver = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || !canHover.current || leaving.current) return
    // Événements de l'aperçu lui-même (portail, remontés par React) : rien à faire ici
    if (panel.current?.contains(event.target as Node)) return
    // Pointeur sur les boutons de l'affiche (à regarder plus tard, favori) : on vise ces boutons
    if ((event.target as Element).closest?.('button')) {
      clear('open')
      hovered.current = null
      return
    }
    const hit = cardIndex(event.target)
    if (!hit || hit.index === hovered.current) return
    // Retour sur l'affiche déjà en aperçu : il reste ouvert
    if (open && !closing && hit.index === open.index) {
      clear('open', 'close')
      hovered.current = hit.index
      return
    }
    const switching = Boolean(open && !closing)
    clear('open', 'fetch', 'close')
    hovered.current = hit.index
    const item = items[hit.index]
    if (!item?.emby_id && !item?.id) return
    const embyId = String(item.emby_id ?? item.id)
    timers.current.fetch = window.setTimeout(() => void load(embyId), FETCH_MS)
    timers.current.open = window.setTimeout(() => {
      if (hovered.current !== hit.index || !hit.card.isConnected) return
      // Fondu enchaîné : une copie de l'aperçu courant s'efface sur place, le nouveau apparaît
      const el = panel.current
      if (switching && el) {
        const ghost = el.cloneNode(true) as HTMLElement
        ghost.removeAttribute('role')
        ghost.removeAttribute('data-onyx-preview')
        ghost.setAttribute('aria-hidden', 'true')
        ghost.style.pointerEvents = 'none'
        document.body.appendChild(ghost)
        const fade = ghost.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.97)' }], {
          duration: 240,
          easing: 'ease-out',
          fill: 'forwards',
        })
        fade.onfinish = () => ghost.remove()
        fade.oncancel = () => ghost.remove()
      }
      setClosing(false)
      setData(ready.has(embyId) ? withEnd(ready.get(embyId)) : undefined)
      setOpen({ index: hit.index, rect: hit.card.getBoundingClientRect(), switched: switching })
      load(embyId).then((d) => {
        if (hovered.current === hit.index) setData(withEnd(d))
      })
    }, switching ? SWITCH_MS : OPEN_MS)
  }

  const onPointerOut = (event: React.PointerEvent) => {
    const to = event.relatedTarget as Node | null
    if (to && (panel.current?.contains(to) || cardIndex(to)?.index === hovered.current)) return
    if (cardIndex(event.target) === null) return
    // Sortie de l'affiche : rien ne s'ouvre ; aperçu ouvert : il se referme sauf si on y entre
    clear('open', 'fetch')
    hovered.current = null
    if (open) timers.current.close = window.setTimeout(close, 180)
  }

  // Défilement, Échap, changement de page : fermé
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('scroll', close, { passive: true, capture: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  useEffect(() => () => clear('open', 'fetch', 'close'), [])

  // Placement (centré sur l'affiche, dans l'écran) et ouverture : il grandit depuis l'affiche
  useLayoutEffect(() => {
    const el = panel.current
    if (!open || !el || closing) return
    const { rect } = open
    const width = Math.round(Math.min(420, Math.max(320, rect.width * 1.75), window.innerWidth - MARGIN * 2))
    el.style.width = `${width}px`
    const height = el.offsetHeight
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const left = Math.min(Math.max(MARGIN, cx - width / 2), window.innerWidth - width - MARGIN)
    // Jamais sous la barre de navigation
    const minTop = (document.querySelector('nav')?.getBoundingClientRect().bottom ?? 0) + MARGIN
    const top = Math.min(Math.max(minTop, cy - height / 2), Math.max(minTop, window.innerHeight - height - MARGIN))
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.transformOrigin = `${cx - left}px ${cy - top}px`
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Passage d'une affiche à l'autre : le nouvel aperçu apparaît en fondu, sur place
    if (open.switched) {
      el.animate([{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'scale(1)' }], {
        duration: 280,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      })
      return
    }
    const from = Math.max(0.45, rect.width / width)
    el.animate([{ opacity: 0, transform: `scale(${from})` }, { opacity: 1, transform: 'scale(1)' }], {
      duration: 300,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    })
  }, [open, closing])

  // Infos arrivées : la hauteur change, l'aperçu reste dans l'écran (sans rejouer l'ouverture)
  useLayoutEffect(() => {
    const el = panel.current
    if (!open || !el || closing) return
    const top = parseFloat(el.style.top)
    const height = el.offsetHeight
    if (top + height > window.innerHeight - MARGIN) el.style.top = `${Math.max(MARGIN, window.innerHeight - height - MARGIN)}px`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Fermeture : se résorbe vers l'affiche, puis disparaît
  useEffect(() => {
    if (!closing || !open) return
    const el = panel.current
    if (!el) return void setOpen(null)
    const out = el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.94)' }], {
      duration: 140,
      easing: 'ease-out',
      fill: 'forwards',
    })
    out.onfinish = () => {
      setOpen(null)
      setClosing(false)
    }
  }, [closing, open])

  // Nouvelle page : l'effacement de l'envol est terminé
  useEffect(() => () => void (leaving.current = false), [])

  const item = open ? items[open.index] : null
  const href = item ? `/dashboard/media/${item.tmdbId || item.id}?type=${item.media_type || 'movie'}` : '#'
  const backdrop = item?.backdrop_path ? getPosterUrl(item.backdrop_path, 'original') : undefined
  const banner = item?.backdrop_path ? getPosterUrl(item.backdrop_path, 'w780') : item ? getPosterUrl(item.poster_path, 'w500') : ''
  const title = item?.title || item?.name || ''
  const tmdbId = parseInt(String(item?.tmdbId ?? '')) || 0

  return (
    <div ref={grid} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      {children}
      {open &&
        item &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={`Aperçu : ${title}`}
            data-onyx-preview
            onPointerEnter={() => clear('close')}
            onPointerLeave={() => {
              hovered.current = null
              if (!leaving.current) timers.current.close = window.setTimeout(close, 180)
            }}
            // Sous la barre de navigation (50) et sous l'envol (45, motion.css) : le voile de l'envol
            // l'assombrit avec la page pendant que la bannière s'agrandit par-dessus
            style={{ position: 'fixed', top: -9999, left: -9999, zIndex: 44 }}
            className="onyx-preview overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161717] shadow-[0_30px_70px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="relative">
            <PreviewActions item={item} />
            {/* Bannière : au clic, c'est elle qui se retourne et s'envole vers la fiche (MotionDirector) */}
            <Link href={href} data-onyx-backdrop={backdrop} data-onyx-preview-banner onClick={leave} className="relative block aspect-video overflow-hidden bg-gray-900">
              {banner && <img key={banner} src={banner} alt="" decoding="async" className="onyx-preview-banner absolute inset-0 h-full w-full object-cover" />}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161717] via-transparent to-transparent" />
              {data?.status.progress != null && (
                <span aria-hidden className="absolute inset-x-4 bottom-3 h-1 overflow-hidden rounded-full bg-white/20">
                  <span className="block h-full rounded-full bg-[#f2f0ed]" style={{ width: `${Math.round(data.status.progress * 100)}%` }} />
                </span>
              )}
            </Link>
            </div>

            <div className="space-y-3 px-4 pb-4 pt-2">
              <div>
                <Link href={href} data-onyx-backdrop={backdrop} onClick={leave} className="block truncate text-lg font-bold text-white hover:text-gray-200">
                  {title}
                </Link>
                {data?.tagline && <p className="truncate text-xs italic text-gray-400">{data.tagline}</p>}
                {data === undefined ? (
                  <span aria-hidden className="onyx-skeleton mt-1.5 block h-4 w-2/3 rounded" />
                ) : data ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-gray-300">
                    {data.status.kind === 'watched' && <Check className="size-3.5 text-[#85c174]" />}
                    <span className="min-w-0 truncate">{data.status.line}</span>
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {data === undefined ? (
                  <span aria-hidden className="onyx-skeleton block h-10 w-44 rounded-full" />
                ) : data ? (
                  <PlayInPlatformButton
                    variant="compact"
                    platform={data.platform}
                    serverUrl={data.play.serverUrl}
                    serverId={data.play.serverId}
                    itemId={data.play.itemId}
                    tmdbId={tmdbId}
                    mediaType={item.media_type === 'tv' ? 'tv' : 'movie'}
                    title={title}
                    originalTitle={data.originalTitle}
                    year={data.year}
                    resume={data.play.resume}
                  />
                ) : null}
                <Link
                  href={href}
                  data-onyx-backdrop={backdrop}
                  onClick={leave}
                  aria-label="Voir la fiche"
                  title="Voir la fiche"
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Info className="size-[18px]" />
                </Link>
              </div>

              {data && data.meta.length > 0 && <p className="text-xs text-gray-400">{data.meta.join(' · ')}</p>}
              {data?.status.unplayed != null && data.status.unplayed > 0 && data.status.kind !== 'new' && (
                <p className="text-xs text-gray-400">
                  {data.status.unplayed} épisode{data.status.unplayed > 1 ? 's' : ''} non vu{data.status.unplayed > 1 ? 's' : ''}
                </p>
              )}
              {data && data.badges.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.badges.map((badge) => (
                    <span key={badge} className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11px] font-semibold text-gray-300">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              {item.overview && <p className="line-clamp-3 text-sm leading-relaxed text-gray-300">{item.overview}</p>}
              {data && (data.endsAt || data.added || data.studio) && (
                <p className="border-t border-white/[0.06] pt-2.5 text-[11px] text-gray-500">
                  {[data.endsAt && `Fin à ${data.endsAt}`, data.added, data.studio].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
