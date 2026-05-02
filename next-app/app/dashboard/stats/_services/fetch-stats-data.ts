import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import { computeStatsPeriod, type StatsPeriodParams } from '../_utils/stats-period'
import {
  normalizeWatchEvents,
  computeItemDurations,
  backfillSeriesInfo,
  aggregateMostViewed,
  computeActivityHistograms,
  consolidateHistory,
  computeUserStats,
} from '../_utils/stats-aggregation'
import {
  fetchUserGroupMap,
  fetchProviderIdToLocalUserMap,
  fetchWatchHistory,
  fetchOldestWatchEventYear,
} from './stats-data'

export interface StatsDataResult {
  hasGlobalView: boolean
  hasSelfView: boolean
  canImport: boolean
  canManageStorage: boolean
  canDeleteMedia: boolean
  canManage: boolean
  period: string
  startDate: Date
  endDate: Date
  periodTitle: string
  prevHref: string | null
  nextHref: string | null
  subValueLabel: string
  mostViewedMovies: unknown[]
  mostViewedSeries: unknown[]
  hourlyActivity: any[] | undefined
  orderedDailyActivity: any[] | undefined
  monthlyActivity: any[] | undefined
  embySessions: unknown[]
  topUsers: unknown[]
  allUsersPeriod: unknown[]
  totalHours: number
  totalPlays: number
  hasRealData: boolean
  lastActivityLabel: string
  topUsersPeriodLabel: string
  oldestYear: number | null
  currentYear: number | null
  sourceFilter: string
  aggregatedHistory: unknown[]
}

export async function fetchStatsData(
  searchParams: StatsPeriodParams
): Promise<StatsDataResult | { restricted: true; message: string; linkHref: string; linkLabel: string }> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return { restricted: true, message: 'Veuillez vous connecter pour voir les statistiques.', linkHref: '/api/auth/signin', linkLabel: 'Se connecter' }
  }

  const user = session.user
  const ability = defineAbilityFor(user)

  const hasGlobalView = ability.can('read_all', 'Stats')
  const hasSelfView = ability.can('read', 'Stats')
  const canImport = ability.can('import', 'Stats')
  const canManageStorage = ability.can('manage_storage', 'Stats')
  const canDeleteMedia = ability.can('delete_media', 'Stats')
  const canManage = user.role === 'admin'

  if (!hasGlobalView && !hasSelfView) {
    return { restricted: true, message: "Vous n'avez pas la permission de voir les statistiques.", linkHref: '/dashboard', linkLabel: 'Retour au tableau de bord' }
  }

  const params = searchParams
  const sourceFilter = params.source || 'all'
  const now = new Date()

  const { period, startDate, endDate, periodTitle, prevHref, nextHref, subValueLabel } = computeStatsPeriod(
    params,
    sourceFilter,
    now
  )

  const [userGroupMap, providerIdToLocalUserMap, historyRaw] = await Promise.all([
    fetchUserGroupMap(),
    fetchProviderIdToLocalUserMap(),
    fetchWatchHistory(startDate, endDate, user, hasGlobalView, hasSelfView),
  ])

  const historyArray = normalizeWatchEvents(historyRaw)
  const itemDurations = computeItemDurations(historyArray)
  backfillSeriesInfo(historyArray)

  const { mostViewedMovies, mostViewedSeries } = aggregateMostViewed(historyArray, itemDurations)
  const { hourlyActivity, orderedDailyActivity, monthlyActivity } = computeActivityHistograms(historyArray, period)

  const embySessions: unknown[] = []
  const aggregatedHistory = consolidateHistory(historyArray, [], itemDurations)

  const { userStatsMap, totalWatchTimeSeconds } = computeUserStats(
    historyArray,
    itemDurations,
    providerIdToLocalUserMap,
    userGroupMap
  )

  const topUsers = Array.from(userStatsMap.values()).sort((a: any, b: any) => b.duration - a.duration).slice(0, 3)
  const allUsersPeriod = Array.from(userStatsMap.values()).sort((a: any, b: any) => b.duration - a.duration)

  const totalHours = Math.round(totalWatchTimeSeconds / 3600)
  const totalPlays = historyArray.length
  const hasRealData = historyArray.length > 0

  let lastActivityLabel = 'Aucune'
  if (historyArray.length > 0) {
    const lastDate = new Date(historyArray[0].ActivityDateInserted || historyArray[0].DateCreated || '')
    if (!isNaN(lastDate.getTime())) {
      lastActivityLabel = lastDate.toISOString()
    }
  }

  const topUsersPeriodLabel =
    period === 'week' ? 'cette semaine' : period === 'year' ? 'cette année' : period === 'all' ? "tout l'historique" : 'ce mois'

  const oldestYear = !hasRealData ? await fetchOldestWatchEventYear() : null
  const currentYear = !hasRealData && period === 'year' ? (params.year ? parseInt(params.year) : now.getFullYear()) : null

  return {
    hasGlobalView,
    hasSelfView,
    canImport,
    canManageStorage,
    canDeleteMedia,
    canManage,
    period,
    startDate,
    endDate,
    periodTitle,
    prevHref,
    nextHref,
    subValueLabel,
    mostViewedMovies,
    mostViewedSeries,
    hourlyActivity,
    orderedDailyActivity,
    monthlyActivity,
    embySessions,
    topUsers,
    allUsersPeriod,
    totalHours,
    totalPlays,
    hasRealData,
    lastActivityLabel,
    topUsersPeriodLabel,
    oldestYear,
    currentYear,
    sourceFilter,
    aggregatedHistory,
  }
}
