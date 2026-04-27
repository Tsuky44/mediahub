interface MediaInfoTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any
  releaseDate?: string
}

export default function MediaInfoTable({
  details,
  releaseDate,
}: MediaInfoTableProps) {
  return (
    <>
      {/* Rating Row */}
      <div className="flex items-center justify-center gap-8 py-4 bg-white/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="bg-[#f5c518] text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm">
            IMDb
          </span>
          <span className="text-white font-bold text-sm">
            {details.vote_average?.toFixed(1) || '0.0'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#01d277] text-black text-[10px] font-black px-1.5 py-0.5 rounded-sm">
            TMDB
          </span>
          <span className="text-white font-bold text-sm">
            {Math.round((details.vote_average || 0) * 10)}%
          </span>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        <div className="grid grid-cols-2 p-4 text-xs">
          <span className="text-gray-500 font-bold">Titre original</span>
          <span className="text-gray-300 text-right">
            {details.original_title || details.original_name}
          </span>
        </div>
        <div className="grid grid-cols-2 p-4 text-xs">
          <span className="text-gray-500 font-bold">Statut</span>
          <span className="text-gray-300 text-right">{details.status}</span>
        </div>
        <div className="grid grid-cols-2 p-4 text-xs">
          <span className="text-gray-500 font-bold">Date de sortie</span>
          <span className="text-gray-300 text-right flex items-center justify-end gap-1">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {releaseDate
              ? new Date(releaseDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Inconnue'}
          </span>
        </div>
        {details.revenue !== undefined && details.revenue > 0 && (
          <div className="grid grid-cols-2 p-4 text-xs">
            <span className="text-gray-500 font-bold">Revenu</span>
            <span className="text-gray-300 text-right">
              {details.revenue?.toLocaleString('fr-FR')} $US
            </span>
          </div>
        )}
        {details.budget !== undefined && details.budget > 0 && (
          <div className="grid grid-cols-2 p-4 text-xs">
            <span className="text-gray-500 font-bold">Budget</span>
            <span className="text-gray-300 text-right">
              {details.budget?.toLocaleString('fr-FR')} $US
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 p-4 text-xs">
          <span className="text-gray-500 font-bold">Langue originale</span>
          <span className="text-gray-300 text-right uppercase">
            {details.original_language}
          </span>
        </div>
        {details.production_countries &&
          details.production_countries.length > 0 && (
            <div className="grid grid-cols-2 p-4 text-xs">
              <span className="text-gray-500 font-bold">Pays de production</span>
              <span className="text-gray-300 text-right">
                {details.production_countries[0].name}
              </span>
            </div>
          )}
        <div className="p-4 space-y-2">
          <span className="text-gray-500 text-[11px] font-bold block">
            Studios
          </span>
          <div className="flex flex-col items-end gap-1">
            {details.production_companies?.slice(0, 3).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (c: any) => (
                <span
                  key={c.id}
                  className="text-gray-300 text-[11px] text-right leading-tight"
                >
                  {c.name}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}
