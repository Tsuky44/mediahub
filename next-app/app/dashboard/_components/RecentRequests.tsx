'use client'

import { ListPlus, User, Users } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useRecentRequests, type MediaRequest } from './recent-requests/useRecentRequests'
import { RequestItem } from './recent-requests/RequestItem'

export function RecentRequests({ requests: initialRequests }: { requests: MediaRequest[] }) {
  const { requests, showMineOnly, setShowMineOnly } = useRecentRequests(initialRequests)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <ListPlus className="w-5 h-5 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Dernières demandes</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMineOnly(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all duration-200 cursor-pointer select-none',
              showMineOnly
                ? 'bg-amber-500/10 text-amber-200/90 border-amber-500/20 hover:bg-amber-500/20'
                : 'bg-indigo-500/10 text-indigo-200/90 border-indigo-500/20 hover:bg-indigo-500/20'
            )}
            title={showMineOnly ? 'Afficher tout le monde' : 'Afficher mes demandes'}
          >
            {showMineOnly ? (
              <>
                <User className="w-3 h-3" />
                Mes demandes
              </>
            ) : (
              <>
                <Users className="w-3 h-3" />
                Tout le monde
              </>
            )}
          </button>
          <Link
            href="/dashboard/requests/list"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Voir tout
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div className="p-4 bg-gray-800/50 rounded-full mb-4">
            <ListPlus className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">
            {showMineOnly ? 'Aucune demande perso récente.' : 'Aucune demande récente.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          <div className="space-y-3">
            {requests.map((request) => (
              <RequestItem key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
