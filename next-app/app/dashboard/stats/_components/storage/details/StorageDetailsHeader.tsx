'use client'

import { useState } from 'react'
import { Film, Tv, Star, HardDrive, CalendarPlus, FolderOpen, Layers } from 'lucide-react'
import type { StorageItem, StorageMediaInfo, SeasonDetail } from '../../../_types/storage'
import { formatBytes } from '../../../_utils/storage-formatters'
import { StoragePoster, storagePosterUrl } from '../StoragePoster'

interface StorageDetailsHeaderProps {
  item: StorageItem
  info: StorageMediaInfo | null | undefined
  seasons: SeasonDetail[] | undefined
  loading: boolean
}

function formatRuntime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

const SERIES_STATUS: Record<string, string> = {
  Continuing: 'En cours',
  Ended: 'Terminée',
}

/**
 * Fiche du média en tête du détail : affiche, titre, année, durée, note, genres,
 * résumé, taille et emplacement. L'affiche floutée sert de fond.
 */
export function StorageDetailsHeader({ item, info, seasons, loading }: StorageDetailsHeaderProps) {
  const [expanded, setExpanded] = useState(false)
  const isMovie = item.type === 'Movie'

  const years = info?.year
    ? info.endYear && info.endYear !== info.year ? `${info.year} – ${info.endYear}` : String(info.year)
    : null
  const meta = [
    years,
    info?.runtimeMinutes && isMovie ? formatRuntime(info.runtimeMinutes) : null,
    info?.officialRating,
    !isMovie && info?.status ? SERIES_STATUS[info.status] ?? info.status : null,
  ].filter(Boolean) as string[]

  const seasonCount = seasons?.length ?? 0
  const episodeCount = seasons?.length
    ? seasons.reduce((acc, s) => acc + (s.episodesCount || 0), 0)
    : item.episodesCount ?? 0

  return (
    <div className="relative overflow-hidden border-b border-white/10">
      {/* Fond : affiche floutée (même URL que la vignette, déjà en cache) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center scale-125 blur-2xl opacity-40"
        style={{ backgroundImage: `url("${storagePosterUrl(item, 342)}")` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0A0A0A]/70 to-[#0A0A0A]" />

      <div className="relative flex flex-col sm:flex-row gap-5 p-6 pt-8">
        <StoragePoster
          item={item}
          width={342}
          iconSize={32}
          className="w-28 sm:w-36 rounded-xl shadow-2xl shadow-black/60 self-center sm:self-start"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${
                isMovie ? 'text-blue-400' : 'text-emerald-400'
              }`}
            >
              {isMovie ? <Film size={12} /> : <Tv size={12} />}
              {isMovie ? 'Film' : 'Série'}
            </span>
            <h3 className="text-2xl font-bold text-white leading-tight pr-10">{item.name}</h3>

            {loading ? (
              <div className="mt-2 h-4 w-48 rounded bg-white/10 animate-pulse" />
            ) : (meta.length > 0 || info?.communityRating) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-300">
                {meta.map((m, i) => (
                  <span key={m} className="flex items-center gap-2">
                    {i > 0 && <span className="text-gray-600">•</span>}
                    {m}
                  </span>
                ))}
                {info?.communityRating != null && (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    {meta.length > 0 && <span className="text-gray-600 mr-1">•</span>}
                    <Star size={13} className="fill-current" />
                    {info.communityRating.toFixed(1)}
                  </span>
                )}
              </div>
            )}
          </div>

          {!loading && info?.genres.length ? (
            <div className="flex flex-wrap gap-1.5">
              {info.genres.slice(0, 5).map(g => (
                <span key={g} className="px-2.5 py-0.5 rounded-full text-xs text-gray-200 bg-white/10 border border-white/10">
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          {/* Stockage */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-200">
              <HardDrive size={13} />
              {formatBytes(item.size)}
            </span>
            {!isMovie && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                <Layers size={13} />
                {seasonCount > 0 && `${seasonCount} saison${seasonCount > 1 ? 's' : ''} • `}
                {episodeCount} épisode{episodeCount > 1 ? 's' : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
              <CalendarPlus size={13} />
              Ajouté le {new Date(item.addedAt).toLocaleDateString('fr-FR')}
            </span>
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-11/12 rounded bg-white/10 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-white/10 animate-pulse" />
            </div>
          ) : info?.overview ? (
            <div>
              <p className={`text-sm text-gray-300 leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
                {info.overview}
              </p>
              {info.overview.length > 280 && (
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="mt-1 text-xs font-medium text-purple-300 hover:text-purple-200"
                >
                  {expanded ? 'Voir moins' : 'Voir plus'}
                </button>
              )}
            </div>
          ) : null}

          {info?.path && (
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono min-w-0" title={info.path}>
              <FolderOpen size={12} className="shrink-0" />
              <span className="truncate">{info.path}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
