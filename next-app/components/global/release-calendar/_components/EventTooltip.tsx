'use client'

import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Film, Tv, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/app/actions/calendar'

interface EventTooltipProps {
  event: CalendarEvent
  mousePos: { x: number; y: number }
  isTouch?: boolean
}

const noop = () => () => {}

function Poster({ event, className }: { event: CalendarEvent; className?: string }) {
  return (
    <div className={cn('absolute inset-0', className)}>
      {event.posterUrl ? (
        // Chargée directement depuis TMDB (déjà à la bonne taille) : le serveur ne
        // sert plus d'intermédiaire, une coupure réseau de son côté ne casse plus rien
        <Image
          src={event.posterUrl.replace('/t/p/w500/', '/t/p/w185/')}
          alt={event.title}
          fill
          unoptimized
          className="object-cover"
          sizes="120px"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          {event.mediaType === 'movie' ? (
            <Film className="w-8 h-8 text-gray-800" />
          ) : (
            <Tv className="w-8 h-8 text-gray-800" />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Infobulle d'un épisode ou d'un film du calendrier. D'une sortie à l'autre, elle reste
 * ouverte et glisse vers sa nouvelle place ; l'affiche se fond dans la suivante et le texte
 * défile dans le sens du mouvement de la souris (motion.css, onyx-tip-*).
 */
export function EventTooltip({ event, mousePos, isTouch }: EventTooltipProps) {
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  // Sortie affichée, la précédente (pour le fondu de l'affiche) et le sens du changement
  const [shown, setShown] = useState({ event, y: mousePos.y, previous: null as CalendarEvent | null, dir: 1 })
  if (shown.event.id !== event.id) {
    setShown({ event, y: mousePos.y, previous: shown.event, dir: mousePos.y >= shown.y ? 1 : -1 })
  }

  if (!mounted) return null

  // Mobile: position tooltip at center of screen if touch event
  let top: number
  let left: number

  if (isTouch) {
    // Center tooltip on mobile for better visibility
    top = window.innerHeight / 2 - 125
    left = window.innerWidth / 2 - 190
  } else {
    top =
      mousePos.y + 15 > window.innerHeight - 250
        ? mousePos.y - 220
        : mousePos.y + 15
    left =
      mousePos.x + 400 > window.innerWidth ? mousePos.x - 395 : mousePos.x + 15
  }

  return createPortal(
    <div
      data-onyx-tooltip
      className={`fixed z-[100] w-[380px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden pointer-events-none animate-in fade-in zoom-in-95 flex ring-1 ring-white/5 transition-[top,left] duration-300 ease-out-onyx motion-reduce:transition-none ${
        isTouch ? 'max-w-[90vw] sm:w-[380px]' : ''
      }`}
      style={{ top, left, '--onyx-tip-dir': shown.dir } as React.CSSProperties}
    >
      <div data-onyx-tooltip-poster className="w-[120px] bg-gray-900 relative flex-shrink-0 border-r border-white/5 overflow-hidden rounded-l-xl">
        {shown.previous && <Poster key={`out-${shown.previous.id}`} event={shown.previous} className="onyx-tip-poster-out" />}
        <Poster key={event.id} event={event} className={shown.previous ? 'onyx-tip-poster-in' : undefined} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
      <div key={event.id} className={cn('flex-1 p-4 flex flex-col min-w-0', shown.previous && 'onyx-tip-text')}>
        <div className="mb-2">
          <Badge
            variant="outline"
            className={cn(
              'mb-1.5 text-[10px] h-5 px-2 border-0 font-medium shadow-sm',
              event.mediaType === 'movie'
                ? 'bg-amber-500/20 text-amber-200'
                : 'bg-indigo-500/20 text-indigo-200'
            )}
          >
            {event.mediaType === 'movie' ? 'Film' : 'Série'}
          </Badge>
          <h3 className="text-base font-bold text-white leading-tight line-clamp-2">
            {event.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-3">
          <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
          {format(event.start, 'd MMMM yyyy', { locale: fr })}
        </div>
        <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed font-light opacity-80">
          {event.overview || 'Aucune description disponible.'}
        </p>
      </div>
    </div>,
    document.body
  )
}
