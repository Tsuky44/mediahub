import React from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatsCharts } from './StatsCharts'
import { LiveSessions } from '../LiveSessions'
import { SyncPluginButton } from './SyncPluginButton'
import { RecentHistory } from './RecentHistory'
import { SourceFilter } from './SourceFilter'
import { UserStatsCard } from './UserStatsCard'
import { TopItemsTabs } from '@/components/stats/TopItemsTabs'
import { ChevronLeft, ChevronRight, Clock, Play, Activity, AlertCircle, Calendar } from 'lucide-react'
import { formatDistanceToNow, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'

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

interface StatsPageProps {
  searchParams: Promise<{
    period?: string;
    month?: string;
    year?: string;
    weekOffset?: string;
    source?: string;
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
  const userInstanceId = user.instanceId ? parseInt(user.instanceId) : NaN
  
  const params = await searchParams
  const sourceFilter = params.source || 'all'

  // Fetch all instances
  const allInstances = await (prisma as any).instance.findMany();
  const instanceTypeMap = new Map<number, string>();
  allInstances.forEach((i: any) => instanceTypeMap.set(i.id, i.type || 'emby'));

  const instanceTypes = Object.fromEntries(instanceTypeMap);

  // Determine target instances based on filter and user restriction
  let targetInstanceIds: number[] | undefined = undefined;
  
  const filteredInstances = allInstances.filter((inst: any) => {
    // If user is restricted to an instance, only include that one
    if (!isNaN(userInstanceId) && inst.id !== userInstanceId) return false;
    return true;
  });

  if (sourceFilter !== 'all' || !isNaN(userInstanceId)) {
    targetInstanceIds = filteredInstances.map((i: any) => i.id);
  }

   const period = params.period || 'week' // Default to week view
   const now = new Date()
   let days = 7
   let periodTitle = ""
   
   let startDate = startOfWeek(now, { locale: fr })
   let endDate = endOfWeek(now, { locale: fr })
   
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
     prevHref = `?period=week&weekOffset=${weekOffset - 1}&source=${sourceFilter}`
     nextHref = `?period=week&weekOffset=${weekOffset + 1}&source=${sourceFilter}`
     
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
     
     prevHref = `?period=month&month=${prevMonth.getMonth()}&year=${prevMonth.getFullYear()}&source=${sourceFilter}`
     nextHref = `?period=month&month=${nextMonth.getMonth()}&year=${nextMonth.getFullYear()}&source=${sourceFilter}`
     
   } else if (period === 'year') {
     const year = params.year ? parseInt(params.year) : now.getFullYear()
     const targetDate = new Date(year, 0, 1)
     startDate = startOfYear(targetDate)
     endDate = endOfYear(targetDate)
     
     days = differenceInDays(now, startDate) + 1
     periodTitle = `Année ${year}`
     prevHref = `?period=year&year=${year - 1}&source=${sourceFilter}`
     nextHref = `?period=year&year=${year + 1}&source=${sourceFilter}`
   } else if (period === 'all') {
     startDate = new Date(2000, 0, 1) // Way back
     endDate = new Date(2100, 0, 1) // Way forward
     periodTitle = "Tout l'historique"
     prevHref = "#"
     nextHref = "#"
   }
 
   // 3. Fetch Data (Prisma)
  // Fetch User Groups for aggregation
  const userGroups = await (prisma as any).userGroup.findMany({
    include: { members: true }
  });
  const userGroupMap = new Map<string, any>(); // key: "instanceId:userId", value: group
  userGroups.forEach((group: any) => {
    group.members.forEach((member: any) => {
        userGroupMap.set(`${member.instanceId}:${member.userId}`, group);
    });
  });

  const [historyRaw, embySessionsRaw] = await Promise.all([
    (prisma as any).embyActivityLog.findMany({
       where: {
         instanceId: targetInstanceIds ? { in: targetInstanceIds } : undefined,
         source: sourceFilter !== 'all' ? sourceFilter : undefined,
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
         instanceId: targetInstanceIds ? { in: targetInstanceIds } : undefined,
         source: sourceFilter !== 'all' ? sourceFilter : undefined,
       }
     })
   ])

  // Sanitize sessions for client component (convert BigInt to Number)
  const embySessions = embySessionsRaw.map((s: any) => ({
    ...s,
    source: s.source || instanceTypeMap.get(s.instanceId) || 'emby',
    runTimeTicks: s.runTimeTicks ? Number(s.runTimeTicks) : null,
    playbackPosition: s.playbackPosition ? Number(s.playbackPosition) : null,
    accumulatedDuration: s.accumulatedDuration || 0
  }))

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
      SeriesId: mediaInfo.seriesId,
      TmdbId: mediaInfo.tmdbId,
      SeasonName: mediaInfo.seasonName,
      IndexNumber: mediaInfo.episodeIndex,
      ParentIndexNumber: mediaInfo.seasonIndex,
      Type: log.itemType,
      Client: log.client,
      DeviceName: log.device,
      ActivityDateInserted: log.startTime.toISOString(),
      DateCreated: log.startTime.toISOString(),
      PlaybackDuration: log.playDuration, // Already accurate from tracker
      RunTimeTicks: Number(log.totalDuration || 0),
      source: log.source || instanceTypeMap.get(log.instanceId) || 'emby',
      instanceId: log.instanceId,
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

  // Pre-process history to find series info for episodes that might be missing it
  const seriesInfoMap = new Map<string, { name: string, id?: string }>();
  historyArray.forEach((item: any) => {
    if (item.SeriesName && (item.SeriesId || item.imageItemId)) {
      if (item.SeriesId) seriesInfoMap.set(String(item.SeriesId), { name: item.SeriesName, id: item.SeriesId });
      if (item.imageItemId) seriesInfoMap.set(String(item.imageItemId), { name: item.SeriesName, id: item.SeriesId });
    }
  });

  // Process Most Viewed from filtered history
  const mostViewedMoviesMap = new Map()
  const mostViewedSeriesMap = new Map()

  historyArray.forEach((item: any) => {
    // Aggressive series detection
    const isSeries = item.Type === 'Episode' || item.Type === 'Series' || !!item.SeriesName || !!item.SeriesId;
    const targetMap = isSeries ? mostViewedSeriesMap : mostViewedMoviesMap
    
    const type = isSeries ? 'Episode' : (item.Type || 'Movie');
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    const sanitizedDuration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration);

    // Robust Series Name & Key extraction
    let seriesName = item.SeriesName;
    let seriesId = item.SeriesId;
    let displayName = item.Name || item.NowPlayingItemName;

    // Fallback for series name if missing
    if (isSeries && !seriesName) {
      // 1. Try extraction from "Series : Episode" format
      if (displayName?.includes(' : ')) {
        const parts = displayName.split(' : ');
        seriesName = parts[0];
      } 
      // 2. Try lookup from our seriesInfoMap using imageItemId
      else if (item.imageItemId && seriesInfoMap.has(String(item.imageItemId))) {
        const info = seriesInfoMap.get(String(item.imageItemId))!;
        seriesName = info.name;
        seriesId = seriesId || info.id;
      }
    }

    // Aggregation Key: prefer SeriesId, then SeriesName, then fallback
    const key = isSeries 
      ? (seriesId || seriesName || itemId) 
      : (itemId || item.Id);
    
    const imageItemId = isSeries ? (seriesId || item.imageItemId || itemId) : itemId
    
    if (!key) return

    if (!targetMap.has(key)) {
       // For series display name: prefer SeriesName, then extracted name, then item name
       let finalDisplayName = displayName;
       if (isSeries) {
         finalDisplayName = seriesName || displayName;
       }

       targetMap.set(key, {
         ...item,
         Name: finalDisplayName,
         count: 1,
         totalDuration: sanitizedDuration,
         lastView: new Date(item.ActivityDateInserted || item.DateCreated),
         imageItemId: imageItemId,
         tmdbId: item.TmdbId,
         mediaType: isSeries ? 'tv' : 'movie'
       })
     } else {
       const existing = targetMap.get(key)
       existing.count += 1
       existing.totalDuration += sanitizedDuration
       // Update tmdbId if missing
       if (!existing.tmdbId && item.TmdbId) {
         existing.tmdbId = item.TmdbId
       }
       // Update imageItemId if it was a fallback and we found a better one
       if (isSeries && existing.imageItemId === existing.ItemId && item.SeriesId) {
         existing.imageItemId = item.SeriesId;
       }
       const currentDate = new Date(item.ActivityDateInserted || item.DateCreated)
       if (currentDate > existing.lastView) {
         existing.lastView = currentDate
       }
     }
   })
 
   const mostViewedMovies = Array.from(mostViewedMoviesMap.values())
     .sort((a, b) => b.count - a.count)
     .slice(0, 10)

   const mostViewedSeries = Array.from(mostViewedSeriesMap.values())
     .sort((a, b) => b.count - a.count)
     .slice(0, 10)

  // Process Hourly Activity
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}h`,
    value: 0
  }))

  const hasRealData = historyArray.length > 0

  if (historyArray.length > 0) {
    historyArray.forEach((item: any) => {
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
    historyArray.forEach((item: any) => {
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
    historyArray.forEach((item: any) => {
      const dateString = item.ActivityDateInserted || item.DateCreated || (item as any).DateInserted
      if (!dateString) return
      const date = new Date(dateString)
      const monthIdx = date.getMonth()
      if (activity[monthIdx]) activity[monthIdx].value++
    })
    monthlyActivity = activity
  }

  // Add imageItemId to aggregatedHistory items too
  // Prepend current active sessions as "Live" items
  const liveItems = embySessions.map((s: any) => ({
    id: `live-${s.sessionId}`,
    sessionId: s.sessionId,
    instanceId: s.instanceId,
    itemId: s.itemId,
    itemName: s.itemName,
    itemType: s.itemType,
    userName: s.userName,
    client: s.client,
    device: s.device,
    startTime: new Date(),
    endTime: new Date(),
    PlaybackDuration: s.accumulatedDuration || 0,
    totalDuration: s.runTimeTicks,
    isLive: true,
    source: s.source,
    mediaInfo: s.mediaInfo,
    imageItemId: s.itemType === 'Episode' ? (s.mediaInfo?.seriesId || s.itemId) : s.itemId,
    mediaType: s.itemType === 'Episode' ? 'tv' : 'movie',
    ActivityDateInserted: new Date().toISOString(),
    accumulatedDuration: s.accumulatedDuration || 0
  }))

  const aggregatedHistory: any[] = [...liveItems]
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

    const isSeries = item.Type === 'Episode' || !!item.SeriesName
    const imageItemId = isSeries ? (item.SeriesId || itemId) : itemId

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
      PlaybackDuration: sanitizedDuration,
      imageItemId: imageItemId,
      tmdbId: item.TmdbId,
      mediaType: item.Type === 'Episode' ? 'tv' : 'movie'
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



  // 4. Calculate Stats from Filtered Data
  const userStatsMap = new Map<string, { name: string, duration: number, plays: number }>()
  
  const totalWatchTimeSeconds = historyArray.reduce((acc: number, item: any) => {
    const type = (item.Type === 'Episode' || !!item.SeriesName) ? 'Episode' : (item.Type || 'Movie');
    const itemId = item.NowPlayingItemId || item.ItemId;
    const actualDuration = itemDurations[itemId];
    const duration = sanitizePlaybackDuration(item.PlaybackDuration || 0, type, actualDuration);
    
    // User aggregation
    const rawUserKey = item.UserId || item.UserName;
    
    // Check if user is part of a group
    // We need instanceId for the key. item.instanceId should be available
    const groupKey = `${item.instanceId}:${rawUserKey}`;
    const group = userGroupMap.get(groupKey);
    
    const userKey = group ? `group-${group.id}` : rawUserKey;
    const userName = group ? group.name : (item.UserName || 'Inconnu');

    if (userKey) {
      const existing = userStatsMap.get(userKey) || { name: userName, duration: 0, plays: 0 };
      // If we merge into a group, ensure the name is the group name
      if (group) existing.name = group.name;
      
      existing.duration += duration;
      existing.plays += 1;
      userStatsMap.set(userKey, existing);
    }

    return acc + duration;
  }, 0)

  const topUsers = Array.from(userStatsMap.values())
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 3);

  const allUsersPeriod = Array.from(userStatsMap.values())
    .sort((a, b) => b.duration - a.duration);

  const totalHours = Math.round(totalWatchTimeSeconds / 3600)
  
  // Total plays from history
  const totalPlays = historyArray.length
  
  const subValueLabel = period === 'week' ? '7 jours' : period === 'year' ? 'Année' : period === 'all' ? 'Historique' : 'Mois'

  // Header content to be reused even in empty state
  const statsHeader = (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Vos Statistiques</h1>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-sm font-medium px-2 py-0.5 bg-gray-800 rounded text-blue-400 border border-gray-700">
            {periodTitle}
          </span>
          {hasRealData && (
            <>
              <span className="text-gray-600">•</span>
              <span className="text-sm">{totalHours}h de visionnage</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <SourceFilter />
          <div className="flex items-center gap-2">
            <SyncPluginButton />
            {period !== 'all' && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (!hasRealData) {
    // Check if there's any data at all to help the user navigate
    const oldestLog = await (prisma as any).embyActivityLog.findFirst({
      where: {
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        instanceId: targetInstanceIds ? { in: targetInstanceIds } : undefined,
      },
      orderBy: { startTime: 'asc' },
      select: { startTime: true }
    });

    const oldestYear = oldestLog ? new Date(oldestLog.startTime).getFullYear() : null;
    const currentYear = period === 'year' ? (params.year ? parseInt(params.year) : now.getFullYear()) : null;

    return (
      <div className="max-w-7xl mx-auto w-full space-y-8 p-6 pb-20">
        {statsHeader}
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-10 max-w-2xl w-full space-y-6">
            <div className="bg-blue-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Aucune donnée de visionnage</h2>
              <p className="text-gray-400 text-sm">
                Aucune activité n'a encore été enregistrée pour {periodTitle.toLowerCase()}.
              </p>
              
              {oldestYear && currentYear && oldestYear < currentYear && (
                <div className="mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-300 text-sm">
                  <p>Des données plus anciennes sont disponibles à partir de <strong>{oldestYear}</strong>.</p>
                  <a 
                    href={`?period=year&year=${oldestYear}&source=${sourceFilter}`}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Aller en {oldestYear}
                    <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              )}

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
                <li>Essayez une autre période ou une autre source</li>
                <li>Lancez une lecture pour générer des données</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 p-6 pb-20">
      {statsHeader}
      
      {/* Period Selectors */}
      <div className="flex justify-end">
        <div className="flex items-center gap-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700 w-fit">
          <PeriodButton active={period === 'week'} href="?period=week" label="Semaine" />
          <PeriodButton active={period === 'month'} href="?period=month" label="Mois" />
          <PeriodButton active={period === 'year'} href="?period=year" label="Année" />
          <PeriodButton active={period === 'all'} href="?period=all" label="Tout" />
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
        <UserStatsCard 
            topUsers={topUsers} 
            allUsers={allUsersPeriod}
            periodLabel={period === 'week' ? 'cette semaine' : period === 'year' ? 'cette année' : period === 'all' ? 'tout l\'historique' : 'ce mois'}
          />
      </div>

      {/* Live Sessions */}
      <LiveSessions 
        sessions={embySessions} 
        instanceId={userInstanceId} 
        filteredInstanceIds={targetInstanceIds}
      />

      {/* Charts */}
      <StatsCharts 
        hourlyActivity={hourlyActivity} 
        dailyActivity={orderedDailyActivity}
        monthlyActivity={monthlyActivity}
      />

      {/* Top Content */}
      <div className="mb-8">
        <TopItemsTabs 
          movies={mostViewedMovies} 
          series={mostViewedSeries} 
          instanceId={userInstanceId} 
        />
      </div>

      {/* Recent History */}
      <div>
        <RecentHistory 
          initialHistory={aggregatedHistory} 
          instanceId={userInstanceId} 
          filteredInstanceIds={targetInstanceIds}
          instanceTypes={instanceTypes}
        />
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


