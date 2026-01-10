import React from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { JellystatService, WatchHistoryItem } from '@/lib/services/jellystat'
import { EmbyService } from '@/lib/services/emby'
import { getSetting } from '@/lib/settings'
import { StatsCharts } from './StatsCharts'
import { LiveSessions } from '../LiveSessions'
import { SyncPluginButton } from './SyncPluginButton'
import { ChevronLeft, ChevronRight, Clock, Film, Play, User, Activity, TrendingUp, AlertCircle, Calendar, RefreshCw } from 'lucide-react'
import { formatDistanceToNow, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

async function getEmbyImageUrl(itemId: string, instanceId: number) {
  try {
    // Fallback to direct Emby if configured
    const instance = await (prisma as any).instance.findUnique({
      where: { id: instanceId }
    })
    if (!instance) return null

    const emby = new EmbyService(instance.embyUrl, instance.embyApiKey)
    return emby.getItemImageUrl(itemId)
  } catch (e) {
    return null
  }
}

/**
 * Sanitizes playback duration to avoid absurd values (e.g., 346m for a 43m episode)
 * when a session gets stuck or paused for too long.
 * Now supports actual duration if provided.
 */
function sanitizePlaybackDuration(durationInSeconds: number, type: string, actualDurationInSeconds?: number): number {
  if (!durationInSeconds) return 0;
  
  // If we have the actual duration of the media, use it as the absolute maximum + 5% margin for credits/intro
  if (actualDurationInSeconds && actualDurationInSeconds > 0) {
    const margin = actualDurationInSeconds * 0.05;
    const absoluteMax = actualDurationInSeconds + margin;
    if (durationInSeconds > absoluteMax) {
      return actualDurationInSeconds;
    }
    return durationInSeconds;
  }
  
  const minutes = durationInSeconds / 60;
  
  // Fallback thresholds if actual duration is not available
  let maxMinutes = 180; // Default 3h
  
  if (type === 'Episode' || type === 'Series') {
    maxMinutes = 80; // Episodes rarely exceed 80m
  } else if (type === 'Movie') {
    maxMinutes = 240; // Movies rarely exceed 4h
  } else if (type === 'Audio') {
    maxMinutes = 15; // Songs rarely exceed 15m
  }
  
  if (minutes > maxMinutes) {
    return maxMinutes * 60;
  }
  
  return durationInSeconds;
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
  // Check authorization
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Accès restreint</h2>
        <p className="text-gray-400">Veuillez vous connecter pour voir les statistiques.</p>
        <Link href="/api/auth/signin" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Se connecter
        </Link>
      </div>
    )
  }

  const user = session.user as any
  const instanceId = user.instanceId ? parseInt(user.instanceId) : NaN

  // Handle missing or invalid instance ID
  if (isNaN(instanceId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Erreur d'instance</h2>
        <p className="text-gray-400">Impossible d'identifier votre instance. Veuillez vous reconnecter.</p>
      </div>
    )
  }

  // Fetch instance config
  const instance = await (prisma as any).instance.findUnique({
    where: { id: instanceId }
  })

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Instance non trouvée</h2>
        <p className="text-gray-400">Impossible de charger les statistiques pour cette instance.</p>
      </div>
    )
  }

  // 0. Unwrap searchParams (Next.js 15 requirement)
  const params = await searchParams
  
  // 1. Explicit Config Retrieval
  // const jellystatUrl = await getSetting('jellystat_url', instanceId) // No longer needed
  // const jellystatApiKey = await getSetting('jellystat_api_key', instanceId) // No longer needed

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
  // Jellystat service removed
  // let jellystat: JellystatService | null = null
  
  // if (jellystatUrl && jellystatApiKey) {
  //   jellystat = new JellystatService({ 
  //     url: jellystatUrl, 
  //     apiKey: jellystatApiKey 
  //   })
  // } else {
  //   // Fallback to internal init if explicit fails (shouldn't happen if getSetting works)
  //   jellystat = new JellystatService()
  // }

  // 3. Fetch Data (Prisma)
  const [historyRaw, embySessions] = await Promise.all([
    (prisma as any).embyActivityLog.findMany({
      where: {
        instanceId: instanceId,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    }),
    (prisma as any).embyLiveSession.findMany({
      where: {
        instanceId: instanceId
      }
    })
  ])

  // Process history
  const historyArray = historyRaw.map((log: any) => {
    let mediaInfo: any = {}
    try {
      mediaInfo = log.mediaInfo ? JSON.parse(log.mediaInfo) : {}
    } catch (e) {}

    return {
      Id: log.id,
      ItemId: log.itemId,
      NowPlayingItemId: log.itemId,
      UserId: log.embyUserId,
      UserName: log.userName,
      Name: log.itemName,
      SeriesName: mediaInfo.seriesName,
      SeasonName: mediaInfo.seasonName,
      IndexNumber: mediaInfo.episodeIndex,
      ParentIndexNumber: mediaInfo.seasonIndex,
      Type: log.itemType,
      Client: log.client,
      DeviceName: log.device,
      ActivityDateInserted: log.startTime.toISOString(),
      DateCreated: log.startTime.toISOString(),
      PlaybackDuration: log.playDuration, // Already accurate from tracker
      RunTimeTicks: Number(log.totalDuration || 0)
    }
  })

  // 3.5. Duration sanitization is less needed with the new tracker but we keep the logic structure
  // We use the stored totalDuration from the log instead of fetching from Emby
  const itemDurations: Record<string, number> = {}
  historyArray.forEach((item: any) => {
    if (item.RunTimeTicks) {
      itemDurations[item.ItemId] = Math.round(item.RunTimeTicks / 10000000) // Ticks to seconds
    }
  })

  // Process Most Viewed from filtered history
  const mostViewedMap = new Map()
  historyArray.forEach((item: any) => {
    const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie');
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration);

    const isSeries = item.Type === 'Episode' || !!item.SeriesName
    const key = isSeries ? (item.SeriesId || item.SeriesName) : (item.NowPlayingItemId || item.Id)
    
    if (!key) return

    if (!mostViewedMap.has(key)) {
       mostViewedMap.set(key, {
         ...item,
         Name: isSeries ? item.SeriesName : (item.NowPlayingItemName || item.Name),
         count: 1,
         totalDuration: sanitizedDuration,
         lastView: new Date(item.ActivityDateInserted || item.DateCreated)
       })
     } else {
       const existing = mostViewedMap.get(key)
       existing.count += 1
       existing.totalDuration += sanitizedDuration
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
  const uniqueUsers = new Set(historyArray.map((item: any) => item.UserId || item.UserName))
  const totalActiveUsers = uniqueUsers.size
  const activeNowCount = embySessions.length

  // Process Hourly Activity
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}h`,
    value: 0
  }))

  const hasRealData = historyArray.length > 0
  const serverUrl = "Local Tracker"

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

  // Monthly activity for yearly view
  let monthlyActivity: { name: string, value: number }[] | undefined = undefined
  if (period === 'year') {
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const activity = monthNames.map(month => ({ name: month, value: 0 }))
    historyArray.forEach((item: WatchHistoryItem) => {
      const dateString = item.ActivityDateInserted || item.DateCreated || (item as any).DateInserted
      if (!dateString) return
      const date = new Date(dateString)
      const monthIdx = date.getMonth()
      if (activity[monthIdx]) activity[monthIdx].value++
    })
    monthlyActivity = activity
  }

  // Aggregate Recent History to merge duplicate views of the same content within the same week
  const aggregatedHistory: any[] = []
  const historyMap = new Map<string, any>()

  historyArray.forEach((item: any) => {
    const itemId = item.NowPlayingItemId || item.ItemId
    const userId = item.UserId || item.UserName
    const date = new Date(item.ActivityDateInserted || item.DateCreated)
    
    // Create a key based on Item and User
    const key = `${itemId}-${userId}`
    
    const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie')
    const actualDuration = itemDurations[itemId]
    const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)

    if (historyMap.has(key)) {
      const existing = historyMap.get(key)
      const existingDate = new Date(existing.ActivityDateInserted || existing.DateCreated)
      
      // Check if they are within 7 days of each other
      const diffTime = Math.abs(date.getTime() - existingDate.getTime())
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      if (diffDays <= 7) {
        // Merge them
        existing.PlaybackDuration = (existing.PlaybackDuration || 0) + sanitizedDuration
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
    const newItem = { 
      ...item, 
      PlaybackDuration: sanitizedDuration
    }
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
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-10 max-w-2xl w-full space-y-6">
          <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Aucune donnée de visionnage</h2>
            <p className="text-gray-400 text-sm">
              Aucune activité n'a encore été enregistrée pour cette période.
            </p>
             <div className="mt-4 p-4 bg-black/40 rounded text-left space-y-2 border border-blue-500/20">
                <div className="flex justify-between text-xs text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-700 pb-2 mb-2">
                  <span>État du système</span>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                  <span className="text-gray-500">Source:</span>
                  <code className="text-blue-400 font-mono">Tracker Local (WebSocket)</code>
                </div>
            </div>
          </div>
          <div className="pt-4 text-xs text-gray-500 text-left space-y-2">
            <p className="font-semibold text-gray-400 uppercase tracking-wider">Solutions possibles :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vérifiez que le script de tracking est en cours d'exécution</li>
              <li>Lancez une lecture sur Emby pour générer des données</li>
              <li>Vérifiez les logs du tracker pour d'éventuelles erreurs</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // 4. Calculate Stats from Filtered Data
  // We prioritize historyArray for watch time as it's the most accurate source we have filtered locally
  const totalWatchTimeSeconds = historyArray.reduce((acc: number, item: any) => {
    const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie');
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    return acc + sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration);
  }, 0)
  const totalHours = Math.round(totalWatchTimeSeconds / 3600)
  
  // Use watchStats for total plays if available, otherwise use historyArray length
  let totalPlays = historyArray.length
  // Removed Jellystat watchStats logic as we trust our historyArray
  
  const subValueLabel = period === 'week' ? '7 jours' : period === 'year' ? 'Année' : 'Mois'

  return (
    <div className="space-y-8 p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
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
        
        <div className="flex flex-col items-end gap-4">
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
          
          <SyncPluginButton />
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

      {/* Live Sessions */}
      <LiveSessions sessions={embySessions} />

      {/* Charts */}
      <StatsCharts 
        hourlyActivity={hourlyActivity} 
        dailyActivity={orderedDailyActivity}
        monthlyActivity={monthlyActivity}
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
              <TopItemCard key={item.Id || idx} item={item} rank={idx + 1} instanceId={instanceId} />
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
          <div className="rounded-xl bg-gray-900/40 border border-gray-700/50 overflow-hidden backdrop-blur-md shadow-2xl ring-1 ring-white/5">
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
                {aggregatedHistory.slice(0, 50).map((item: any) => {
                  const isSeries = item.ItemType === 'Episode' || item.Type === 'Episode' || !!item.SeriesName;
                  
                  // For episodes, we want the episode name as title
                  const isEpisode = item.Type === 'Episode' || item.ItemType === 'Episode';
                  const displayName = isEpisode 
                    ? (item.Name || item.ItemName || item.NowPlayingItemName)
                    : (isSeries ? (item.SeriesName || item.Name) : (item.NowPlayingItemName || item.Name || item.ItemName));

                  // Construct subtitle: Series Name • S1 E3
                  let subName = null;
                  if (isSeries) {
                    const parts = [];
                    if (item.SeriesName && item.SeriesName !== displayName) {
                      parts.push(item.SeriesName);
                    }
                    if (item.ParentIndexNumber !== undefined && item.IndexNumber !== undefined) {
                      parts.push(`S${item.ParentIndexNumber} • Épisode ${item.IndexNumber}`);
                    } else if (item.NowPlayingItemName && item.NowPlayingItemName !== displayName && item.NowPlayingItemName !== item.SeriesName) {
                      parts.push(item.NowPlayingItemName);
                    }
                    subName = parts.length > 0 ? parts.join(' • ') : null;
                  }

                  return (
                    <tr key={item.Id || `${item.NowPlayingItemId}-${item.ActivityDateInserted}`} className="hover:bg-blue-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-gray-900 border border-gray-700/50">
                            {item.NowPlayingItemId || item.ItemId || item.Id ? (
                              <EmbyImage itemId={item.NowPlayingItemId || item.ItemId || item.Id} alt={displayName} instanceId={instanceId} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800"><Film className="h-4 w-4 text-gray-600" /></div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                              {displayName}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-500 font-medium border border-gray-700">
                                {isSeries ? 'Série' : 'Film'}
                              </span>
                              {subName && (
                                <span className="text-[10px] text-gray-500 truncate max-w-[250px]">
                                  {subName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">{item.Client || item.ClientName || 'Client web'}</div>
                        <div className="text-xs text-gray-500">{item.DeviceName || 'Inconnu'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDistanceToNow(new Date(item.ActivityDateInserted || item.DateCreated), { addSuffix: true, locale: fr })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-blue-400">
                        {Math.floor((item.PlaybackDuration || 0) / 60)}m
                      </td>
                    </tr>
                  );
                })}
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

function TopItemCard({ item, rank, instanceId }: { item: any, rank: number, instanceId: number }) {
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
           <EmbyImage itemId={itemId} alt={name} instanceId={instanceId} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800"><Film className="h-4 w-4 text-gray-600" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
          {name}
        </div>
        <div className="text-xs text-gray-500 truncate group-hover:text-blue-400/60 transition-colors">{subText}</div>
      </div>
    </div>
  )
}

async function EmbyImage({ itemId, alt, instanceId }: { itemId: string, alt: string, instanceId: number }) {
  const url = await getEmbyImageUrl(itemId, instanceId)
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
