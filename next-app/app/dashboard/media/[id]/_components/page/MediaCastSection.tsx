import { ChevronRight } from 'lucide-react'
import FullCreditsButton from '../../FullCreditsButton'
import { CastList } from '../CastList'
import type { NormalizedCredits } from '../../_types/media-page'

interface MediaCastSectionProps {
  credits: NormalizedCredits
  cast: NormalizedCredits['cast']
}

export default function MediaCastSection({
  credits,
  cast,
}: MediaCastSectionProps) {
  return (
    <section>
      <FullCreditsButton cast={credits.cast || []} crew={credits.crew || []}>
        <div className="group flex items-center gap-2 mb-6 cursor-pointer w-fit">
          <h2 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
            Casting
          </h2>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all translate-y-[1px]" />
        </div>
      </FullCreditsButton>
      <CastList cast={cast} />
    </section>
  )
}
