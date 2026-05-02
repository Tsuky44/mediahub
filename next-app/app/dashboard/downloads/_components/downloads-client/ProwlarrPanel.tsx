'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { ProwlarrSearch } from '@/components/global/ProwlarrSearch'

interface ProwlarrPanelProps {
  hasProwlarr: boolean
  isAdmin?: boolean
  permissions: {
    canAddTorrent: boolean
    canInteractiveSearch: boolean
  }
}

export function ProwlarrPanel({ hasProwlarr, isAdmin, permissions }: ProwlarrPanelProps) {
  if (!hasProwlarr && isAdmin) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="p-6 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-2xl shadow-amber-500/10">
            <Search size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">Prowlarr non configuré</h3>
            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
              Le service Prowlarr n&apos;est pas encore configuré. En tant qu&apos;administrateur, vous pouvez le configurer dans les paramètres.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
          >
            Configurer Prowlarr
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
      <ProwlarrSearch
        title=""
        canManage={permissions.canAddTorrent || permissions.canInteractiveSearch}
      />
    </div>
  )
}
