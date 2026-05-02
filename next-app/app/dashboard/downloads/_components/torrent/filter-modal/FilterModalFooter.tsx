'use client'

interface FilterModalFooterProps {
  onClose: () => void
}

export function FilterModalFooter({ onClose }: FilterModalFooterProps) {
  return (
    <div className="p-6 border-t border-white/5 flex justify-end bg-white/5">
      <button
        onClick={onClose}
        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
      >
        Voir les résultats
      </button>
    </div>
  )
}
