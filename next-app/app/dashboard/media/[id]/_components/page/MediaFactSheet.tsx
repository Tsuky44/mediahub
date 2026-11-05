import Link from 'next/link'
import type { ReactNode } from 'react'
import { Banknote, CalendarDays, Clock, Globe, Layers, ShieldCheck, Tv, TrendingUp } from 'lucide-react'
import type { MediaType } from '../../_types/media-page'
import {
  countryName,
  joinNames,
  languageName,
  longDate,
  moneyLabel,
  runtimeLabel,
  type AgeRating,
} from '../../_utils/media-labels'
import type { PublicDomainInfo } from '../../_utils/media-public-domain'

interface MediaKeyword {
  id: number
  name: string
}

interface MediaFactSheetProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  mediaType: MediaType
  releaseDate?: string
  rating?: AgeRating
  director?: string
  writers: string[]
  editors: string[]
  keywords: MediaKeyword[]
  publicDomain?: PublicDomainInfo | null
}

interface Fact {
  icon: typeof Clock
  label: string
  value: string
}

/**
 * Cartel de la fiche (verre discret, globals.css onyx-cartel) : nature, langue et pays, créateurs,
 * infos clés en cases, puis l'équipe en lignes et les thèmes en petites bulles.
 */
export default function MediaFactSheet({
  details,
  mediaType,
  releaseDate,
  rating,
  director,
  writers,
  editors,
  keywords,
  publicDomain,
}: MediaFactSheetProps) {
  const isTv = mediaType === 'tv'
  const title = details.title || details.name
  const original = details.original_title || details.original_name
  const country = details.origin_country?.[0] || details.production_countries?.[0]?.iso_3166_1
  const kind = [isTv ? 'Série télévisée' : 'Film', languageName(details.original_language), countryName(country)]
    .filter(Boolean)
    .join(' · ')

  const creators: string[] = isTv ? (details.created_by || []).map((c: { name: string }) => c.name).filter(Boolean) : []
  const byline = isTv
    ? creators.length > 0 && (
        <>
          Créée par <b>{joinNames(creators)}</b>
        </>
      )
    : director && (
        <>
          Réalisé par <b>{director}</b>
        </>
      )

  const seasons = details.number_of_seasons
  const episodes = details.number_of_episodes
  const networks: string[] = (details.networks || []).map((n: { name: string }) => n.name).filter(Boolean)
  const facts: Fact[] = [
    ...(isTv
      ? [
          { icon: CalendarDays, label: 'Première diffusion', value: longDate(details.first_air_date) },
          { icon: Tv, label: networks.length > 1 ? 'Chaînes' : 'Chaîne', value: networks.join(', ') },
          {
            icon: Layers,
            label: 'Saisons',
            value: seasons
              ? `${seasons} saison${seasons > 1 ? 's' : ''}${episodes ? `, ${episodes} épisodes` : ''}`
              : undefined,
          },
          { icon: ShieldCheck, label: 'Âge conseillé', value: rating?.long },
        ]
      : [
          { icon: CalendarDays, label: 'Sortie', value: longDate(releaseDate) },
          { icon: Clock, label: 'Durée', value: runtimeLabel(details.runtime) },
          { icon: ShieldCheck, label: 'Âge conseillé', value: rating?.long },
          { icon: Banknote, label: 'Budget', value: moneyLabel(details.budget) },
          { icon: TrendingUp, label: 'Recettes', value: moneyLabel(details.revenue) },
        ]),
    ...(publicDomain ? [{ icon: Globe, label: 'Droits', value: publicDomain.detail }] : []),
  ].filter((f): f is Fact => Boolean(f.value))

  const studios: string[] = (details.production_companies || [])
    .slice(0, 3)
    .map((c: { name: string }) => c.name)
    .filter(Boolean)
  const collection = details.belongs_to_collection
  const rows: [string, ReactNode][] = []
  if (isTv && director) rows.push(['Réalisation', director])
  if (writers.length) rows.push(['Scénario', writers.join(', ')])
  if (editors.length) rows.push(['Montage', editors.join(', ')])
  if (studios.length) rows.push(['Studios', studios.join(', ')])
  if (original) rows.push(['Titre original', original])
  if (collection?.id) {
    rows.push([
      'Saga',
      <Link key="saga" href={`/dashboard/media/collection/${collection.id}`} className="font-medium">
        {collection.name}
      </Link>,
    ])
  }

  return (
    <article className="onyx-cartel">
      {kind && <p className="onyx-cartel-kind">{kind}</p>}
      <h3 className="onyx-cartel-title">{title}</h3>
      {byline && <p className="onyx-cartel-by">{byline}</p>}

      {facts.length > 0 && (
        <div className="onyx-cartel-facts">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <Icon aria-hidden className="size-4" />
              <span>
                <small>{label}</small>
                <b>{value}</b>
              </span>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <dl className="onyx-cartel-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {keywords.length > 0 && (
        <div className="onyx-cartel-tags">
          {keywords.map((k) => (
            <Link key={k.id} href={`/dashboard/media/discover?keyword=${k.id}&name=${encodeURIComponent(k.name)}`}>
              {k.name}
            </Link>
          ))}
        </div>
      )}
    </article>
  )
}
