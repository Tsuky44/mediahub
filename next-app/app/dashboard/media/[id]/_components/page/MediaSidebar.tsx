import MediaCollectionCard from './MediaCollectionCard'
import MediaInfoTable from './MediaInfoTable'
import MediaWatchProviders from './MediaWatchProviders'

interface MediaSidebarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  releaseDate?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watchProviders: any[]
}

export default function MediaSidebar({
  details,
  releaseDate,
  watchProviders,
}: MediaSidebarProps) {
  return (
    <div className="xl:col-span-4 space-y-4">
      {details.belongs_to_collection && (
        <MediaCollectionCard collection={details.belongs_to_collection} />
      )}
      <div className="bg-gray-900/40 backdrop-blur-md rounded-xl border border-white/5 shadow-xl">
        <MediaInfoTable details={details} releaseDate={releaseDate} />
        <MediaWatchProviders providers={watchProviders} />
      </div>
    </div>
  )
}
