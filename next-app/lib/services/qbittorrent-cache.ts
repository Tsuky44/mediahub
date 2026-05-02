import { getQBittorrentService, type Torrent } from './qbittorrent'
import { getSetting } from '../settings'

/**
 * qBittorrent's sync/maindata uses snake_case field names,
 * while torrents/info uses camelCase. Normalize here so
 * downstream UI always gets the same shape.
 */
function normalizeTorrent(hash: string, raw: Record<string, unknown>): Torrent {
  return {
    hash,
    name: String(raw.name ?? ''),
    state: String(raw.state ?? ''),
    progress: Number(raw.progress ?? 0),
    dlspeed: Number(raw.dlspeed ?? raw.dl_speed ?? 0),
    upspeed: Number(raw.upspeed ?? raw.up_speed ?? 0),
    eta: Number(raw.eta ?? 0),
    size: Number(raw.size ?? 0),
    num_seeds: Number(raw.num_seeds ?? 0),
    num_leechs: Number(raw.num_leechs ?? 0),
    added_on: Number(raw.added_on ?? 0),
    ratio: Number(raw.ratio ?? 0),
    uploaded: Number(raw.uploaded ?? 0),
    downloaded: Number(raw.downloaded ?? 0),
    uploaded_session: Number(raw.uploaded_session ?? 0),
    downloaded_session: Number(raw.downloaded_session ?? 0),
    tags: String(raw.tags ?? ''),
    num_incomplete: Number(raw.num_incomplete ?? 0),
    num_complete: Number(raw.num_complete ?? 0),
    tracker: String(raw.tracker ?? ''),
    category: String(raw.category ?? ''),
    last_activity: Number(raw.last_activity ?? 0),
    completion_on: Number(raw.completion_on ?? 0),
    availability: Number(raw.availability ?? 0),
    max_seeding_time: Number(raw.max_seeding_time ?? 0),
    seeding_time: Number(raw.seeding_time ?? 0),
  }
}

interface CacheState {
  torrents: Record<string, Torrent>
  serverState: Record<string, unknown>
  tags: string[]
  categories: Record<string, { name: string; savePath: string }>
  lastUpdate: number
  rid: number
}

export type OnCacheChange = () => void

const GLOBAL_KEY = '__qbittorrentCache'
const g = globalThis as unknown as Record<string, { instance: QBittorrentCache | null }>
if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { instance: null }

const DEFAULT_POLL_INTERVAL_MS = 5_000
const MIN_POLL_INTERVAL_MS = 2_000
const SLOW_REFRESH_INTERVAL_MS = 60_000

export class QBittorrentCache {
  private fastTimer: NodeJS.Timeout | null = null
  private slowTimer: NodeJS.Timeout | null = null
  private started = false
  private isFastTicking = false
  private state: CacheState = { torrents: {}, serverState: {}, tags: [], categories: {}, lastUpdate: 0, rid: 0 }
  private listeners: OnCacheChange[] = []
  private qbtService: Awaited<ReturnType<typeof getQBittorrentService>> = null

  static getInstance(): QBittorrentCache {
    if (!g[GLOBAL_KEY].instance) g[GLOBAL_KEY].instance = new QBittorrentCache()
    return g[GLOBAL_KEY].instance!
  }

  addChangeListener(cb: OnCacheChange): void {
    this.listeners.push(cb)
  }

  removeChangeListener(cb: OnCacheChange): void {
    this.listeners = this.listeners.filter(l => l !== cb)
  }

  start(): void {
    if (this.started) return
    this.started = true
    getQBittorrentService().then(qbt => {
      this.qbtService = qbt
      this.initTimers().catch(() => {})
    })
  }

  private async initTimers(): Promise<void> {
    const intervalStr = await getSetting('qbittorrent_poll_interval', '5')
    let intervalMs = parseInt(intervalStr, 10) * 1000
    if (isNaN(intervalMs) || intervalMs < MIN_POLL_INTERVAL_MS) intervalMs = DEFAULT_POLL_INTERVAL_MS

    // Fast tick: sync/maindata only (torrent states, speeds, serverState)
    this.fastTick().catch(() => {})
    this.fastTimer = setInterval(() => this.fastTick().catch(() => {}), intervalMs)
    console.log(`[QBittorrentCache] Fast tick every ${intervalMs}ms (setting: qbittorrent_poll_interval)`)

    // Slow tick: tags & categories (rarely change)
    this.slowTick().catch(() => {})
    this.slowTimer = setInterval(() => this.slowTick().catch(() => {}), SLOW_REFRESH_INTERVAL_MS)
    console.log(`[QBittorrentCache] Slow tick every ${SLOW_REFRESH_INTERVAL_MS}ms`)
  }

  stop(): void {
    if (this.fastTimer) clearInterval(this.fastTimer)
    if (this.slowTimer) clearInterval(this.slowTimer)
    this.fastTimer = null
    this.slowTimer = null
    this.started = false
  }

  getTorrents(filter?: string): Torrent[] {
    let list = Object.values(this.state.torrents)
    if (filter && filter !== 'all') {
      const f = filter.toLowerCase()
      list = list.filter(t => {
        const s = (t.state ?? '').toLowerCase()
        switch (f) {
          case 'downloading': return ['downloading','metadl','allocating','checkingdl','forceddl'].includes(s)
          case 'seeding': return ['uploading','stalledup','forcedup','queuedup','checkingup'].includes(s)
          case 'completed': return ['uploading','stalledup','forcedup','pausedup'].includes(s)
          case 'paused': return s === 'pauseddl' || s === 'pausedup'
          case 'active': return (t.dlspeed ?? 0) > 0 || (t.upspeed ?? 0) > 0
          case 'inactive': return (t.dlspeed ?? 0) === 0 && (t.upspeed ?? 0) === 0
          case 'resumed': return !s.startsWith('paused')
          case 'stalled': return s === 'stalleddl' || s === 'stalledup'
          case 'errored': return s === 'missingfiles' || s === 'error'
          default: return true
        }
      })
    }
    return list
  }

  getGlobalStats(): Record<string, unknown> {
    const s = this.state.serverState
    let globalSeeds = 0
    let globalLeechs = 0
    let torrentDlSpeed = 0
    let torrentUpSpeed = 0
    let torrentDlData = 0
    let torrentUpData = 0
    for (const t of Object.values(this.state.torrents)) {
      globalSeeds += (t.num_seeds ?? 0)
      globalLeechs += (t.num_leechs ?? 0)
      torrentDlSpeed += (t.dlspeed ?? 0)
      torrentUpSpeed += (t.upspeed ?? 0)
      torrentDlData += (t.downloaded_session ?? 0)
      torrentUpData += (t.uploaded_session ?? 0)
    }
    return {
      dl_info_speed: Number(s?.dl_info_speed ?? torrentDlSpeed),
      up_info_speed: Number(s?.up_info_speed ?? torrentUpSpeed),
      dl_info_data: Number(s?.dl_info_data ?? torrentDlData),
      up_info_data: Number(s?.up_info_data ?? torrentUpData),
      alltime_dl: Number(s?.alltime_dl ?? 0),
      alltime_ul: Number(s?.alltime_ul ?? 0),
      free_space_on_disk: Number(s?.free_space_on_disk ?? 0),
      global_seeds: globalSeeds,
      global_leechs: globalLeechs,
    }
  }

  getTags(): string[] {
    return this.state.tags
  }

  getCategories(): Record<string, { name: string; savePath: string }> {
    return this.state.categories
  }

  getLastUpdate(): number {
    return this.state.lastUpdate
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      try { cb() } catch (err) { console.error('[QBittorrentCache] listener error:', err) }
    }
  }

  private async fastTick(): Promise<void> {
    if (this.isFastTicking) {
      console.log('[QBittorrentCache] fastTick skipped: already running')
      return
    }
    this.isFastTicking = true
    try {
      let qbt = this.qbtService
      if (!qbt) {
        qbt = await getQBittorrentService()
        if (qbt) this.qbtService = qbt
      }
      if (!qbt) return

      let data
      try { data = await qbt.getSyncMainData(this.state.rid) }
      catch (err) {
        const msg = (err as Error).message
        if (msg.includes('401') || msg.includes('403')) {
          console.error('[QBittorrentCache] fastTick: session expired, forcing re-init...')
          await qbt.reinit()
        } else {
          console.error('[QBittorrentCache] fastTick error:', msg)
          this.state.rid = 0
        }
        return
      }
      if (!data) return
      if (typeof data !== 'object') {
        console.error('[QBittorrentCache] fastTick: unexpected non-object response, resetting rid')
        this.state.rid = 0
        return
      }

      try { this.updateMainData(data) } catch (e) { console.error('[QBittorrentCache] updateMainData error:', e) }
      this.state.lastUpdate = Date.now()
      this.notifyListeners()
    } finally {
      this.isFastTicking = false
    }
  }

  private updateMainData(data: Record<string, unknown>): void {
    this.state.rid = Number(data.rid ?? 0)

    const serverState = data.server_state as Record<string, unknown> | undefined
    if (serverState) {
      this.state.serverState = serverState
    } else if (Object.keys(this.state.serverState).length === 0) {
      // Force full_update next tick to recover server_state
      this.state.rid = 0
    }

    if (data.full_update) {
      const raw = (data.torrents as Record<string, Record<string, unknown>>) ?? {}
      const normalized: Record<string, Torrent> = {}
      for (const [hash, torrentData] of Object.entries(raw)) {
        const existing = this.state.torrents[hash]
        const merged = existing ? { ...existing, ...torrentData } : torrentData
        const normalizedTorrent = normalizeTorrent(hash, merged as Record<string, unknown>)
        this.state.torrents[hash] = normalizedTorrent
      }
    } else if (data.torrents) {
      for (const [hash, torrentData] of Object.entries(data.torrents as Record<string, Record<string, unknown>>)) {
        const existing = this.state.torrents[hash]
        const merged = existing ? { ...existing, ...torrentData } : torrentData
        const normalizedTorrent = normalizeTorrent(hash, merged as Record<string, unknown>)
        this.state.torrents[hash] = normalizedTorrent
      }
    }

    const removed = data.torrents_removed as string[] | undefined
    if (removed) {
      for (const h of removed) delete this.state.torrents[h]
    }

    const changedTorrents = data.torrents ? Object.keys(data.torrents as Record<string, unknown>).length : 0
    const removedTorrents = removed?.length ?? 0
    const hadChanges = Boolean(data.full_update) || changedTorrents > 0 || removedTorrents > 0

    this.state.lastUpdate = Date.now()

    if (hadChanges) this.notifyListeners()
  }

  private async slowTick(): Promise<void> {
    let qbt = this.qbtService
    if (!qbt) {
      qbt = await getQBittorrentService()
      if (qbt) this.qbtService = qbt
    }
    if (!qbt) return

    try { this.state.tags = await qbt.getTags() } catch { /* ignore */ }
    try { this.state.categories = await qbt.getCategories() } catch { /* ignore */ }
  }
}
