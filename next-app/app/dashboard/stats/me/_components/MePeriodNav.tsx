import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { MePeriod } from '../_utils/me-period'

interface PeriodButtonProps {
    active: boolean
    href: string
    label: string
}

function PeriodButton({ active, href, label }: PeriodButtonProps) {
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

interface MePeriodTabsProps {
    period: MePeriod
}

/** Tabs Semaine/Mois/Annee pour la page "mes statistiques". */
export function MePeriodTabs({ period }: MePeriodTabsProps) {
    return (
        <div className="flex bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
            <PeriodButton active={period === 'week'} href="?period=week" label="Semaine" />
            <PeriodButton active={period === 'month'} href="?period=month" label="Mois" />
            <PeriodButton active={period === 'year'} href="?period=year" label="Année" />
        </div>
    )
}

interface MePeriodNavigatorProps {
    prevHref: string
    nextHref: string
    periodTitle: string
}

/** Navigation prev/current/next entre periodes. */
export function MePeriodNavigator({ prevHref, nextHref, periodTitle }: MePeriodNavigatorProps) {
    return (
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
    )
}
