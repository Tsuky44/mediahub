'use client'

import { Check } from 'lucide-react'
import type { MediaWatchState } from './useMediaCardActions'

/**
 * Ce que le compte a vu, sur l'affiche : « Vu » quand c'est fini, le nombre d'épisodes restants
 * d'une série commencée, et une barre d'avancement en bas. En haut à gauche, la pastille s'efface
 * au survol pour laisser la place aux boutons (MediaCardActions).
 */
export function MediaCardWatchState({ state }: { state?: MediaWatchState }) {
  if (!state) return null
  const remaining = !state.watched && state.remaining ? state.remaining : 0
  const progress = !state.watched && state.progress ? Math.min(Math.max(state.progress, 0), 1) : 0
  if (!state.watched && !remaining && !progress) return null

  const label = state.watched
    ? 'Vu'
    : remaining
      ? `${remaining} épisode${remaining > 1 ? 's' : ''} à regarder`
      : `En cours (${Math.round(progress * 100)} %)`

  return (
    <>
      {(state.watched || remaining > 0) && (
        <div
          role="img"
          aria-label={label}
          title={label}
          className="absolute top-2 left-2 z-20 flex h-6 min-w-6 items-center justify-center gap-1 rounded-full bg-black/65 px-2 text-[11px] font-semibold tabular-nums text-onyx-ink ring-1 ring-white/10 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-0"
        >
          {state.watched ? <Check className="h-3.5 w-3.5 text-green-400" strokeWidth={3} /> : remaining}
        </div>
      )}
      {progress > 0 && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 z-20 h-1 bg-black/50">
          <div className="h-full bg-green-400" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </>
  )
}
