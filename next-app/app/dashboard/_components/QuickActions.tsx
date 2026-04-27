'use client'

import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/providers/AbilityContext'
import type { Torrent } from '@/lib/services/qbittorrent'
import { useDashboardLiveSearch } from '../_hooks/useDashboardLiveSearch'
import { useDashboardServerStats } from '../_hooks/useDashboardServerStats'
import { useTorrentMonitor } from '../_hooks/useTorrentMonitor'
import {
  getActiveTorrents,
  getTotalSpeeds,
} from '../_utils/dashboard-torrent-stats'
import type { DashboardConfigStatus } from '../_types/dashboard'
import { DashboardSearchBar } from './dashboard/DashboardSearchBar'
import { ServerStatusCard } from './dashboard/ServerStatusCard'
import { LibraryStatsCard } from './dashboard/LibraryStatsCard'
import { TransfersCard } from './dashboard/TransfersCard'
import { QuickNavCards } from './dashboard/QuickNavCards'

interface QuickActionsProps {
  initialTorrents?: Torrent[]
  userName?: string
  isAdmin?: boolean
  configStatus?: DashboardConfigStatus
}

export function QuickActions({
  initialTorrents = [],
  userName,
  configStatus,
}: QuickActionsProps) {
  const ability = useAbility(AbilityContext)
  const canViewStats = ability.can('read', 'DashboardStats')
  const canReadMedia = ability.can('read', 'Media')
  const canReadDownloads = ability.can('read', 'Downloads')

  const search = useDashboardLiveSearch()
  const { servicesStatus, stats } = useDashboardServerStats()
  const { torrents } = useTorrentMonitor({
    enabled: !!configStatus?.hasDownloads && canReadDownloads,
    initialTorrents,
  })

  const activeTorrents = getActiveTorrents(torrents)
  const { totalDlSpeed, totalUlSpeed } = getTotalSpeeds(torrents)

  const gridColsClass = configStatus?.hasDownloads
    ? 'lg:grid-cols-4'
    : 'lg:grid-cols-3'

  return (
    <div className="space-y-6">
      {canReadMedia && (
        <DashboardSearchBar
          userName={userName}
          searchQuery={search.searchQuery}
          onSearchQueryChange={search.setSearchQuery}
          searchResults={search.searchResults}
          isSearching={search.isSearching}
          showResults={search.showResults}
          onFocusOpenResults={() => {
            if (search.searchQuery.length >= 2) search.setShowResults(true)
          }}
          containerRef={search.containerRef}
        />
      )}

      {canViewStats && (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-4`}
        >
          <ServerStatusCard
            servicesStatus={servicesStatus}
            stats={stats}
          />
          <LibraryStatsCard stats={stats} />
          {configStatus?.hasDownloads && (
            <TransfersCard
              activeTorrents={activeTorrents}
              totalDlSpeed={totalDlSpeed}
              totalUlSpeed={totalUlSpeed}
            />
          )}
          <QuickNavCards />
        </div>
      )}
    </div>
  )
}
