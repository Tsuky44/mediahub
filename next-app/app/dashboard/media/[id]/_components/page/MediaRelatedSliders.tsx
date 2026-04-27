import { MediaList } from '@/components/global/MediaList'
import type { MediaType } from '../../_types/media-page'

interface MediaRelatedSlidersProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recommendations: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  similar: any[]
  mediaType: MediaType
  tmdbId: number
}

export default function MediaRelatedSliders({
  recommendations,
  similar,
  mediaType,
  tmdbId,
}: MediaRelatedSlidersProps) {
  return (
    <div className="space-y-16">
      {recommendations.length > 0 && (
        <MediaList
          variant="slider"
          title="Recommandations"
          items={recommendations}
          mediaType={mediaType}
          viewAllLink={`/dashboard/media/${tmdbId}/recommendations?type=${mediaType}`}
        />
      )}
      {similar.length > 0 && (
        <MediaList
          variant="slider"
          title="Titres similaires"
          items={similar}
          mediaType={mediaType}
          viewAllLink={`/dashboard/media/${tmdbId}/similar?type=${mediaType}`}
        />
      )}
    </div>
  )
}
