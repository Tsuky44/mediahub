'use client'

import { CalendarClock, Check, CircleDashed, Download, Plus } from 'lucide-react'
import { useMediaServerType } from '@/app/dashboard/_hooks/useMediaServerType'
import { OnyxBeam, OnyxTrack, type OnyxPhase } from '@/components/ui/onyx'
import { cn } from '@/lib/utils'
import { formatReleaseDate } from '@/lib/release-date'

interface RequestStatusButtonProps {
  status: string
  /** Date de sortie attendue (statut « unreleased ») */
  releaseDate?: string
  phase: OnyxPhase
  error: string | null
  canRequest: boolean
  hasUnrequestedSeasons: boolean
  isTv: boolean
  onPrimaryClick: () => void
  onSeasonClick: () => void
  onStatusClick?: () => void
}

const pill =
  'relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-6 py-3 font-semibold backdrop-blur-xl transition-[background-color,border-color,scale] duration-300 ease-onyx'
/** Bouton principal de l'app : verre blanc à 15 %, arête haute éclairée */
const glass =
  'border-white/20 bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-white/20 hover:scale-[1.04] active:scale-[0.98]'
/** Pastille de statut : monochrome, l'état se lit au mouvement plus qu'à la couleur */
const statusPill = 'border-white/10 bg-white/[0.06] text-gray-100 hover:bg-white/10 cursor-pointer'

function SecondaryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(pill, glass)}>
      <Plus className="h-5 w-5" />
      {label}
    </button>
  )
}

const PRIMARY_LABEL: Record<OnyxPhase, string> = {
  idle: 'Demander',
  sending: 'Envoi de la demande',
  done: 'Demande envoyée',
  error: 'Réessayer',
}

export function RequestStatusButton({
  status,
  releaseDate,
  phase,
  error,
  canRequest,
  hasUnrequestedSeasons,
  isTv,
  onPrimaryClick,
  onSeasonClick,
  onStatusClick,
}: RequestStatusButtonProps) {
  const serverType = useMediaServerType()
  const serverName = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby'

  // La confirmation reste affichée avant de laisser place au statut « en cours »
  if (phase === 'idle' || phase === 'error' || !canRequest) {
    if (status === 'partial') {
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onStatusClick} className={cn(pill, statusPill)}>
            <CircleDashed className="h-5 w-5 text-amber-400" />
            Partiellement disponible
          </button>
          {canRequest && isTv && <SecondaryButton onClick={onSeasonClick} label="Compléter" />}
        </div>
      )
    }

    if (status === 'available') {
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onStatusClick} className={cn(pill, statusPill)}>
            <OnyxBeam />
            <Check className="h-5 w-5 text-green-400" />
            Disponible sur {serverName}
          </button>
          {canRequest && hasUnrequestedSeasons && <SecondaryButton onClick={onSeasonClick} label="Demander plus" />}
        </div>
      )
    }

    if (status === 'unreleased') {
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onStatusClick} className={cn(pill, statusPill)}>
            <CalendarClock className="h-5 w-5 text-gray-100" />
            En attente de sortie
            {releaseDate && (
              <span className="font-normal text-gray-400">· {formatReleaseDate(releaseDate)}</span>
            )}
          </button>
          {canRequest && isTv && <SecondaryButton onClick={onSeasonClick} label="Demander plus" />}
        </div>
      )
    }

    if (status === 'pending' || status === 'processing') {
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onStatusClick} className={cn(pill, statusPill, 'pb-4')}>
            En cours de traitement
            <OnyxTrack tone="amber" className="absolute inset-x-6 bottom-2" />
          </button>
          {canRequest && isTv && <SecondaryButton onClick={onSeasonClick} label="Demander plus" />}
        </div>
      )
    }
  }

  // Default: not available / unknown
  if (!canRequest) return null

  const busy = phase === 'sending' || phase === 'done'
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onPrimaryClick}
        disabled={busy}
        aria-busy={phase === 'sending'}
        className={cn(pill, glass, 'min-w-[15rem] justify-center px-8 disabled:hover:scale-100')}
      >
        {phase === 'done' && (
          <span aria-hidden className="absolute inset-0 origin-left bg-onyx-ink animate-onyx-fill" />
        )}
        <span
          aria-live="polite"
          // Différence : le texte s'inverse à mesure que l'encre remplit le bouton
          className={cn('relative inline-flex items-center gap-2', phase === 'done' && 'mix-blend-difference')}
        >
          {phase === 'done' ? (
            <Check key="done" className="h-5 w-5 animate-pop-in" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {PRIMARY_LABEL[phase]}
        </span>
        {phase === 'sending' && <OnyxTrack className="absolute inset-x-8 bottom-1.5" />}
      </button>
      {phase === 'error' && (
        // Sous le bouton, hors du flux : les boutons voisins ne bougent pas
        <p role="alert" className="absolute left-2 top-full mt-2 w-max max-w-[min(24rem,80vw)] text-sm leading-snug animate-fade-in">
          <span className="font-semibold text-red-300">Demande non envoyée.</span>{' '}
          <span className="text-gray-400">
            {error ? `${error}. ` : ''}Rien n&apos;a été ajouté, vous pouvez réessayer.
          </span>
        </p>
      )}
    </div>
  )
}
