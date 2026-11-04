import { ExternalLink } from 'lucide-react'
import { statusLabel } from '../../_utils/media-labels'

interface MediaHeroFactsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watchProviders: any[]
}

const Sep = () => <span aria-hidden className="hidden h-3.5 w-px bg-white/15 sm:block" />

/**
 * Ligne de l'en-tête : note TMDB et nombre de votes, lien IMDb, statut, plateformes.
 * (L'ancienne note « IMDb » était la note TMDB : elle n'est plus affichée deux fois.)
 */
export default function MediaHeroFacts({ details, watchProviders }: MediaHeroFactsProps) {
  const score = details.vote_average > 0 ? Number(details.vote_average).toFixed(1) : null
  const votes = details.vote_count > 0 ? Number(details.vote_count).toLocaleString('fr-FR') : null
  const imdbId = details.external_ids?.imdb_id || details.imdb_id
  const status = statusLabel(details.status)

  const parts = [
    score && (
      <span key="score" className="inline-flex items-center gap-2 text-sm font-bold text-white">
        <span className="rounded-sm bg-[#01d277] px-1.5 py-0.5 text-[10px] font-black text-black">TMDB</span>
        {score}
        {votes && <span className="text-xs font-normal text-gray-500">{votes} votes</span>}
      </span>
    ),
    imdbId && (
      <a
        key="imdb"
        href={`https://www.imdb.com/title/${imdbId}/`}
        target="_blank"
        rel="noopener noreferrer"
        title="Voir la fiche IMDb"
        className="inline-flex items-center gap-1 text-xs text-gray-300 transition-colors hover:text-white"
      >
        <span className="rounded-sm bg-[#f5c518] px-1.5 py-0.5 text-[10px] font-black text-black">IMDb</span>
        <ExternalLink className="size-3" />
      </a>
    ),
    status && <span key="status">{status}</span>,
    watchProviders.length > 0 && (
      <span key="providers" className="inline-flex items-center gap-2">
        Disponible sur
        <span className="inline-flex gap-1.5">
          {watchProviders.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => (
              <img
                key={p.provider_id}
                loading="lazy"
                decoding="async"
                src={`https://image.tmdb.org/t/p/w92${p.logo_path}`}
                alt={p.provider_name}
                title={p.provider_name}
                className="size-5 rounded-md border border-white/10 shadow-md"
              />
            )
          )}
        </span>
      </span>
    ),
  ].filter(Boolean)

  if (parts.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-gray-400">
      {parts.map((part, i) => [i > 0 && <Sep key={`sep-${i}`} />, part])}
    </div>
  )
}
