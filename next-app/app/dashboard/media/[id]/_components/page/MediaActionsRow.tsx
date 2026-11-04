'use client'

import { useState, useRef, useEffect, useLayoutEffect, useTransition, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ManageMediaModal } from '../../ManageMediaModal'
import { ProwlarrSearch } from '@/components/global/ProwlarrSearch'
import { toggleSubscription } from '../../subscribe-actions'
import { toggleWatchLater } from '@/app/dashboard/media/watch-later-actions'
import { toggleFavorite as toggleFavoriteAction } from '@/app/dashboard/media/actions'
import { addToCalendar, removeFromCalendar } from '@/app/actions/calendar'
import { triggerAutomaticSearch } from '@/app/dashboard/media/[id]/interactive-actions'
import type { MediaType } from '../../_types/media-page'
import {
  MoreHorizontal,
  Bell,
  BellOff,
  Tv,
  Heart,
  CalendarPlus,
  CalendarMinus,
  Settings,
  Search,
  User,
  Loader2,
  Check,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import clsx from 'clsx'

interface MediaActionsRowProps {
  id: string
  tmdbId: number
  mediaType: MediaType
  title: string
  releaseDate?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embyItem: any | null
  isWatchLaterItem: boolean
  isSubscribed: boolean
  isInCalendar: boolean
  tvdbId?: number
  canManageSettings: boolean
  canTriggerSearch: boolean
  canInteractiveSearch: boolean
}

/** Largeur du menu (w-64), réduite sur les écrans très étroits */
const MENU_WIDTH = 256
const MARGIN = 12

/**
 * Ligne du menu, comme le menu du compte (barre de navigation) : icône, libellé, et une coche
 * quand l'option est active (abonné, dans la liste…).
 */
function MenuItem({
  icon,
  label,
  onClick,
  busy,
  checked,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  busy?: boolean
  checked?: boolean
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked}
      onClick={onClick}
      disabled={busy}
      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white focus-visible:bg-gray-800 focus-visible:text-white focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
    >
      <span
        className={clsx(
          'flex size-4 shrink-0 items-center justify-center transition-colors',
          checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-200',
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1 leading-tight">{label}</span>
      {checked && <Check aria-hidden className="size-4 shrink-0 text-gray-200" />}
    </button>
  )
}

/**
 * Bouton « ⋯ » de la fiche : un menu déroulant (même allure que le menu du compte), identique sur
 * ordinateur et téléphone. Les états (abonné, liste, favori, calendrier) vivent ici : ils restent
 * justes d'une ouverture à l'autre.
 */
export default function MediaActionsRow({
  id,
  tmdbId,
  mediaType,
  title,
  releaseDate,
  details,
  embyItem,
  isWatchLaterItem,
  isSubscribed: initialSubscribed,
  isInCalendar: initialInCalendar,
  tvdbId,
  canManageSettings,
  canTriggerSearch,
  canInteractiveSearch,
}: MediaActionsRowProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isInteractiveOpen, setIsInteractiveOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed)
  const [isWatchLater, setIsWatchLater] = useState(isWatchLaterItem)
  const [isFavorite, setIsFavorite] = useState(!!embyItem?.UserData?.IsFavorite)
  const [isInCalendar, setIsInCalendar] = useState(initialInCalendar)
  const [subscribePending, startSubscribe] = useTransition()
  const [watchLaterLoading, setWatchLaterLoading] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [autoSearching, setAutoSearching] = useState(false)

  const close = () => setIsOpen(false)

  // Position : sous le bouton (au-dessus s'il manque de place), aligné sur son bord gauche si le
  // menu tient à droite, sinon sur son bord droit. Écrit directement sur le menu (aucun rendu).
  useLayoutEffect(() => {
    if (!isOpen) return
    const place = () => {
      const btn = buttonRef.current
      const menu = popupRef.current
      if (!btn || !menu) return
      const r = btn.getBoundingClientRect()
      const width = Math.min(MENU_WIDTH, window.innerWidth - MARGIN * 2)
      const height = menu.offsetHeight
      const left = r.left + width <= window.innerWidth - MARGIN ? r.left : Math.max(MARGIN, r.right - width)
      const below = r.bottom + 8 + height <= window.innerHeight - MARGIN || r.top - 8 - height < MARGIN
      menu.style.width = `${width}px`
      menu.style.left = `${left}px`
      menu.style.top = `${below ? r.bottom + 8 : r.top - 8 - height}px`
      menu.style.transformOrigin = `${left === r.left ? 'left' : 'right'} ${below ? 'top' : 'bottom'}`
    }
    place()
    popupRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [isOpen])

  // Fermeture : clic ailleurs, Échap ; flèches haut et bas pour passer d'une ligne à l'autre
  useEffect(() => {
    if (!isOpen) return
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || popupRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      const items = Array.from(popupRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)') ?? [])
      if (!items.length) return
      event.preventDefault()
      const at = items.indexOf(document.activeElement as HTMLElement)
      const next = event.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length
      items[next].focus()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const handleSubscribe = () => {
    startSubscribe(async () => {
      try {
        // Pas de réponse en 10 s : erreur affichée plutôt qu'un chargement sans fin
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10_000))
        const next = await Promise.race([toggleSubscription(id, mediaType, title), timeout])
        setIsSubscribed(next)
        toast.success(next ? 'Vous recevrez des notifications pour ce média' : 'Abonnement désactivé')
      } catch {
        toast.error("Erreur lors de la mise à jour de l'abonnement")
      }
    })
  }

  const handleWatchLater = async () => {
    if (watchLaterLoading) return
    setWatchLaterLoading(true)
    try {
      const res = await toggleWatchLater({
        mediaId: embyItem ? embyItem.Id : id,
        tmdbId: id,
        mediaType,
        title,
        posterPath: details.poster_path,
        isEmbyItem: !!embyItem,
      })
      if (res.success) {
        setIsWatchLater(res.action === 'added')
        toast.success(res.action === 'added' ? 'Ajouté à À regarder plus tard' : 'Retiré de À regarder plus tard')
      } else {
        toast.error(res.error || 'Une erreur est survenue')
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setWatchLaterLoading(false)
    }
  }

  const handleFavorite = async () => {
    if (!embyItem || favoriteLoading) return
    setFavoriteLoading(true)
    const next = !isFavorite
    try {
      const success = await toggleFavoriteAction(embyItem.Id, next)
      if (success) {
        setIsFavorite(next)
        toast.success(next ? 'Ajouté aux favoris' : 'Retiré des favoris')
        router.refresh()
      } else {
        toast.error("Ce média n'est pas encore disponible sur le serveur")
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleCalendar = async () => {
    if (!releaseDate || calendarLoading) return
    setCalendarLoading(true)
    try {
      if (isInCalendar) {
        await removeFromCalendar(tmdbId.toString(), mediaType)
        setIsInCalendar(false)
        toast.success('Retiré de votre calendrier')
      } else {
        await addToCalendar(tmdbId.toString(), mediaType, title, new Date(releaseDate))
        setIsInCalendar(true)
        toast.success(`Ajouté au calendrier pour le ${new Date(releaseDate).toLocaleDateString('fr-FR')}`)
      }
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setCalendarLoading(false)
    }
  }

  const handleAutoSearch = async () => {
    if (autoSearching) return
    if (!confirm('Lancer la recherche automatique ?')) return
    setAutoSearching(true)
    const res = await triggerAutomaticSearch(mediaType, tmdbId, tvdbId, undefined, undefined)
    if (res.error) toast.error(res.error)
    else toast.success(res.message || 'Recherche lancée')
    setAutoSearching(false)
    close()
  }

  const openManage = () => {
    close()
    setIsManageModalOpen(true)
  }

  const openInteractiveSearch = () => {
    close()
    setIsInteractiveOpen(true)
  }

  const year = releaseDate ? new Date(releaseDate).getFullYear() : null
  const canSearch = mediaType === 'movie' && (canTriggerSearch || canInteractiveSearch)
  const hasTools = canManageSettings || canSearch

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={clsx(
          'flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors duration-300 sm:h-12 sm:w-12',
          isOpen
            ? 'border-white/25 bg-white/10 text-white'
            : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white',
        )}
        title="Plus d'actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal className={clsx('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-90')} />
      </button>

      {/* Ouvert uniquement après un clic : document existe, portail pour échapper aux blocs animés */}
      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            role="menu"
            aria-label={`Actions : ${title}`}
            style={{ position: 'fixed', top: -9999, left: -9999, width: MENU_WIDTH, zIndex: 80 }}
            className="animate-pop-in overflow-hidden rounded-xl border border-gray-800 bg-gray-900/95 py-1 shadow-2xl backdrop-blur-xl"
          >
            <div className="-mt-1 border-b border-gray-800 bg-gray-800/50 px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {mediaType === 'tv' ? 'Série' : 'Film'}
                {year ? ` · ${year}` : ''}
              </p>
            </div>

            <div className="py-1">
              <MenuItem
                icon={isSubscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
                label={isSubscribed ? 'Se désabonner' : "S'abonner aux nouveautés"}
                onClick={handleSubscribe}
                busy={subscribePending}
                checked={isSubscribed}
              />
              <MenuItem
                icon={<Tv className="size-4" />}
                label="À regarder plus tard"
                onClick={handleWatchLater}
                busy={watchLaterLoading}
                checked={isWatchLater}
              />
              {embyItem && (
                <MenuItem
                  icon={<Heart className={clsx('size-4', isFavorite && 'fill-current')} />}
                  label="Favori"
                  onClick={handleFavorite}
                  busy={favoriteLoading}
                  checked={isFavorite}
                />
              )}
              {releaseDate && (
                <MenuItem
                  icon={isInCalendar ? <CalendarMinus className="size-4" /> : <CalendarPlus className="size-4" />}
                  label="Dans mon calendrier"
                  onClick={handleCalendar}
                  busy={calendarLoading}
                  checked={isInCalendar}
                />
              )}
            </div>

            {hasTools && (
              <div className="border-t border-gray-800 py-1">
                {canManageSettings && (
                  <MenuItem icon={<Settings className="size-4" />} label="Gérer le média" onClick={openManage} />
                )}
                {canSearch && canTriggerSearch && (
                  <MenuItem
                    icon={<Search className="size-4" />}
                    label="Recherche automatique"
                    onClick={handleAutoSearch}
                    busy={autoSearching}
                  />
                )}
                {canSearch && canInteractiveSearch && (
                  <MenuItem icon={<User className="size-4" />} label="Recherche interactive" onClick={openInteractiveSearch} />
                )}
              </div>
            )}
          </div>,
          document.body,
        )}

      {isInteractiveOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/50 p-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <User className="h-5 w-5 text-indigo-400" />
                  Recherche interactive
                </h3>
                <button
                  type="button"
                  onClick={() => setIsInteractiveOpen(false)}
                  className="rounded-full p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                <ProwlarrSearch
                  title={title}
                  canManage={canInteractiveSearch}
                  mediaType={mediaType}
                  tmdbId={tmdbId}
                  tvdbId={tvdbId}
                  seasons={details.seasons}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      <ManageMediaModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        tmdbId={tmdbId}
        mediaType={mediaType}
        title={title}
      />
    </div>
  )
}
