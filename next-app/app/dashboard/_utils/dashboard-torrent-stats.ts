import type { Torrent } from '@/lib/services/qbittorrent'

const ACTIVE_STATES = new Set([
  'downloading',
  'stalledDL',
  'uploading',
  'stalledUP',
  'checkingUP',
  'checkingDL',
  'forcedDL',
  'forcedUP',
])

export function formatDashboardSpeed(bytesPerSecond: number): string {
  const mbps = bytesPerSecond / (1024 * 1024)
  return mbps.toFixed(1) + ' Mo/s'
}

export function getActiveTorrents(torrents: Torrent[] | unknown): Torrent[] {
  if (!Array.isArray(torrents)) return []
  return torrents
    .filter((t: Torrent) => ACTIVE_STATES.has(t.state))
    .sort((a: Torrent, b: Torrent) => {
      const aSpeed = (a.dlspeed || 0) + (a.upspeed || 0)
      const bSpeed = (b.dlspeed || 0) + (b.upspeed || 0)
      if (aSpeed > 0 && bSpeed === 0) return -1
      if (aSpeed === 0 && bSpeed > 0) return 1
      return bSpeed - aSpeed
    })
}

export function getTotalSpeeds(torrents: Torrent[] | unknown): {
  totalDlSpeed: number
  totalUlSpeed: number
} {
  if (!Array.isArray(torrents)) {
    return { totalDlSpeed: 0, totalUlSpeed: 0 }
  }
  return {
    totalDlSpeed: torrents.reduce(
      (acc: number, t: Torrent) => acc + (t.dlspeed || 0),
      0
    ),
    totalUlSpeed: torrents.reduce(
      (acc: number, t: Torrent) => acc + (t.upspeed || 0),
      0
    ),
  }
}
