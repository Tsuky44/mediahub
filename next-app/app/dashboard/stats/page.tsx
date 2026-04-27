import { getServerSession } from 'next-auth'
import { Clock, Play, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'

import { StatsCharts } from './_components/StatsCharts'
import { LiveSessions } from './_components/LiveSessions'
import { RecentHistory } from './_components/RecentHistory'
import { UserStatsCard } from './_components/UserStatsCard'
import { StorageManager } from './_components/StorageManager'
import { TopItemsTabs } from './_components/TopItemsTabs'
import { StatCard } from './_components/StatCard'
import { StatsPeriodNav } from './_components/StatsPeriodNav'
import { StatsHeader } from './_components/StatsHeader'
import { StatsEmptyState } from './_components/StatsEmptyState'
import { StatsRestrictedAccess } from './_components/StatsRestrictedAccess'

import { computeStatsPeriod, type StatsPeriodParams } from './_utils/stats-period'
import {
    normalizeWatchEvents,
    computeItemDurations,
    backfillSeriesInfo,
    aggregateMostViewed,
    computeActivityHistograms,
    consolidateHistory,
    computeUserStats,
} from './_utils/stats-aggregation'
import {
    fetchUserGroupMap,
    fetchProviderIdToLocalUserMap,
    fetchWatchHistory,
    fetchOldestWatchEventYear,
} from './_services/stats-data'

export const dynamic = 'force-dynamic'

interface StatsPageProps {
    searchParams: Promise<StatsPeriodParams>
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
        return (
            <StatsRestrictedAccess
                message="Veuillez vous connecter pour voir les statistiques."
                linkHref="/api/auth/signin"
                linkLabel="Se connecter"
            />
        )
    }

    const user = session?.user
    const ability = defineAbilityFor(user)

    const hasGlobalView = ability.can('read_all', 'Stats')
    const hasSelfView = ability.can('read', 'Stats')
    const canImport = ability.can('import', 'Stats')
    const canManageStorage = ability.can('manage_storage', 'Stats')
    const canDeleteMedia = ability.can('delete_media', 'Stats')
    const canManage = user.role === 'admin'

    if (!hasGlobalView && !hasSelfView) {
        return (
            <StatsRestrictedAccess
                message="Vous n'avez pas la permission de voir les statistiques."
                linkHref="/dashboard"
                linkLabel="Retour au tableau de bord"
            />
        )
    }

    const params = await searchParams
    const sourceFilter = params.source || 'all'
    const now = new Date()

    const { period, startDate, endDate, periodTitle, prevHref, nextHref, subValueLabel } = computeStatsPeriod(
        params,
        sourceFilter,
        now
    )

    // 1. Fetch server-side data
    const [userGroupMap, providerIdToLocalUserMap, historyRaw] = await Promise.all([
        fetchUserGroupMap(),
        fetchProviderIdToLocalUserMap(),
        fetchWatchHistory(startDate, endDate, user, hasGlobalView, hasSelfView),
    ])

    // 2. Process history
    const historyArray = normalizeWatchEvents(historyRaw)
    const itemDurations = computeItemDurations(historyArray)
    backfillSeriesInfo(historyArray)

    // 3. Aggregations
    const { mostViewedMovies, mostViewedSeries } = aggregateMostViewed(historyArray, itemDurations)
    const { hourlyActivity, orderedDailyActivity, monthlyActivity } = computeActivityHistograms(historyArray, period)

    // No live sessions support yet in this version
    const embySessions: any[] = []
    const aggregatedHistory = consolidateHistory(historyArray, [], itemDurations)

    const { userStatsMap, totalWatchTimeSeconds } = computeUserStats(
        historyArray,
        itemDurations,
        providerIdToLocalUserMap,
        userGroupMap
    )

    const topUsers = Array.from(userStatsMap.values()).sort((a, b) => b.duration - a.duration).slice(0, 3)
    const allUsersPeriod = Array.from(userStatsMap.values()).sort((a, b) => b.duration - a.duration)

    const totalHours = Math.round(totalWatchTimeSeconds / 3600)
    const totalPlays = historyArray.length
    const hasRealData = historyArray.length > 0

    const header = (
        <StatsHeader
            periodTitle={periodTitle}
            period={period}
            totalHours={totalHours}
            hasRealData={hasRealData}
            sourceFilter={sourceFilter}
            canImport={canImport}
            prevHref={prevHref}
            nextHref={nextHref}
        />
    )

    if (!hasRealData) {
        const oldestYear = await fetchOldestWatchEventYear()
        const currentYear = period === 'year' ? (params.year ? parseInt(params.year) : now.getFullYear()) : null

        return (
            <div className="max-w-7xl mx-auto w-full space-y-8 p-6 pb-20">
                {header}
                <StatsEmptyState
                    periodTitle={periodTitle}
                    oldestYear={oldestYear}
                    currentYear={currentYear}
                    sourceFilter={sourceFilter}
                />
            </div>
        )
    }

    const lastActivityLabel = historyArray.length > 0
        ? formatDistanceToNow(
              new Date(historyArray[0].ActivityDateInserted || historyArray[0].DateCreated || ''),
              { addSuffix: true, locale: fr }
          )
        : 'Aucune'

    const topUsersPeriodLabel = period === 'week'
        ? 'cette semaine'
        : period === 'year'
            ? 'cette année'
            : period === 'all'
                ? "tout l'historique"
                : 'ce mois'

    return (
        <div className="max-w-7xl mx-auto w-full space-y-8 p-6 pb-20">
            {header}

            <StatsPeriodNav period={period} />

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
                    value={lastActivityLabel}
                    subValue="Dernière session"
                    icon={<Activity className="h-5 w-5 text-purple-500" />}
                />
                <UserStatsCard topUsers={topUsers} allUsers={allUsersPeriod} periodLabel={topUsersPeriodLabel} />
            </div>

            <LiveSessions sessions={embySessions} canManage={canManage} />

            <StatsCharts
                hourlyActivity={hourlyActivity}
                dailyActivity={orderedDailyActivity}
                monthlyActivity={monthlyActivity}
            />

            <div className="mb-8">
                <TopItemsTabs movies={mostViewedMovies} series={mostViewedSeries} />
            </div>

            <div>
                <RecentHistory initialHistory={aggregatedHistory} />
            </div>

            {canManageStorage && (
                <div className="mt-12 border-t border-white/10 pt-8">
                    <StorageManager canDelete={canDeleteMedia} />
                </div>
            )}
        </div>
    )
}
