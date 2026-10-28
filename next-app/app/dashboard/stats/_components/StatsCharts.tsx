'use client'

import dynamic from 'next/dynamic'
import { Activity, CalendarDays } from 'lucide-react'

// recharts (~110 Ko gzip) chargé en différé : le reste de la page s'affiche sans l'attendre.
// Le placeholder garde la même hauteur que le graphique (pas de saut de mise en page).
const ActivityChart = dynamic(
  () => import('./stats-charts/ActivityChart').then(mod => mod.ActivityChart),
  { ssr: false, loading: () => <div className="h-[300px] w-full animate-pulse rounded-2xl bg-white/[0.03]" /> }
)

export interface ActivityData {
  name: string
  value: number
  [key: string]: any
}

interface StatsChartsProps {
  hourlyActivity: ActivityData[]
  dailyActivity: ActivityData[]
  monthlyActivity?: ActivityData[]
}

export function StatsCharts({ hourlyActivity, dailyActivity, monthlyActivity }: StatsChartsProps) {
  return (
    <div className="onyx-reveal space-y-6">
      <div className="onyx-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl bg-black/20 p-6 shadow-xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">Activité par heure</h3>
          </div>
          <ActivityChart data={hourlyActivity} title="Activité par heure" color="#f2f0ed" />
        </div>

        <div className="rounded-3xl bg-black/20 p-6 shadow-xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <CalendarDays className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">Activité par jour</h3>
          </div>
          <ActivityChart data={dailyActivity} title="Activité par jour" color="#8faf86" />
        </div>

        {monthlyActivity && (
          <div className="rounded-3xl bg-black/20 p-6 shadow-xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-violet-500/20 hover:shadow-2xl hover:shadow-violet-500/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-violet-500/10 rounded-xl">
                <Activity className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide">Activité par mois</h3>
            </div>
            <ActivityChart data={monthlyActivity} title="Activité par mois" color="#b8b5b2" fontSize={10} />
          </div>
        )}
      </div>
    </div>
  )
}
