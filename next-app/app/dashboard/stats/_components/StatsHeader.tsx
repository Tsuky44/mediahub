import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { SourceFilter } from './SourceFilter'
import { SyncPluginButton } from './SyncPluginButton'
import type { StatsPeriod } from '../_utils/stats-period'

interface StatsHeaderProps {
    periodTitle: string
    period: StatsPeriod
    totalHours: number
    hasRealData: boolean
    sourceFilter: string
    canImport: boolean
    prevHref: string
    nextHref: string
}

/** Header de la page stats : titre, filtre source, sync, navigation de periode. */
export function StatsHeader({
    periodTitle,
    period,
    totalHours,
    hasRealData,
    sourceFilter,
    canImport,
    prevHref,
    nextHref,
}: StatsHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-black text-white tracking-tight">Vos Statistiques</h1>
                <div className="flex items-center gap-2 text-gray-400">
                    <span className="text-sm font-bold px-4 py-1.5 bg-white/5 rounded-xl text-indigo-300 border border-white/10 backdrop-blur-md shadow-sm">
                        {periodTitle}
                    </span>
                    {hasRealData && (
                        <>
                            <span className="text-gray-600">•</span>
                            <span className="text-sm font-medium">{totalHours}h de visionnage</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                    <SourceFilter />
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                        <SyncPluginButton source={sourceFilter} canManage={canImport} />
                        {period !== 'all' && (
                            <div className="flex items-center gap-2">
                                <a
                                    href="/dashboard/stats"
                                    className="px-4 py-2 bg-black/20 hover:bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap backdrop-blur-md shadow-lg"
                                >
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Aujourd&apos;hui</span>
                                </a>

                                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 backdrop-blur-md shadow-lg">
                                    <a
                                        href={prevHref}
                                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </a>
                                    <div className="h-4 w-px bg-white/10 mx-1" />
                                    <a
                                        href={nextHref}
                                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                    >
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
}
