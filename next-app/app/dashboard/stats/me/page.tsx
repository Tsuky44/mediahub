import React from 'react'
import { JellystatService, WatchHistoryItem } from '@/lib/services/jellystat'
import { EmbyService } from '@/lib/services/emby'
import { getSetting } from '@/lib/settings'
import { StatsCharts } from '../StatsCharts'
import { ChevronLeft, ChevronRight, Clock, Film, Play, Activity, TrendingUp, Calendar } from 'lucide-react'
import { formatDistanceToNow, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getEmbyImageUrl(itemId: string, instanceId: number, jellystat?: JellystatService | null) {
  try {
    if (jellystat) {
      const url = await jellystat.getItemImageUrl(itemId)
      if (url) return url
    }
    
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

async function EmbyImage({ itemId, alt, jellystat, instanceId }: { itemId: string, alt: string, jellystat: JellystatService | null, instanceId: number }) {
  const url = await getEmbyImageUrl(itemId, instanceId, jellystat)
  if (!url) return <div className="w-full h-full bg-gray-800 flex items-center justify-center"><Film className="h-4 w-4 text-gray-600" /></div>
  
  return (
    <img 
      src={url} 
      alt={alt}
      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
      loading="lazy"
    />
  )
}

interface TopItemCardProps {
  item: any
  rank: number
  jellystat: JellystatService | null
  instanceId: number
}

async function TopItemCard({ item, rank, jellystat, instanceId }: TopItemCardProps) {
  const isEpisode = item.Type === 'Episode' || item.SeriesName || (item.ItemType === 'Episode')
  const name = (isEpisode ? (item.SeriesName || item.Name || item.ItemName) : (item.Name || item.ItemName || item.NowPlayingItemName)) || 'Inconnu'
  const itemId = item.NowPlayingItemId || item.ItemId || item.Id || item.id
  
  const count = item.ViewCount || item.count || 0
  
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all group">
      <div className="text-lg font-bold text-gray-600 w-4">{rank}</div>
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
        {itemId ? (
          <EmbyImage itemId={itemId} alt={name} jellystat={jellystat} instanceId={instanceId} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Film className="h-4 w-4 text-gray-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
          {name}
        </div>
        <div className="text-xs text-gray-500 truncate">{count} vues</div>
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

interface UserStatsPageProps {
  searchParams: Promise<{
    period?: string;
    month?: string;
    year?: string;
    weekOffset?: string;
  }>
}

export default async function UserStatsPage({ searchParams }: UserStatsPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  const currentUserName = session.user.name
  // @ts-ignore
  const currentEmbyUserId = session.user.embyUserId
  const user = session.user as any
  const instanceId = parseInt(user.instanceId)

  // Fetch instance config
  const instance = await (prisma as any).instance.findUnique({
    where: { id: instanceId }
  })

  if (!instance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <Activity size={48} />
        </div>
        <h2 className="text-2xl font-bold text-white">Instance non trouvée</h2>
        <p className="text-gray-400">Impossible de charger vos statistiques pour cette instance.</p>
      </div>
    )
  }

  const params = await searchParams
  const period = params.period || 'month'
  const now = new Date()
  let days = 30
  let periodTitle = ""
  
  let startDate = new Date()
  let endDate = new Date()
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

  const daysSinceStart = differenceInDays(now, startDate) + 2
  const effectiveDays = Math.max(30, daysSinceStart)

  const jellystatUrl = await getSetting('jellystat_url', instanceId)
  const jellystatApiKey = await getSetting('jellystat_api_key', instanceId)
  const jellystat = new JellystatService({ url: jellystatUrl!, apiKey: jellystatApiKey! })

  const historyLimit = period === 'year' ? 3000 : 1000
  const historyRaw = await jellystat.getHistory(historyLimit, 0, effectiveDays)

  // Filter history for the current user AND the selected period
  const historyArray = (Array.isArray(historyRaw) ? historyRaw : []).filter((item: any) => {
    const itemDate = new Date(item.ActivityDateInserted || item.DateCreated)
    const isPeriodMatch = itemDate >= startDate && itemDate <= endDate
    const isUserMatch = (item.UserId === currentEmbyUserId) || 
                       (item.UserName?.toLowerCase() === currentUserName?.toLowerCase())
    return isPeriodMatch && isUserMatch
  })

  // 3.5. Fetch actual media durations from Emby for precise sanitization
  const emby = new EmbyService(instance.embyUrl, instance.embyApiKey)
  const uniqueItemIds = Array.from(new Set(historyArray.map((item: any) => item.NowPlayingItemId || item.ItemId).filter(Boolean))) as string[]
  const itemDurations = await emby.getItemsDurations(uniqueItemIds)

  // Process Most Viewed for the user
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

  // Hourly & Daily Activity
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ name: `${i}h`, value: 0 }))
  historyArray.forEach((item: WatchHistoryItem) => {
    const date = new Date(item.ActivityDateInserted || item.DateCreated!)
    const hour = date.getHours()
    if (hourlyActivity[hour]) hourlyActivity[hour].value++
  })

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const dailyActivity = dayNames.map(day => ({ name: day, value: 0 }))
  historyArray.forEach((item: WatchHistoryItem) => {
    const date = new Date(item.ActivityDateInserted || item.DateCreated!)
    const dayIdx = date.getDay()
    if (dailyActivity[dayIdx]) dailyActivity[dayIdx].value++
  })
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



  const totalWatchTimeSeconds = historyArray.reduce((acc: number, item: any) => {
    const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie')
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    return acc + sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration)
  }, 0)
  const totalHours = Math.round(totalWatchTimeSeconds / 3600)
  const totalPlays = historyArray.length
  const subValueLabel = period === 'week' ? '7 jours' : period === 'year' ? 'Année' : 'Mois'

  // Aggregated history for the table
  const aggregatedHistory: any[] = []
  const historyMap = new Map<string, any>()
  historyArray.forEach((item: any) => {
    const itemId = item.NowPlayingItemId
    const date = new Date(item.ActivityDateInserted || item.DateCreated)
    const key = `${itemId}`
    const itemType = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie')
    const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, itemType)

    if (historyMap.has(key)) {
      const existing = historyMap.get(key)
      const existingDate = new Date(existing.ActivityDateInserted || existing.DateCreated)
      const diffDays = Math.abs(date.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays <= 7) {
        existing.PlaybackDuration = (existing.PlaybackDuration || 0) + sanitizedDuration
        if (date > existingDate) {
          existing.ActivityDateInserted = item.ActivityDateInserted
          existing.DateCreated = item.DateCreated
        }
        return
      }
    }
    const newItem = { 
      ...item,
      PlaybackDuration: sanitizedDuration
    }
    historyMap.set(key, newItem)
    aggregatedHistory.push(newItem)
  })
  aggregatedHistory.sort((a, b) => new Date(b.ActivityDateInserted || b.DateCreated).getTime() - new Date(a.ActivityDateInserted || a.DateCreated).getTime())

  return (
    <div className="space-y-8 p-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">Mes Statistiques</h1>
          <div className="flex items-center gap-2 text-gray-400">
            <span className="text-sm font-medium px-2 py-0.5 bg-gray-800 rounded text-blue-400 border border-gray-700">
              {periodTitle}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-sm">{totalHours}h de visionnage personnel</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <a href="/dashboard/stats/me" className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Aujourd'hui
            </a>
            <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
              <a href={prevHref} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronLeft className="h-5 w-5" /></a>
              <div className="h-4 w-px bg-gray-700 mx-1" />
              <a href={nextHref} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"><ChevronRight className="h-5 w-5" /></a>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
            <PeriodButton active={period === 'week'} href="?period=week" label="Semaine" />
            <PeriodButton active={period === 'month'} href="?period=month" label="Mois" />
            <PeriodButton active={period === 'year'} href="?period=year" label="Année" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mon temps de visionnage" value={`${totalHours}h`} subValue={`Total ${subValueLabel}`} icon={<Clock className="h-5 w-5 text-blue-500" />} />
        <StatCard title="Mes contenus vus" value={totalPlays.toString()} subValue={`Films & Épisodes (${subValueLabel})`} icon={<Play className="h-5 w-5 text-green-500" />} />
        <StatCard title="Mon activité récente" value={historyArray.length > 0 ? formatDistanceToNow(new Date(historyArray[0].ActivityDateInserted || historyArray[0].DateCreated), { addSuffix: true, locale: fr }) : 'Aucune'} subValue="Dernière session" icon={<Activity className="h-5 w-5 text-purple-500" />} />
        <StatCard title="Ma moyenne journalière" value={Math.round(totalHours / (days || 1)).toString() + 'h'} subValue="Heures / jour" icon={<TrendingUp className="h-5 w-5 text-orange-500" />} />
      </div>

      <StatsCharts 
        hourlyActivity={hourlyActivity} 
        dailyActivity={orderedDailyActivity} 
        monthlyActivity={monthlyActivity}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2"><TrendingUp className="h-5 w-5 text-yellow-500" /> Mes favoris</h2>
          <div className="space-y-3">
            {mostViewed.map((item: any, idx: number) => <TopItemCard key={item.Id || idx} item={item} rank={idx + 1} jellystat={jellystat} instanceId={instanceId} />)}
            {mostViewed.length === 0 && <p className="text-gray-500 italic py-10 text-center">Aucune donnée disponible</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" /> 
            Mon historique
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
              <tbody className="divide-y divide-gray-700/50">
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
                             <EmbyImage itemId={item.NowPlayingItemId || item.ItemId || item.Id} alt={displayName} jellystat={jellystat} instanceId={instanceId} />
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
