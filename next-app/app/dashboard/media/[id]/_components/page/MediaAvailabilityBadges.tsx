interface MediaAvailabilityBadgesProps {
  status?: string
}

export default function MediaAvailabilityBadges({
  status,
}: MediaAvailabilityBadgesProps) {
  if (!status) return null
  return (
    <div className="hidden sm:flex flex-wrap gap-2 mb-3">
      {(status === 'pending' || status === 'processing') && (
        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
          Demandé
        </span>
      )}
      {status === 'unreleased' && (
        <span className="bg-white/10 border border-white/25 text-gray-100 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
          Demandé · en attente de sortie
        </span>
      )}
      {status === 'available' && (
        <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(74,222,128,0.2)]">
          Disponible
        </span>
      )}
      {status === 'partial' && (
        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
          Partiellement disponible
        </span>
      )}
    </div>
  )
}
