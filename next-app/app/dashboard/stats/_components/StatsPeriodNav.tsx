import type { StatsPeriod } from '../_utils/stats-period'

interface PeriodButtonProps {
    active: boolean
    href: string
    label: string
}

function PeriodButton({ active, href, label }: PeriodButtonProps) {
    return (
        <a
            href={href}
            className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 block text-center whitespace-nowrap ${
                active
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 scale-105'
                    : 'bg-transparent text-gray-500 hover:text-white hover:bg-white/5 hover:scale-105'
            }`}
        >
            {label}
        </a>
    )
}

interface StatsPeriodNavProps {
    period: StatsPeriod
}

/** Barre de selection de periode (Semaine / Mois / Annee / Tout). */
export function StatsPeriodNav({ period }: StatsPeriodNavProps) {
    const items: { key: StatsPeriod; label: string }[] = [
        { key: 'week', label: 'Semaine' },
        { key: 'month', label: 'Mois' },
        { key: 'year', label: 'Année' },
        { key: 'all', label: 'Tout' },
    ]

    return (
        <div className="flex justify-center md:justify-end">
            <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-lg w-full md:w-fit overflow-x-auto no-scrollbar">
                {items.map(item => (
                    <div key={item.key} className="flex-1 md:flex-none">
                        <PeriodButton active={period === item.key} href={`?period=${item.key}`} label={item.label} />
                    </div>
                ))}
            </div>
        </div>
    )
}
