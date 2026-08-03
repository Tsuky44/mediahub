'use client'

import { Check, Download, Loader2, Plus } from 'lucide-react'
import { useMediaServerType } from '@/app/dashboard/_hooks/useMediaServerType'

interface RequestStatusButtonProps {
  status: string
  loading: boolean
  canRequest: boolean
  hasUnrequestedSeasons: boolean
  isTv: boolean
  onPrimaryClick: () => void
  onSeasonClick: () => void
  onStatusClick?: () => void
}

export function RequestStatusButton({
  status,
  loading,
  canRequest,
  hasUnrequestedSeasons,
  isTv,
  onPrimaryClick,
  onSeasonClick,
  onStatusClick,
}: RequestStatusButtonProps) {
  const serverType = useMediaServerType()
  const serverName = serverType === 'jellyfin' ? 'Jellyfin' : 'Emby'
  if (status === 'partial') {
    return (
      <div className="flex gap-2">
        <button
          onClick={onStatusClick}
          className="flex items-center gap-2 rounded-full bg-purple-600/20 hover:bg-purple-600/30 px-6 py-3 font-semibold text-purple-400 border border-purple-500/30 cursor-pointer backdrop-blur-sm transition-all"
        >
          <Check className="h-5 w-5" />
          Partiellement disponible
        </button>
        {canRequest && isTv && (
          <button
            onClick={onSeasonClick}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Compléter
          </button>
        )}
      </div>
    )
  }

  if (status === 'available') {
    return (
      <div className="flex gap-2">
        <button
          onClick={onStatusClick}
          className="flex items-center gap-2 rounded-full bg-green-600/20 hover:bg-green-600/30 px-6 py-3 font-semibold text-green-400 border border-green-500/30 cursor-pointer backdrop-blur-sm transition-all"
        >
          <Check className="h-5 w-5" />
          Disponible sur {serverName}
        </button>
        {canRequest && hasUnrequestedSeasons && (
          <button
            onClick={onSeasonClick}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Demander plus
          </button>
        )}
      </div>
    )
  }

  if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex gap-2">
        <button
          onClick={onStatusClick}
          className="flex items-center gap-2 rounded-full bg-yellow-600/20 hover:bg-yellow-600/30 px-6 py-3 font-semibold text-yellow-400 border border-yellow-500/30 cursor-pointer backdrop-blur-sm transition-all"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          En cours de traitement...
        </button>
        {canRequest && isTv && (
          <button
            onClick={onSeasonClick}
            className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Demander plus
          </button>
        )}
      </div>
    )
  }

  // Default: not available / unknown
  if (!canRequest) return null

  return (
    <button
      onClick={onPrimaryClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-[0_0_25px_rgba(79,70,229,0.4)] hover:shadow-[0_0_35px_rgba(79,70,229,0.6)] hover:scale-105 active:scale-95"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
      {loading ? 'Envoi de la demande...' : 'Demander'}
    </button>
  )
}
