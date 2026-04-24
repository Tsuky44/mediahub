import React from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { Clock, Play, Activity, TrendingUp, User } from 'lucide-react'

import { authOptions } from '@/lib/auth'
import { StatsCharts } from '../_components/StatsCharts'
import { TopItemsTabs } from '../_components/TopItemsTabs'
import { computeItemDurations } from '../_utils/stats-aggregation'

import { computeMePeriod, type MePeriodParams } from './_utils/me-period'
import {
    normalizeMeWatchEvents,
    aggregateMyMostViewed,
    computeMyTotals,
    computeMyActivityHistograms,
    buildRecentHistory,
} from './_utils/me-aggregation'
import { fetchMyWatchHistory } from './_services/me-data'

import { MeStatCard } from './_components/MeStatCard'
import { MePeriodTabs, MePeriodNavigator } from './_components/MePeriodNav'
import { MeRecentHistoryList } from './_components/MeRecentHistoryList'

export const dynamic = 'force-dynamic'

interface UserStatsPageProps {
    searchParams: Promise<MePeriodParams>
}

export default async function UserStatsPage({ searchParams }: UserStatsPageProps) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        redirect('/api/auth/signin')
    }

    const user = session.user as any
    const externalIds = [user.embyUserId, user.plexUserId, user.jellyfinUserId].filter(Boolean) as string[]
    const internalUserId = parseInt(session.user.id as string)

    if (isNaN(internalUserId) && externalIds.length === 0 && !session.user.name) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <h2 className="text-2xl font-bold text-white">Impossible de charger les statistiques</h2>
                <p className="text-gray-400">Votre utilisateur n&apos;est pas correctement identifié.</p>
            </div>
        )
    }

    const params = await searchParams
    const { period, startDate, endDate, days, periodTitle, prevHref, nextHref } = computeMePeriod(params)

    const historyRaw = await fetchMyWatchHistory(
        { id: internalUserId, name: session.user.name, externalIds },
        startDate,
        endDate
    )

    // Process history
    const historyArray = normalizeMeWatchEvents(historyRaw)
    const itemDurations = computeItemDurations(historyArray as any)

    // Aggregations
    const { mostViewedMovies, mostViewedSeries } = aggregateMyMostViewed(historyArray, itemDurations)
    const { totalDuration, totalPlays, moviePlays, episodePlays } = computeMyTotals(historyArray, itemDurations)
    const { hourlyActivity, dailyActivity } = computeMyActivityHistograms(historyArray)
    const recentHistory = buildRecentHistory(historyArray)

    // Derived values
    const hours = Math.floor(totalDuration / 3600)
    const minutes = Math.floor((totalDuration % 3600) / 60)
    const dailyAverageSeconds = totalDuration / Math.max(days, 1)
    const dailyHours = Math.floor(dailyAverageSeconds / 3600)
    const dailyMinutes = Math.floor((dailyAverageSeconds % 3600) / 60)

    return (
        <div className="space-y-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-500" />
                        Mes Statistiques
                    </h1>
                    <p className="text-gray-400 mt-1">Analyse de votre consommation média personnelle</p>
                </div>
                <MePeriodTabs period={period} />
            </div>

            <MePeriodNavigator prevHref={prevHref} nextHref={nextHref} periodTitle={periodTitle} />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MeStatCard
                    title="Temps de visionnage"
                    value={`${hours}h ${minutes}m`}
                    subValue={`${dailyHours}h ${dailyMinutes}m / jour en moyenne`}
                    icon={<Clock className="text-blue-500" />}
                />
                <MeStatCard
                    title="Total Lectures"
                    value={totalPlays.toString()}
                    subValue={`${moviePlays} films, ${episodePlays} épisodes`}
                    icon={<Play className="text-green-500" />}
                />
                <MeStatCard
                    title="Films les plus vus"
                    value={mostViewedMovies[0]?.Name || '-'}
                    subValue={`${mostViewedMovies[0]?.count || 0} visionnages`}
                    icon={<TrendingUp className="text-purple-500" />}
                />
                <MeStatCard
                    title="Série favorite"
                    value={mostViewedSeries[0]?.Name || '-'}
                    subValue={`${Math.round((mostViewedSeries[0]?.totalDuration || 0) / 3600)}h regardées`}
                    icon={<User className="text-orange-500" />}
                />
            </div>

            <StatsCharts hourlyActivity={hourlyActivity} dailyActivity={dailyActivity} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-yellow-500" />
                        Top Contenus
                    </h2>
                    <TopItemsTabs movies={mostViewedMovies} series={mostViewedSeries} />
                </div>

                <MeRecentHistoryList items={recentHistory} />
            </div>
        </div>
    )
}
