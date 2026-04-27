import MediaCrewGrid from './MediaCrewGrid'
import MediaKeywords from './MediaKeywords'

interface MediaOverviewSectionProps {
  overview?: string
  director?: string
  writers: string[]
  editors: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keywords: any[]
}

export default function MediaOverviewSection({
  overview,
  director,
  writers,
  editors,
  keywords,
}: MediaOverviewSectionProps) {
  return (
    <div className="xl:col-span-8 space-y-12">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Résumé</h2>
        <p className="text-lg text-gray-300 leading-relaxed">
          {overview || 'Aucun synopsis disponible.'}
        </p>
      </div>
      <MediaCrewGrid
        director={director}
        writers={writers}
        editors={editors}
      />
      <MediaKeywords keywords={keywords} />
    </div>
  )
}
