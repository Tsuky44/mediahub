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

export type MePeriod = 'week' | 'month' | 'year'

export interface MePeriodParams {
    period?: string
    month?: string
    year?: string
    weekOffset?: string
}

export interface MePeriodResult {
    period: MePeriod
    startDate: Date
    endDate: Date
    days: number
    periodTitle: string
    prevHref: string
    nextHref: string
}

function normalizePeriod(value?: string): MePeriod {
    return value === 'week' || value === 'year' ? value : 'month'
}

/** Calcule les bornes et la navigation pour la page stats/me (week/month/year). */
export function computeMePeriod(params: MePeriodParams, now: Date = new Date()): MePeriodResult {
    const period = normalizePeriod(params.period)

    let startDate = new Date()
    let endDate = new Date()
    let periodTitle = ''
    let prevHref = ''
    let nextHref = ''

    if (period === 'week') {
        const weekOffset = params.weekOffset ? parseInt(params.weekOffset) : 0
        const targetDate = addWeeks(now, weekOffset)
        startDate = startOfWeek(targetDate, { weekStartsOn: 1 })
        endDate = endOfWeek(targetDate, { weekStartsOn: 1 })
        periodTitle = `Semaine du ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(startDate)}`
        prevHref = `?period=week&weekOffset=${weekOffset - 1}`
        nextHref = `?period=week&weekOffset=${weekOffset + 1}`
    } else if (period === 'month') {
        const month = params.month ? parseInt(params.month) : now.getMonth()
        const year = params.year ? parseInt(params.year) : now.getFullYear()
        const targetDate = new Date(year, month, 1)
        startDate = startOfMonth(targetDate)
        endDate = endOfMonth(targetDate)
        periodTitle = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(targetDate)
        const prevMonth = subMonths(targetDate, 1)
        const nextMonth = addMonths(targetDate, 1)
        prevHref = `?period=month&month=${prevMonth.getMonth()}&year=${prevMonth.getFullYear()}`
        nextHref = `?period=month&month=${nextMonth.getMonth()}&year=${nextMonth.getFullYear()}`
    } else {
        const year = params.year ? parseInt(params.year) : now.getFullYear()
        const targetDate = new Date(year, 0, 1)
        startDate = startOfYear(targetDate)
        endDate = endOfYear(targetDate)
        periodTitle = `Année ${year}`
        prevHref = `?period=year&year=${year - 1}`
        nextHref = `?period=year&year=${year + 1}`
    }

    const days = differenceInDays(now, startDate) + 1

    return { period, startDate, endDate, days, periodTitle, prevHref, nextHref }
}
