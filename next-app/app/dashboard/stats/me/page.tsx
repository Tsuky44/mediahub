import React from 'react'
import { StatsCharts } from '../StatsCharts'
import { TopItemsTabs } from '@/components/stats/TopItemsTabs'
import { EmbyImage } from '@/components/EmbyImage'
import { ChevronLeft, ChevronRight, Clock, Play, Activity, TrendingUp, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

interface WatchHistoryItem {
  Id?: string | number;
  ItemId?: string;
  NowPlayingItemId?: string;
  UserId?: string;
  UserName?: string;
  Name?: string;
  SeriesName?: string;
  SeriesId?: string;
  TmdbId?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  Type?: string;
  Client?: string;
  DeviceName?: string;
  ActivityDateInserted?: string;
  DateCreated?: string;
  PlaybackDuration?: number;
  RunTimeTicks?: number;
  Source?: string;
  DateInserted?: string;
}

export const dynamic = 'force-dynamic'

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



function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const s = source.toLowerCase();
  const colors = 
    s === 'emby' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
    s === 'plex' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
    s === 'jellyfin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
    'bg-gray-500/20 text-gray-300 border-gray-500/30';
  
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${colors}`}>
      {s}
    </span>
  );
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
  // @ts-ignore
  const externalIds = [user.embyUserId, user.plexUserId, user.jellyfinUserId].filter(Boolean)
  const internalUserId = parseInt(session.user.id)

  // Simplified logic: Match by Internal ID OR External IDs OR Username
  let whereCondition: any = {
    OR: []
  }

  if (!isNaN(internalUserId)) {
    whereCondition.OR.push({ userId: internalUserId })
  }

  if (externalIds.length > 0) {
    whereCondition.OR.push({ embyUserId: { in: externalIds } })
  }
  
  if (currentUserName) {
    whereCondition.OR.push({ userName: currentUserName })
  }

  if (whereCondition.OR.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold text-white">Impossible de charger les statistiques</h2>
        <p className="text-gray-400">Votre utilisateur n'est pas correctement identifié.</p>
      </div>
    )
  }

  const params = await searchParams
  const period = params.period || 'month'
  const now = new Date()
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
    periodTitle = `Semaine du ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(startDate)}`
    prevHref = `?period=week&weekOffset=${weekOffset - 1}`
    nextHref = `?period=week&weekOffset=${weekOffset + 1}`
  } else if (period === 'month') {
    const month = params.month ? parseInt(params.month) : now.getMonth()
    const year = params.year ? parseInt(params.year) : now.getFullYear()
    const targetDate = new Date(year, month, 1)
    startDate = startOfMonth(targetDate)
    endDate = endOfMonth(targetDate)
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
    periodTitle = `Année ${year}`
    prevHref = `?period=year&year=${year - 1}`
    nextHref = `?period=year&year=${year + 1}`
  }

  // 3. Fetch Data (Prisma)
  // Fetch from WatchEvent
  const historyRaw = await prisma.watchEvent.findMany({
    where: {
      ...whereCondition,
      playedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      playedAt: 'desc'
    }
  })

  // Process history to match WatchHistoryItem interface
  const historyArray = historyRaw.map((log: any) => {
    const mediaInfo: any = {
        seriesName: log.seriesName,
        seasonName: log.seasonName,
    };

    return {
      Id: log.id,
      ItemId: log.itemId,
      NowPlayingItemId: log.itemId,
      UserId: log.embyUserId,
      UserName: log.userName,
      Name: log.itemName,
      SeriesName: log.seriesName,
      SeriesId: null,
      TmdbId: log.tmdbId,
      SeasonName: log.seasonName,
      IndexNumber: log.episodeNumber,
      ParentIndexNumber: log.seasonNumber,
      Type: log.itemType,
      Client: log.client,
      DeviceName: log.device,
      ActivityDateInserted: log.playedAt.toISOString(),
      DateCreated: log.playedAt.toISOString(),
      PlaybackDuration: (log.durationMinutes || 0) * 60,
      RunTimeTicks: 0,
      Source: log.client?.toLowerCase().includes('plex') ? 'plex' : 
              log.client?.toLowerCase().includes('jellyfin') ? 'jellyfin' : 'emby'
    }
  })

  // Calculate days for stats
  const days = differenceInDays(now, startDate) + 1

  // 3.5. Duration sanitization
  const itemDurations: Record<string, number> = {}
  historyArray.forEach((item: any) => {
    if (item.RunTimeTicks) {
      itemDurations[item.ItemId] = Math.round(item.RunTimeTicks / 10000000) // Ticks to seconds
    }
  })

  // Process Most Viewed for the user
  const mostViewedMoviesMap = new Map()
  const mostViewedSeriesMap = new Map()

  historyArray.forEach((item: any) => {
    // Aggressive series detection: Episode type is always a series
    const isSeries = item.Type === 'Episode' || !!item.SeriesName || !!item.SeriesId;
    const targetMap = isSeries ? mostViewedSeriesMap : mostViewedMoviesMap
    
    const type = isSeries ? 'Episode' : (item.Type || 'Movie');
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration);

    // Important: for Series, we use the SeriesId for aggregation and images
    let seriesKey = item.SeriesId || item.SeriesName
    if (isSeries && !seriesKey) {
      // Try to extract series name from item name if it follows "Series - S01E01 - Episode"
      if (item.Name?.includes(' - ')) {
        seriesKey = item.Name.split(' - ')[0]
      } else {
        // Last resort: use itemId, but this will prevent aggregation across episodes
        seriesKey = item.NowPlayingItemId || item.ItemId
      }
    }
    
    const key = isSeries ? seriesKey : (item.NowPlayingItemId || item.Id)
    const imageItemId = isSeries ? (item.SeriesId || itemId) : itemId
    
    if (!key) return

    if (!targetMap.has(key)) {
       // For series name fallback: try to extract from "Series - S01E01 - Episode"
       let displayName = item.Name
       if (isSeries) {
         if (item.SeriesName) {
           displayName = item.SeriesName
         } else if (item.Name?.includes(' - ')) {
           displayName = item.Name.split(' - ')[0]
         }
       } else {
         displayName = item.Name || item.NowPlayingItemName
       }

       targetMap.set(key, {
         ...item,
         Name: displayName,
         count: 1,
         totalDuration: sanitizedDuration,
         lastView: item.ActivityDateInserted || item.DateCreated,
         imageItemId: imageItemId,
         tmdbId: item.TmdbId,
         mediaType: isSeries ? 'tv' : 'movie'
       })
     } else {
       const existing = targetMap.get(key)
       existing.count += 1
       existing.totalDuration += sanitizedDuration
       // Update tmdbId if missing
       const currentTmdbId = item.TmdbId
       if (!existing.tmdbId && currentTmdbId) {
          existing.tmdbId = currentTmdbId
       }
     }
  })

  const mostViewedMovies = Array.from(mostViewedMoviesMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const mostViewedSeries = Array.from(mostViewedSeriesMap.values())
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 10)

  // Calculate global stats
  let totalDuration = 0
  let totalPlays = 0
  let moviePlays = 0
  let episodePlays = 0

  historyArray.forEach((item: any) => {
    const isSeries = item.Type === 'Episode' || !!item.SeriesName || !!item.SeriesId;
    const type = isSeries ? 'Episode' : (item.Type || 'Movie');
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration);
    
    totalDuration += sanitizedDuration
    totalPlays += 1
    if (isSeries) {
      episodePlays += 1
    } else {
      moviePlays += 1
    }
  })

  const hours = Math.floor(totalDuration / 3600)
  const minutes = Math.floor((totalDuration % 3600) / 60)
  
  // Calculate average daily
  const dailyAverageSeconds = totalDuration / Math.max(days, 1)
  const dailyHours = Math.floor(dailyAverageSeconds / 3600)
  const dailyMinutes = Math.floor((dailyAverageSeconds % 3600) / 60)

  // Recent History
  const recentHistory = historyArray.slice(0, 20).map((item: any) => ({
    ...item,
    imageItemId: (item.Type === 'Episode' || item.SeriesId) ? (item.SeriesId || item.ItemId) : item.ItemId
  }))

  // 4. Calculate Charts Data
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}h`,
    value: 0
  }))

  const dailyActivityMap = new Map<string, number>()
  const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  
  historyArray.forEach((item: any) => {
    const date = new Date(item.ActivityDateInserted)
    
    // Hourly
    const hour = date.getHours()
    if (hour >= 0 && hour < 24) {
      hourlyActivity[hour].value++
    }

    // Daily
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' })
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    dailyActivityMap.set(dayNameCap, (dailyActivityMap.get(dayNameCap) || 0) + 1)
  })

  const dailyActivity = daysOrder.map(day => ({
    name: day,
    value: dailyActivityMap.get(day) || 0
  }))

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Activity className="text-blue-500" />
            Mes Statistiques
          </h1>
          <p className="text-gray-400 mt-1">
            Analyse de votre consommation média personnelle
          </p>
        </div>
        
        <div className="flex bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
          <PeriodButton active={period === 'week'} href="?period=week" label="Semaine" />
          <PeriodButton active={period === 'month'} href="?period=month" label="Mois" />
          <PeriodButton active={period === 'year'} href="?period=year" label="Année" />
        </div>
      </div>

      {/* Navigation Période */}
      <div className="flex items-center justify-between bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
        <a href={prevHref} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-gray-400" />
        </a>
        <div className="flex items-center gap-2 font-medium text-white">
          <Calendar size={18} className="text-blue-500" />
          {periodTitle}
        </div>
        <a href={nextHref} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
          <ChevronRight size={20} className="text-gray-400" />
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Temps de visionnage" 
          value={`${hours}h ${minutes}m`}
          subValue={`${dailyHours}h ${dailyMinutes}m / jour en moyenne`}
          icon={<Clock className="text-blue-500" />}
        />
        <StatCard 
          title="Total Lectures" 
          value={totalPlays.toString()}
          subValue={`${moviePlays} films, ${episodePlays} épisodes`}
          icon={<Play className="text-green-500" />}
        />
        <StatCard 
          title="Films les plus vus" 
          value={mostViewedMovies[0]?.Name || '-'}
          subValue={`${mostViewedMovies[0]?.count || 0} visionnages`}
          icon={<TrendingUp className="text-purple-500" />}
        />
        <StatCard 
          title="Série favorite" 
          value={mostViewedSeries[0]?.Name || '-'}
          subValue={`${Math.round((mostViewedSeries[0]?.totalDuration || 0) / 3600)}h regardées`}
          icon={<User className="text-orange-500" />}
        />
      </div>

      {/* Charts */}
      <StatsCharts 
        hourlyActivity={hourlyActivity}
        dailyActivity={dailyActivity}
      />

      {/* Top Items Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-yellow-500" />
            Top Contenus
          </h2>
          <TopItemsTabs 
            movies={mostViewedMovies}
            series={mostViewedSeries}
          />
        </div>

        {/* Recent History List */}
        <div className="space-y-4">
           <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-blue-500" />
            Historique Récent
          </h2>
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden">
            {recentHistory.length > 0 ? (
              <div className="divide-y divide-gray-700/50">
                {recentHistory.map((item: any, i: number) => {
                  const isSeries = item.Type === 'Episode' || !!item.SeriesName || !!item.SeriesId;
                  const tmdbId = item.TmdbId || item.tmdbId;
                  const itemId = item.ItemId || item.NowPlayingItemId || item.Id;
                  
                  let searchName = item.Name;
                  if (isSeries) {
                      if (item.SeriesName) {
                          searchName = item.SeriesName;
                      } else if (item.Name && item.Name.includes(' - ')) {
                          searchName = item.Name.split(' - ')[0];
                      } else if (item.Name && item.Name.includes(' : ')) {
                          searchName = item.Name.split(' : ')[0];
                      }
                  }

                  let href = null;
                  if (tmdbId) {
                      href = `/dashboard/media/${tmdbId}?type=${isSeries ? 'tv' : 'movie'}${isSeries && item.ParentIndexNumber !== undefined && item.IndexNumber !== undefined ? `&season=${item.ParentIndexNumber}&episode=${item.IndexNumber}` : ''}`;
                  } else if (itemId) {
                      href = `/dashboard/media/${itemId}?type=${isSeries ? 'tv' : 'movie'}&source=${item.Source || 'emby'}&name=${encodeURIComponent(searchName || 'Unknown')}${isSeries && item.ParentIndexNumber !== undefined && item.IndexNumber !== undefined ? `&season=${item.ParentIndexNumber}&episode=${item.IndexNumber}` : ''}`;
                  }

                  const Content = (
                    <div className="p-3 hover:bg-gray-700/30 transition-colors flex gap-3 items-center">
                      <div className="w-12 h-16 bg-gray-900 rounded-md overflow-hidden flex-shrink-0 relative">
                        <EmbyImage 
                          itemId={item.imageItemId}
                          className="w-full h-full object-cover"
                          alt={item.Name}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{item.Name}</div>
                        <div className="text-sm text-gray-400 truncate">
                          {item.SeriesName && <span className="text-blue-400">{item.SeriesName} • </span>}
                          {formatDistanceToNow(new Date(item.DateCreated), { addSuffix: true, locale: fr })}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {Math.round((item.PlaybackDuration || 0) / 60)} min
                          </span>
                          <SourceBadge source={item.Source} />
                        </div>
                      </div>
                    </div>
                  );

                  return href ? (
                    <Link key={i} href={href} className="block">
                      {Content}
                    </Link>
                  ) : (
                    <div key={i}>
                      {Content}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Aucun historique récent
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
