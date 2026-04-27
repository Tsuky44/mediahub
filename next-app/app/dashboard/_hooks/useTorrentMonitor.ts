'use client'

import { useEffect, useState } from 'react'
import { getTorrents } from '../downloads/actions'
import type { Torrent } from '@/lib/services/qbittorrent'

const POLL_MS = 5_000

export interface UseTorrentMonitorOptions {
  enabled: boolean
  initialTorrents?: Torrent[]
}

export interface UseTorrentMonitorResult {
  torrents: Torrent[]
}

export function useTorrentMonitor({
  enabled,
  initialTorrents = [],
}: UseTorrentMonitorOptions): UseTorrentMonitorResult {
  const [torrents, setTorrents] = useState<Torrent[]>(initialTorrents)

  useEffect(() => {
    if (!enabled) return

    const timer = setInterval(async () => {
      const all = (await getTorrents('all')) as Torrent[]
      setTorrents(all)
    }, POLL_MS)

    return () => clearInterval(timer)
  }, [enabled])

  return { torrents }
}
