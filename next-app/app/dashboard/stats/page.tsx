import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, Play, Activity } from 'lucide-react'

import { StatsCharts } from './_components/StatsCharts'
import { LiveSessions } from './_components/LiveSessions'
import { RecentHistory } from './_components/RecentHistory'
import { UserStatsCard } from './_components/UserStatsCard'
import { TopItemsTabs } from './_components/TopItemsTabs'
import { StatCard } from './_components/StatCard'
import { StatsPeriodNav } from './_components/StatsPeriodNav'
import { StatsHeader } from './_components/StatsHeader'
import { StatsEmptyState } from './_components/StatsEmptyState'
import { StatsRestrictedAccess } from './_components/StatsRestrictedAccess'

import { fetchStatsData } from './_services/fetch-stats-data'
import { type StatsPeriodParams } from './_utils/stats-period'

export const dynamic = 'force-dynamic'

interface StatsPageProps {
  searchParams: Promise<StatsPeriodParams>
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const data = await fetchStatsData(await searchParams)

  if ('restricted' in data) {
    return <StatsRestrictedAccess message={data.message} linkHref={data.linkHref} linkLabel={data.linkLabel} />
  }

  const header = (
    <StatsHeader
      periodTitle={data.periodTitle}
      period={data.period}
      totalHours={data.totalHours}
      hasRealData={data.hasRealData}
      sourceFilter={data.sourceFilter}
      canImport={data.canImport}
      prevHref={data.prevHref}
      nextHref={data.nextHref}
    />
  )

  if (!data.hasRealData) {
    return (
      <div className="max-w-7xl mx-auto w-full space-y-8 p-6 pb-20">
        {header}
        <StatsEmptyState
          periodTitle={data.periodTitle}
          oldestYear={data.oldestYear}
          currentYear={data.currentYear}
          sourceFilter={data.sourceFilter}
        />
      </div>
    )
  }

  const lastActivityLabel =
    data.lastActivityLabel !== 'Aucune'
      ? formatDistanceToNow(new Date(data.lastActivityLabel), { addSuffix: true, locale: fr })
      : 'Aucune'

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 p-6 pb-20">
      {header}

      <StatsPeriodNav period={data.period} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Temps de visionnage"
          value={`${data.totalHours}h`}
          subValue={`Total ${data.subValueLabel}`}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Contenus vus"
          value={data.totalPlays.toString()}
          subValue={`Films & Épisodes (${data.subValueLabel})`}
          icon={<Play className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Activité récente"
          value={lastActivityLabel}
          subValue="Dernière session"
          icon={<Activity className="h-5 w-5 text-purple-500" />}
        />
        <UserStatsCard topUsers={data.topUsers} allUsers={data.allUsersPeriod} periodLabel={data.topUsersPeriodLabel} />
      </div>

      <LiveSessions sessions={data.embySessions} canManage={data.canManage} />

      <StatsCharts
        hourlyActivity={data.hourlyActivity || []}
        dailyActivity={data.orderedDailyActivity || []}
        monthlyActivity={data.monthlyActivity}
      />

      <div className="mb-8">
        <TopItemsTabs movies={data.mostViewedMovies} series={data.mostViewedSeries} />
      </div>

      <div>
        <RecentHistory initialHistory={data.aggregatedHistory} />
      </div>

    </div>
  )
}
