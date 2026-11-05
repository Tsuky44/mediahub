import MediaCastFan, { type FanActor } from './MediaCastFan'
import MediaFactSheet from './MediaFactSheet'
import type { MediaType, NormalizedCredits } from '../../_types/media-page'
import type { AgeRating } from '../../_utils/media-labels'
import type { PublicDomainInfo } from '../../_utils/media-public-domain'

interface MediaCastAndFactsProps {
  credits: NormalizedCredits
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  mediaType: MediaType
  releaseDate?: string
  rating?: AgeRating
  director?: string
  writers: string[]
  editors: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keywords: any[]
  publicDomain?: PublicDomainInfo | null
}

/** Têtes d'affiche dans l'éventail (le reste via « Tout le casting ») */
const FAN_SIZE = 7

/** Distribution en éventail et cartel à droite, juste au-dessus des recommandations */
export default function MediaCastAndFacts({ credits, ...facts }: MediaCastAndFactsProps) {
  const actors: FanActor[] = credits.cast.slice(0, FAN_SIZE).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    profile_path: c.profile_path,
    episodes: typeof c.total_episode_count === 'number' ? c.total_episode_count : undefined,
  }))

  if (actors.length === 0) {
    return (
      <section className="onyx-reveal max-w-xl">
        <MediaFactSheet {...facts} />
      </section>
    )
  }
  return (
    <section className="onyx-reveal grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-12">
      <div className="min-w-0">
        <MediaCastFan actors={actors} credits={credits} />
      </div>
      <MediaFactSheet {...facts} />
    </section>
  )
}
