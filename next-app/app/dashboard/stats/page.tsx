import React from 'react'
import { JellystatService, WatchHistoryItem } from '@/lib/services/jellystat'
import { EmbyService } from '@/lib/services/emby'
import { getSetting } from '@/lib/settings'
import { StatsCharts } from './StatsCharts'
import { ChevronLeft, ChevronRight, Clock, Film, Play, User, Activity, TrendingUp, AlertCircle, Settings, Calendar } from 'lucide-react'
import { formatDistanceToNow, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addYears, subYears } from 'date-fns'
import { fr } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

async function getEmbyImageUrl(itemId: string, jellystat?: JellystatService | null) {
  try {
    // Try Jellystat proxy first as it's already configured for the user
    if (jellystat) {
      const url = await jellystat.getItemImageUrl(itemId)
      if (url) return url
    }

    // Fallback to direct Emby if configured
    const emby = new EmbyService()
    return await emby.getItemImageUrl(itemId)
  } catch (e) {
    return null
  }
}

interface StatsPageProps {
  searchParams: Promise<{
    period?: string;
    month?: string;
    year?: string;
    weekOffset?: string;
  }>
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  // 0. Unwrap searchParams (Next.js 15 requirement)
  const params = await searchParams
  
  // 1. Explicit Config Retrieval
  const jellystatUrl = await getSetting('jellystat_url')
  const jellystatApiKey = await getSetting('jellystat_api_key')

  // Calculate days based on period
  const period = params.period || 'month'
  const now = new Date()
  let days = 30
  let periodTitle = ""
  
  // Date range for filtering
  let startDate = new Date()
  let endDate = new Date()

  // Navigation URLs
  let prevHref = ""
  let nextHref = ""

  if (period === 'week') {
    const weekOffset = params.weekOffset ? parseInt(params.weekOffset) : 0
    const targetDate = addWeeks(now, weekOffset)
    startDate = startOfWeek(targetDate, { weekStartsOn: 1 })
    endDate = endOfWeek(targetDate, { weekStartsOn: 1 })
    
    days = differenceInDays(now, startDate) + 1
    if (days < 7) days = 7

    periodTitle = `Semaine du ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(startDate)}`
    prevHref = `?period=week&weekOffset=${weekOffset - 1}`
    nextHref = `?period=week&weekOffset=${weekOffset + 1}`
    
  } else if (period === 'month') {
    const month = params.month ? parseInt(params.month) : now.getMonth()
    const year = params.year ? parseInt(params.year) : now.getFullYear()
    const targetDate = new Date(year, month, 1)
    
    startDate = startOfMonth(targetDate)
    endDate = endOfMonth(targetDate)
    
    days = differenceInDays(now, startDate) + 1
    if (days < 0) days = 30

    periodTitle = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(targetDate)
    
    const prevMonth = subMonths(targetDate, 1)
    const nextMonth = addMonths(targetDate, 1)
    
    prevHref = `?period=month&month=${prevMonth.getMonth()}&year=${prevMonth.getFullYear()}`
    nextHref = `?period=month&month=${nextMonth.getMonth()}&year=${nextMonth.getFullYear()}`
    
  } else if (period === 'year') {
    const year = params.year ? parseInt(params.year) : now.getFullYear()
    const targetDate = new Date(year, 0, 1)
    startDate = startOfYear(targetDate)
    endDate = endOfYear(targetDate)
    
    days = differenceInDays(now, startDate) + 1
    periodTitle = `Année ${year}`
    
    prevHref = `?period=year&year=${year - 1}`
    nextHref = `?period=year&year=${year + 1}`
  }

  // Calculate effective days to fetch from API
  // We need to fetch from the start of the selected period until now
  const daysSinceStart = differenceInDays(now, startDate) + 2 // +2 to be safe with timezones
  const effectiveDays = Math.max(30, daysSinceStart)

  // 2. Initialize Service Explicitly
  let jellystat: JellystatService | null = null
  
  if (jellystatUrl && jellystatApiKey) {
    jellystat = new JellystatService({ 
      url: jellystatUrl, 
      apiKey: jellystatApiKey 
    })
  } else {
    // Fallback to internal init if explicit fails (shouldn't happen if getSetting works)
    jellystat = new JellystatService()
  }

  // 3. Fetch Data (Parallel)
  const emby = new EmbyService()
  const historyLimit = period === 'year' ? 3000 : 1000
  const [historyRaw, watchStats, libraryStats, userStats, libraryViews, mostViewedData, embySessions] = await Promise.all([
    jellystat.getHistory(historyLimit, 0, effectiveDays).catch(e => { console.error('History fetch failed:', e); return []; }),
    jellystat.getWatchStats(effectiveDays).catch(e => { console.error('WatchStats fetch failed:', e); return null; }),
    jellystat.getLibraryStats().catch(e => { console.error('LibraryStats fetch failed:', e); return []; }),
    jellystat.getUserStats(effectiveDays).catch(e => { console.error('UserStats fetch failed:', e); return []; }),
    jellystat.getViewsByLibraryType(effectiveDays).catch(e => { console.error('LibraryViews fetch failed:', e); return []; }),
    jellystat.getMostViewed(10, effectiveDays).catch(e => { console.error('MostViewed fetch failed:', e); return []; }),
    emby.getSessions().catch(e => { console.error('Emby sessions fetch failed:', e); return []; })
  ])

  // Process history and apply precise filtering for the selected period
  const historyArray = (Array.isArray(historyRaw) ? historyRaw : []).filter((item: any) => {
    const itemDate = new Date(item.ActivityDateInserted || item.DateCreated)
    return itemDate >= startDate && itemDate <= endDate
  })

  // Process Most Viewed from filtered history
  const mostViewedMap = new Map()
  historyArray.forEach((item: any) => {
    const isSeries = item.Type === 'Episode' || !!item.SeriesName
    const key = isSeries ? (item.SeriesId || item.SeriesName) : (item.NowPlayingItemId || item.Id)
    
    if (!key) return

    if (!mostViewedMap.has(key)) {
       mostViewedMap.set(key, {
         ...item,
         Name: isSeries ? item.SeriesName : (item.NowPlayingItemName || item.Name),
         count: 1,
         totalDuration: item.PlaybackDuration || 0,
         lastView: new Date(item.ActivityDateInserted || item.DateCreated)
       })
     } else {
       const existing = mostViewedMap.get(key)
       existing.count += 1
       existing.totalDuration += (item.PlaybackDuration || 0)
       const currentDate = new Date(item.ActivityDateInserted || item.DateCreated)
       if (currentDate > existing.lastView) {
         existing.lastView = currentDate
       }
     }
   })
 
   const mostViewed = Array.from(mostViewedMap.values())
     .sort((a, b) => b.count - a.count)
     .slice(0, 10)

  // Calculate unique active users for the period
  const uniqueUsers = new Set(historyArray.map(item => item.UserId || item.UserName))
  const totalActiveUsers = uniqueUsers.size
  const activeNowCount = Array.isArray(embySessions) 
    ? embySessions.filter((s: any) => s.NowPlayingItem).length 
    : 0

  // Process Hourly Activity
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}h`,
    value: 0
  }))

  const hasRealData = historyArray.length > 0 || (Array.isArray(libraryStats) && libraryStats.length > 0)
  const serverUrl = jellystatUrl || await jellystat.getServiceUrl()

  if (historyArray.length > 0) {
    historyArray.forEach((item: WatchHistoryItem) => {
      const dateString = item.ActivityDateInserted || item.DateCreated || (item as any).DateInserted
      if (!dateString) return
      
      const date = new Date(dateString)
      const hour = date.getHours()
      if (hourlyActivity[hour]) {
        hourlyActivity[hour].value++
      }
    })
  }

  // Process Daily Activity
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const dailyActivity = dayNames.map(day => ({
    name: day,
    value: 0
  }))

  if (historyArray.length > 0) {
    historyArray.forEach((item: WatchHistoryItem) => {
      const dateString = item.ActivityDateInserted || item.DateCreated || (item as any).DateInserted
      if (!dateString) return

      const date = new Date(dateString)
      const dayIdx = date.getDay()
      if (dailyActivity[dayIdx]) {
        dailyActivity[dayIdx].value++
      }
    })
  }
  
  // Reorder daily activity to start from Monday for display
  const orderedDailyActivity = [
    dailyActivity[1], dailyActivity[2], dailyActivity[3], 
    dailyActivity[4], dailyActivity[5], dailyActivity[6], dailyActivity[0]
  ]

  // Process Library Distribution
  let libraryDistribution: { name: string, value: number }[] = []
  
  if (libraryViews && libraryViews.length > 0) {
    const supported = ["Movie", "Series", "Audio", "Other"]
    const mapped: Record<string, number> = {}

    libraryViews.forEach((lib: any) => {
      let type = lib.LibraryType || lib.name || 'Other'
      // Normalisation des types
      if (type === 'Episode' || type === 'tvshows' || type === 'tvshow' || type === 'Series') type = 'Series'
      if (type === 'Movie' || type === 'movies') type = 'Movie'
      if (type === 'Audio' || type === 'music') type = 'Audio'
      
      if (!supported.includes(type)) type = 'Other'
      
      mapped[type] = (mapped[type] || 0) + (lib.ViewCount || lib.value || 0)
    })

    libraryDistribution = Object.entries(mapped).map(([name, value]) => ({ name, value }))
  } else if (libraryStats && libraryStats.length > 0) {
    libraryDistribution = libraryStats.map((lib: any) => ({ 
      name: lib.LibraryName, 
      value: lib.TotalItems 
    }))
  }

  // Aggregate Recent History to merge duplicate views of the same content within the same week
  const aggregatedHistory: any[] = []
  const historyMap = new Map<string, any>()

  historyArray.forEach((item: any) => {
    const itemId = item.NowPlayingItemId
    const userId = item.UserId || item.UserName
    const date = new Date(item.ActivityDateInserted || item.DateCreated)
    
    // Create a key based on Item and User
    const key = `${itemId}-${userId}`
    
    if (historyMap.has(key)) {
      const existing = historyMap.get(key)
      const existingDate = new Date(existing.ActivityDateInserted || existing.DateCreated)
      
      // Check if they are within 7 days of each other
      const diffTime = Math.abs(date.getTime() - existingDate.getTime())
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      if (diffDays <= 7) {
        // Merge them
        existing.PlaybackDuration = (existing.PlaybackDuration || 0) + (item.PlaybackDuration || 0)
        // Keep the most recent date
        if (date > existingDate) {
          existing.ActivityDateInserted = item.ActivityDateInserted
          existing.DateCreated = item.DateCreated
          existing.Client = item.Client
          existing.DeviceName = item.DeviceName
        }
        return
      }
    }
    
    // If no existing entry or not within 7 days, add a new one
    // We clone the item to avoid modifying the original array if needed
    const newItem = { ...item }
    historyMap.set(key, newItem)
    aggregatedHistory.push(newItem)
  })

  // Sort aggregated history by date descending
  aggregatedHistory.sort((a, b) => {
    const dateA = new Date(a.ActivityDateInserted || a.DateCreated).getTime()
    const dateB = new Date(b.ActivityDateInserted || b.DateCreated).getTime()
    return dateB - dateA
  })

  if (!hasRealData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-10 max-w-2xl w-full space-y-6">
          <div className="bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Activity className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Serveur Injoignable ou Erreur d'Authentification</h2>
            <p className="text-gray-400 text-sm">
              Impossible de récupérer les données depuis l'instance Jellystat.
            </p>
             <div className="mt-4 p-4 bg-black/40 rounded text-left space-y-2 border border-red-500/20">
                <div className="flex justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-700 pb-2 mb-2">
                  <span>Configuration Détectée</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <span className="text-gray-500">URL:</span>
                  <code className="text-blue-400 font-mono break-all">{serverUrl || 'Non définie'}</code>
                  
                  <span className="text-gray-500">Clé API:</span>
                  <code className="text-yellow-400 font-mono">
                    {jellystatApiKey ? `${jellystatApiKey.substring(0, 4)}...${jellystatApiKey.substring(jellystatApiKey.length - 4)}` : 'Non définie'}
                  </code>
                </div>
            </div>
          </div>
          <div className="pt-4 text-xs text-gray-500 text-left space-y-2">
            <p className="font-semibold text-gray-400 uppercase tracking-wider">Solutions possibles :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vérifiez que le container Docker est démarré</li>
              <li>Vérifiez que l'URL est accessible depuis ce serveur (Next.js)</li>
              <li>Vérifiez que la clé API est correcte (essayez de la régénérer)</li>
              <li>Si vous utilisez HTTPS avec un certificat auto-signé, les erreurs SSL sont ignorées mais peuvent persister</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // 4. Calculate Stats from Filtered Data
  // We prioritize historyArray for watch time as it's the most accurate source we have filtered locally
  const totalWatchTimeSeconds = historyArray.reduce((acc: number, item: any) => acc + (item.PlaybackDuration || 0), 0)
  const totalHours = Math.round(totalWatchTimeSeconds / 3600)
  
  // Use watchStats for total plays if available, otherwise use historyArray length
  let totalPlays = historyArray.length
  const statsArray = watchStats?.stats && Array.isArray(watchStats.stats) 
    ? watchStats.stats 
    : (Array.isArray(watchStats) ? watchStats : []);

  if (statsArray.length > 0) {
    let playsFromStats = 0
    statsArray.forEach((dayStat: any) => {
      const date = new Date(dayStat.Key);
      if (date >= startDate && date <= endDate) {
        Object.values(dayStat).forEach((val: any) => {
          if (val && typeof val === 'object' && val.count) {
            playsFromStats += val.count
          }
        });
      }
    });
    if (playsFromStats > totalPlays) totalPlays = playsFromStats
  }

  const subValueLabel = period === 'week' ? '7 jours' : period === 'year' ? 'Année' : 'Mois'

  return (
    <div className="space-y-8 p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Vos Statistiques</h1>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-sm font-medium px-2 py-0.5 bg-gray-800 rounded text-blue-400 border border-gray-700">
              {periodTitle}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-sm">{totalHours}h de visionnage</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Aujourd'hui & Navigation */}
          <div className="flex items-center gap-2">
            <a 
              href="/dashboard/stats" 
              className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5" />
              Aujourd'hui
            </a>

            <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
              <a href={prevHref} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </a>
              <div className="h-4 w-px bg-gray-700 mx-1" />
              <a href={nextHref} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Period Selectors */}
          <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
            <PeriodButton active={period === 'week'} href="?period=week" label="Semaine" />
            <PeriodButton active={period === 'month'} href="?period=month" label="Mois" />
            <PeriodButton active={period === 'year'} href="?period=year" label="Année" />
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Temps de visionnage" 
          value={`${totalHours}h`} 
          subValue={`Total ${subValueLabel}`}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
        />
        <StatCard 
          title="Contenus vus" 
          value={totalPlays.toString()} 
          subValue={`Films & Épisodes (${subValueLabel})`}
          icon={<Play className="h-5 w-5 text-green-500" />}
        />
        <StatCard 
          title="Activité récente" 
          value={historyArray.length > 0 ? formatDistanceToNow(new Date(historyArray[0].ActivityDateInserted || historyArray[0].DateCreated), { addSuffix: true, locale: fr }) : 'Aucune'} 
          subValue="Dernière session"
          icon={<Activity className="h-5 w-5 text-purple-500" />}
        />
        <StatCard 
          title="Utilisateurs" 
          value={totalActiveUsers.toString()} 
          subValue={`${activeNowCount} en lecture actuelle`}
          icon={<User className="h-5 w-5 text-orange-500" />}
        />
      </div>

      {/* Charts */}
      <StatsCharts 
        hourlyActivity={hourlyActivity} 
        dailyActivity={orderedDailyActivity} 
      />

      {/* Top Content & History */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Most Viewed (Simulated from history if endpoint not available) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              Contenus les plus vus
            </h2>
          </div>
          <div className="space-y-3">
            {mostViewed.map((item: any, idx: number) => (
              <TopItemCard key={item.Id || idx} item={item} rank={idx + 1} jellystat={jellystat} />
            ))}
            {mostViewed.length === 0 && (
              <p className="text-gray-500 italic py-10 text-center">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Recent History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Historique récent
          </h2>
          <div className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Contenu</th>
                  <th className="px-6 py-4 font-medium">Client / Appareil</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {aggregatedHistory.slice(0, 50).map((item: any) => (
                  <tr key={item.Id || `${item.NowPlayingItemId}-${item.ActivityDateInserted}`} className="hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-gray-900">
                           <EmbyImage itemId={item.NowPlayingItemId} alt={item.NowPlayingItemName} jellystat={jellystat} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                            {item.NowPlayingItemName}
                          </div>
                          <div className="text-xs text-gray-500">{item.SeriesName ? 'Épisode' : 'Film'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{item.Client}</div>
                      <div className="text-xs text-gray-500">{item.DeviceName}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDistanceToNow(new Date(item.ActivityDateInserted || item.DateCreated), { addSuffix: true, locale: fr })}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-gray-400">
                      {Math.floor((item.PlaybackDuration || 0) / 60)}m
                    </td>
                  </tr>
                ))}
                {aggregatedHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">
                      Aucun historique de visionnage trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-800 p-6 shadow-sm border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <p className="text-xs text-gray-500 mt-1">{subValue}</p>
    </div>
  )
}

function PeriodButton({ active, href, label }: { active: boolean, href: string, label: string }) {
  return (
    <a
      href={href}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
          : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
      }`}
    >
      {label}
    </a>
  )
}

function TopItemCard({ item, rank, jellystat }: { item: any, rank: number, jellystat: JellystatService | null }) {
  // For episodes, we prefer the Series Name if available
  const isEpisode = item.Type === 'Episode' || item.SeriesName || (item.ItemType === 'Episode')
  const name = (isEpisode ? (item.SeriesName || item.Name || item.ItemName) : (item.Name || item.ItemName || item.NowPlayingItemName)) || 'Inconnu'
  
  // Priority to media item ID over activity ID
  const itemId = item.NowPlayingItemId || item.ItemId || item.Id || item.id
  
  const type = item.Type || (item.SeriesName ? 'Série' : 'Film')
  const count = item.ViewCount || item.count || 0
  const subText = count ? `${count} vues` : type

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all group">
      <div className="text-lg font-bold text-gray-600 w-4">{rank}</div>
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
        {itemId ? (
           <EmbyImage itemId={itemId} alt={name} jellystat={jellystat} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800"><Film className="h-4 w-4 text-gray-600" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
          {name}
        </div>
        <div className="text-xs text-gray-500 truncate">{subText}</div>
      </div>
    </div>
  )
}

async function EmbyImage({ itemId, alt, jellystat }: { itemId: string, alt: string, jellystat: JellystatService | null }) {
  const url = await getEmbyImageUrl(itemId, jellystat)
  if (!url) return <div className="w-full h-full bg-gray-800 flex items-center justify-center"><Film className="h-4 w-4 text-gray-600" /></div>
  
  return (
    <img 
      src={url} 
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  )
}
