import {
    startOfMonth,
    endOfMonth,
    differenceInDays,
    startOfYear,
    endOfYear,
    startOfWeek,
    endOfWeek,
    addMonths,
    subMonths,
    addWeeks,
} from 'date-fns'
import { fr } from 'date-fns/locale'

export type StatsPeriod = 'week' | 'month' | 'year' | 'all'

export interface StatsPeriodParams {
    period?: string
    month?: string
    year?: string
    weekOffset?: string
    source?: string
}

export interface StatsPeriodResult {
    period: StatsPeriod
    startDate: Date
    endDate: Date
    days: number
    periodTitle: string
    prevHref: string
    nextHref: string
    subValueLabel: string
}

function normalizePeriod(value?: string): StatsPeriod {
    return value === 'month' || value === 'year' || value === 'all' ? value : 'week'
}

/**
 * Calcule les bornes de date, le titre et les liens de navigation (precedent/suivant)
 * pour la page stats en fonction des params d'URL.
 */
export function computeStatsPeriod(
    params: StatsPeriodParams,
    sourceFilter: string,
    now: Date = new Date()
): StatsPeriodResult {
    const period = normalizePeriod(params.period)

    let startDate = startOfWeek(now, { locale: fr })
    let endDate = endOfWeek(now, { locale: fr })
    let days = 7
    let periodTitle = ''
    let prevHref = ''
    let nextHref = ''

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
        startDate = new Date(2000, 0, 1)
        endDate = new Date(2100, 0, 1)
        periodTitle = "Tout l'historique"
        prevHref = '#'
        nextHref = '#'
    }

    const subValueLabel = period === 'week' ? '7 jours' : period === 'year' ? 'Année' : period === 'all' ? 'Historique' : 'Mois'

    return { period, startDate, endDate, days, periodTitle, prevHref, nextHref, subValueLabel }
}
