'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { createPortal } from 'react-dom'
import WatchLaterButton from '../../WatchLaterButton'
import { SubscribeButton } from '../../SubscribeButton'
import FavoriteButton from '../../FavoriteButton'
import { ManageMediaButton } from '../../ManageMediaButton'
import { CalendarButton } from '@/components/global/CalendarButton'
import { SearchActions } from '../SearchActions'
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

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  active,
  activeClassName,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  activeClassName?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        active
          ? activeClassName || 'bg-indigo-500/15 text-indigo-300'
          : 'text-gray-200 hover:bg-white/10 active:bg-white/15',
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-current">
        {icon}
      </span>
      <span className="text-sm font-medium leading-tight">{label}</span>
    </button>
  )
}

function MobileActionsMenu({
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
  style,
  menuRef,
  onClose,
  onManage,
  onInteractiveSearch,
}: MediaActionsRowProps & {
  style: React.CSSProperties
  menuRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
  onManage: () => void
  onInteractiveSearch: () => void
}) {
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed)
  const [isWatchLater, setIsWatchLater] = useState(isWatchLaterItem)
  const [isFavorite, setIsFavorite] = useState(!!embyItem?.UserData?.IsFavorite)
  const [isInCalendar, setIsInCalendar] = useState(initialInCalendar)
  const [subscribePending, startSubscribe] = useTransition()
  const [watchLaterLoading, setWatchLaterLoading] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [autoSearching, setAutoSearching] = useState(false)

  const handleSubscribe = () => {
    startSubscribe(async () => {
      try {
        const next = await toggleSubscription(id, mediaType, title)
        setIsSubscribed(next)
        toast.success(
          next
            ? 'Vous recevrez des notifications pour ce média'
            : 'Abonnement désactivé',
        )
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
        toast.success(
          res.action === 'added'
            ? 'Ajouté à À regarder plus tard'
            : 'Retiré de À regarder plus tard',
        )
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
        toast.success(
          `Ajouté au calendrier pour le ${new Date(releaseDate).toLocaleDateString('fr-FR')}`,
        )
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
    const res = await triggerAutomaticSearch(
      mediaType,
      tmdbId,
      tvdbId,
      undefined,
      undefined,
    )
    if (res.error) toast.error(res.error)
    else toast.success(res.message || 'Recherche lancée')
    setAutoSearching(false)
    onClose()
  }

  return (
      <div
        ref={menuRef}
        role="menu"
        style={style}
        className="w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#080909]/97 shadow-2xl shadow-black/50 backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
      >
        <div className="border-b border-white/5 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Actions
          </p>
        </div>
        <div className="flex flex-col gap-0.5 p-1.5">
          <MenuItem
            icon={
              subscribePending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSubscribed ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )
            }
            label={isSubscribed ? 'Se désabonner' : "S'abonner"}
            onClick={handleSubscribe}
            disabled={subscribePending}
            active={isSubscribed}
            activeClassName="bg-amber-500/10 text-amber-300"
          />
          <MenuItem
            icon={
              watchLaterLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Tv className="h-4 w-4" />
              )
            }
            label={isWatchLater ? 'Retirer de la liste' : 'À regarder plus tard'}
            onClick={handleWatchLater}
            disabled={watchLaterLoading}
            active={isWatchLater}
            activeClassName="bg-blue-500/10 text-blue-300"
          />
          {embyItem && (
            <MenuItem
              icon={
                favoriteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart className={clsx('h-4 w-4', isFavorite && 'fill-current')} />
                )
              }
              label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              onClick={handleFavorite}
              disabled={favoriteLoading}
              active={isFavorite}
              activeClassName="bg-rose-500/10 text-rose-300"
            />
          )}
          {releaseDate && (
            <MenuItem
              icon={
                calendarLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isInCalendar ? (
                  <CalendarMinus className="h-4 w-4" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )
              }
              label={isInCalendar ? 'Retirer du calendrier' : 'Ajouter au calendrier'}
              onClick={handleCalendar}
              disabled={calendarLoading}
              active={isInCalendar}
              activeClassName="bg-emerald-500/10 text-emerald-300"
            />
          )}
          {canManageSettings && (
            <MenuItem
              icon={<Settings className="h-4 w-4" />}
              label="Gérer le média"
              onClick={onManage}
            />
          )}
          {mediaType === 'movie' && (canTriggerSearch || canInteractiveSearch) && (
            <>
              <div className="my-1 border-t border-white/5" />
              {canTriggerSearch && (
                <MenuItem
                  icon={
                    autoSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )
                  }
                  label="Recherche automatique"
                  onClick={handleAutoSearch}
                  disabled={autoSearching}
                />
              )}
              {canInteractiveSearch && (
                <MenuItem
                  icon={<User className="h-4 w-4" />}
                  label="Recherche interactive"
                  onClick={onInteractiveSearch}
                />
              )}
            </>
          )}
        </div>
      </div>
  )
}

export default function MediaActionsRow(props: MediaActionsRowProps) {
  const {
    id,
    tmdbId,
    mediaType,
    title,
    releaseDate,
    details,
    embyItem,
    isWatchLaterItem,
    isSubscribed,
    isInCalendar,
    tvdbId,
    canManageSettings,
    canTriggerSearch,
    canInteractiveSearch,
  } = props

  const [isOpen, setIsOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [isInteractiveOpen, setIsInteractiveOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileStyle, setMobileStyle] = useState<React.CSSProperties>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const updateMobilePosition = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return

    const rect = btn.getBoundingClientRect()
    const margin = 12
    const menuWidth = Math.min(280, window.innerWidth - margin * 2)
    // Aligner à droite du bouton, clampé dans le viewport
    let left = rect.right - menuWidth
    left = Math.min(Math.max(margin, left), window.innerWidth - menuWidth - margin)

    setMobileStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      zIndex: 80,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updateMobilePosition()

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', updateMobilePosition)
    window.addEventListener('scroll', updateMobilePosition, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', updateMobilePosition)
      window.removeEventListener('scroll', updateMobilePosition, true)
    }
  }, [isOpen, updateMobilePosition])

  const openManage = () => {
    setIsOpen(false)
    setIsManageModalOpen(true)
  }

  const openInteractiveSearch = () => {
    setIsOpen(false)
    setIsInteractiveOpen(true)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex h-[42px] w-[42px] sm:h-12 sm:w-12 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-all duration-300',
          isOpen
            ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-400'
            : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white',
        )}
        title="Plus d'actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal
          className={clsx(
            'h-5 w-5 transition-transform duration-300',
            isOpen && 'rotate-90',
          )}
        />
      </button>

      {/* Desktop: tiroir compact horizontal */}
      {isOpen && !isMobile && (
        <div
          role="menu"
          className="absolute top-1/2 left-full z-50 ml-3 flex -translate-y-1/2 animate-in fade-in slide-in-from-left-2 flex-nowrap items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-gray-950/95 px-3 py-2 shadow-2xl backdrop-blur-md duration-200"
        >
          <SubscribeButton
            tmdbId={id}
            mediaType={mediaType}
            title={title}
            initialIsSubscribed={isSubscribed}
          />
          <WatchLaterButton
            mediaId={embyItem ? embyItem.Id : id}
            tmdbId={id}
            mediaType={mediaType}
            title={title}
            posterPath={details.poster_path}
            isEmbyItem={!!embyItem}
            initialIsWatchLater={isWatchLaterItem}
          />
          {embyItem && (
            <FavoriteButton
              embyItemId={embyItem.Id}
              initialIsFavorite={embyItem.UserData?.IsFavorite || false}
              tmdbId={id}
              mediaType={mediaType}
            />
          )}
          <CalendarButton
            tmdbId={tmdbId.toString()}
            mediaType={mediaType}
            title={title}
            releaseDate={releaseDate}
            initialIsInCalendar={isInCalendar}
          />
          {canManageSettings && (
            <ManageMediaButton onClick={openManage} />
          )}
          {mediaType === 'movie' &&
            (canTriggerSearch || canInteractiveSearch) && (
              <SearchActions
                title={title}
                canTriggerSearch={canTriggerSearch}
                canInteractiveSearch={canInteractiveSearch}
                mediaType={mediaType}
                tmdbId={tmdbId}
                tvdbId={tvdbId}
                seasons={details.seasons}
              />
            )}
        </div>
      )}

      {/* Mobile: menu déroulant propre */}
      {mounted &&
        isOpen &&
        isMobile &&
        createPortal(
          <MobileActionsMenu
            {...props}
            style={mobileStyle}
            menuRef={popupRef}
            onClose={() => setIsOpen(false)}
            onManage={openManage}
            onInteractiveSearch={openInteractiveSearch}
          />,
          document.body,
        )}

      {mounted &&
        isInteractiveOpen &&
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
