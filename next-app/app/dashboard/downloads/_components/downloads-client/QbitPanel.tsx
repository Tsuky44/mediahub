'use client'

import { TorrentManager } from '../TorrentManager'
import { TorrentStats } from '../TorrentStats'

interface QbitPanelProps {
  permissions: {
    canAddTorrent: boolean
    canManageTorrents: boolean
    canInteractiveSearch: boolean
  }
  hasProwlarr: boolean
}

export function QbitPanel({ permissions, hasProwlarr }: QbitPanelProps) {
  return (
    <div className="space-y-6">
      <TorrentStats />
      <div className="bg-white/5 rounded-3xl border border-white/5 p-4 shadow-xl">
        <TorrentManager
          canAdd={permissions.canAddTorrent}
          canManage={permissions.canManageTorrents}
        />
      </div>
    </div>
  )
}
