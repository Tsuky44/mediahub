'use client'

export function StatsLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-gray-400 font-bold animate-pulse">Connexion au conteneur...</p>
    </div>
  )
}
