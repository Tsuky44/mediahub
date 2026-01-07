import React from 'react'
import { JellystatService, WatchHistoryItem } from '@/lib/services/jellystat'
import { EmbyService } from '@/lib/services/emby'
import { getSetting } from '@/lib/settings'
import { StatsCharts } from '../StatsCharts'
import { ChevronLeft, ChevronRight, Clock, Film, Play, User, Activity, TrendingUp, Calendar } from 'lucide-react'
import { formatDistanceToNow, startOfMonth, endOfMonth, differenceInDays, startOfYear, endOfYear, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getEmbyImageUrl(itemId: string, jellystat?: JellystatService | null) {
  try {
    if (jellystat) {
      const url = await jellystat.getItemImageUrl(itemId)
      if (url) return url
    }
    const emby = new EmbyService()
    return await emby.getItemImageUrl(itemId)
  } catch (e) {
    return null
  }
}

async function EmbyImage({ itemId, alt, jellystat }: { itemId: string, alt: string, jellystat: JellystatService | null }) {
  const url = await getEmbyImageUrl(itemId, jellystat)
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
}

async function TopItemCard({ item, rank, jellystat }: TopItemCardProps) {
  const isEpisode = item.Type === 'Episode' || item.SeriesName || (item.ItemType === 'Episode')
  const name = (isEpisode ? (item.SeriesName || item.Name || item.ItemName) : (item.Name || item.ItemName || item.NowPlayingItemName)) || 'Inconnu'
  const itemId = item.NowPlayingItemId || item.ItemId || item.Id || item.id
  
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-900/50 border border-gray-700/50 hover:border-indigo-500/50 transition-all group">
      <div className="relative flex-shrink-0">
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10 shadow-lg border border-indigo-400">
          {rank}
        </div>
        <div className="w-12 h-18 rounded overflow-hidden bg-gray-800 border border-gray-700">
          {itemId ? (
            <EmbyImage itemId={itemId} alt={name} jellystat={jellystat} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-6 h-6 text-gray-600" />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
          {name}
        </h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-medium">
            {isEpisode ? 'Série' : 'Film'}
          </span>
          <span className="text-[10px] text-gray-500">•</span>
          <span className="text-[10px] text-indigo-400 font-semibold">{item.ViewCount || item.count} vues</span>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gray-800 p-6 shadow-sm border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-900 rounded-xl border border-gray-700">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
        <p className="text-xs text-gray-500 font-medium">{subValue}</p>
      </div>
    </div>
  )
}

function PeriodButton({ active, href, label }: { active: boolean, href: string, label: string }) {
  return (
    <a 
      href={href}
      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
          : 'text-gray-400 hover:text-white hover:bg-gray-700'
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

  const jellystatUrl = await getSetting('jellystat_url')
  const jellystatApiKey = await getSetting('jellystat_api_key')
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

  // Process Most Viewed for the user
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

  const totalWatchTimeSeconds = historyArray.reduce((acc: number, item: any) => acc + (item.PlaybackDuration || 0), 0)
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
    if (historyMap.has(key)) {
      const existing = historyMap.get(key)
      const existingDate = new Date(existing.ActivityDateInserted || existing.DateCreated)
      const diffDays = Math.abs(date.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays <= 7) {
        existing.PlaybackDuration = (existing.PlaybackDuration || 0) + (item.PlaybackDuration || 0)
        if (date > existingDate) {
          existing.ActivityDateInserted = item.ActivityDateInserted
          existing.DateCreated = item.DateCreated
        }
        return
      }
    }
    const newItem = { ...item }
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
            <span className="text-sm font-medium px-2 py-0.5 bg-gray-800 rounded text-indigo-400 border border-gray-700">
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
        <StatCard title="Mon temps de visionnage" value={`${totalHours}h`} subValue={`Total ${subValueLabel}`} icon={<Clock className="h-5 w-5 text-indigo-500" />} />
        <StatCard title="Mes contenus vus" value={totalPlays.toString()} subValue={`Films & Épisodes (${subValueLabel})`} icon={<Play className="h-5 w-5 text-green-500" />} />
        <StatCard title="Mon activité récente" value={historyArray.length > 0 ? formatDistanceToNow(new Date(historyArray[0].ActivityDateInserted || historyArray[0].DateCreated), { addSuffix: true, locale: fr }) : 'Aucune'} subValue="Dernière session" icon={<Activity className="h-5 w-5 text-purple-500" />} />
        <StatCard title="Ma moyenne journalière" value={Math.round(totalHours / (days || 1)).toString() + 'h'} subValue="Heures / jour" icon={<TrendingUp className="h-5 w-5 text-orange-500" />} />
      </div>

      <StatsCharts hourlyActivity={hourlyActivity} dailyActivity={orderedDailyActivity} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2"><TrendingUp className="h-5 w-5 text-yellow-500" /> Mes favoris</h2>
          <div className="space-y-3">
            {mostViewed.map((item: any, idx: number) => <TopItemCard key={item.Id || idx} item={item} rank={idx + 1} jellystat={jellystat} />)}
            {mostViewed.length === 0 && <p className="text-gray-500 italic py-10 text-center">Aucune donnée disponible</p>}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2"><Clock className="h-5 w-5 text-blue-500" /> Mon historique</h2>
          <div className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Contenu</th>
                  <th className="px-6 py-4 font-medium">Appareil</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {aggregatedHistory.slice(0, 50).map((item: any) => (
                  <tr key={item.Id} className="hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">{item.SeriesName || item.NowPlayingItemName || item.Name}</span>
                        <span className="text-[10px] text-gray-500">{item.Type === 'Episode' ? `S${item.ParentIndexNumber} • E${item.IndexNumber}` : 'Film'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-300">{item.DeviceName || 'Inconnu'}</span>
                        <span className="text-[10px] text-gray-500">{item.Client || 'Client web'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.ActivityDateInserted || item.DateCreated))}
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-mono text-indigo-400">
                      {Math.floor((item.PlaybackDuration || 0) / 60)} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
