interface MediaAvailabilityBadgesProps {
  status?: string
}

export default function MediaAvailabilityBadges({
  status,
}: MediaAvailabilityBadgesProps) {
  if (!status) return null
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {status === 'pending' && (
        <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(99,102,241,0.2)]">
          Demandé
        </span>
      )}
      {status === 'available' && (
        <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(74,222,128,0.2)]">
          Disponible
        </span>
      )}
      {status === 'partial' && (
        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-[0_0_10px_rgba(168,85,247,0.2)]">
          Partiellement disponible
        </span>
      )}
    </div>
  )
}
