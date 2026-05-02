'use client'

import { TorrentManager } from '../TorrentManager'
import { TorrentStats } from '../TorrentStats'
import { TrackerStatsCardLazy } from '../TrackerStatsCardLazy'

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
      <TrackerStatsCardLazy />
      <TorrentStats />
      <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 p-4 shadow-xl">
        <TorrentManager
          canAdd={permissions.canAddTorrent}
          canManage={permissions.canManageTorrents}
        />
      </div>
    </div>
  )
}
