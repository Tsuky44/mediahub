'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    isToday,
    parseISO 
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { getCalendarEvents, CalendarEvent } from '@/app/actions/calendar'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar as CalendarIcon, Film, Tv, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function ReleaseCalendar() {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState(new Date())
    const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
    const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    const [showMovies, setShowMovies] = useState(true)
    const [showSeries, setShowSeries] = useState(true)

    const fetchEvents = async (currentDate: Date) => {
        setLoading(true)
        try {
            // Generate range for the view
            const monthStart = startOfMonth(currentDate)
            const monthEnd = endOfMonth(monthStart)
            const startDate = startOfWeek(monthStart, { locale: fr })
            const endDate = endOfWeek(monthEnd, { locale: fr })

            console.log('Fetching calendar events for range:', startDate, endDate)
            const data = await getCalendarEvents(startDate, endDate)
            
            // Convert string dates to Date objects
            const formattedEvents = data.map(event => ({
                ...event,
                start: typeof event.start === 'string' ? parseISO(event.start) : event.start,
                end: event.end ? (typeof event.end === 'string' ? parseISO(event.end) : event.end) : undefined
            }))
            
            console.log('Fetched events:', formattedEvents)
            setEvents(formattedEvents)
        } catch (error) {
            console.error('Failed to load calendar events:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        fetchEvents(date)
    }, [date])

    const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
        if (action === 'PREV') setDate(subMonths(date, 1))
        if (action === 'NEXT') setDate(addMonths(date, 1))
        if (action === 'TODAY') setDate(new Date())
    }

    const handleSelectEvent = (event: CalendarEvent) => {
        setHoveredEvent(null)
        if (event.tmdbId) {
            let url = `/dashboard/media/${event.tmdbId}?type=${event.mediaType}`
            
            if (event.mediaType === 'tv') {
                if (event.seasonNumber) {
                    url += `&season=${event.seasonNumber}`
                    if (event.episodeNumber) {
                        url += `&episode=${event.episodeNumber}`
                    }
                }
            }
            
            router.push(url)
        }
    }

    // Grid Generation
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: fr })
    const endDate = endOfWeek(monthEnd, { locale: fr })
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
    const daysOfWeek = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

    const getDayEvents = (day: Date) => {
        return events.filter(event => {
            if (!isSameDay(event.start, day)) return false
            if (event.mediaType === 'movie' && !showMovies) return false
            if (event.mediaType === 'tv' && !showSeries) return false
            return true
        })
    }

    return (
        <div className="flex flex-col h-full min-h-[850px] relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-8 pt-2 px-2 relative z-10 gap-4 md:gap-0">
                <div className="flex items-center gap-6">
                        <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter mb-1">Calendrier</h1>
                        <p className="text-base text-gray-400 font-medium">
                            <span className="capitalize text-white/90">{format(date, 'MMMM yyyy', { locale: fr })}</span>
                        </p>
                        </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-6 w-full md:w-auto">
                    {loading && <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />}
                    
                    <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/5">
                        <Button variant="ghost" size="icon" onClick={() => handleNavigate('PREV')} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleNavigate('TODAY')} className="h-8 px-3 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                            Aujourd'hui
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleNavigate('NEXT')} className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex gap-3 text-sm font-medium">
                        <button 
                            onClick={() => setShowMovies(!showMovies)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none",
                                showMovies 
                                    ? "bg-amber-500/10 text-amber-200/90 border-amber-500/20 hover:bg-amber-500/20" 
                                    : "bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-400"
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", showMovies ? "bg-amber-500 animate-pulse" : "bg-gray-600")}></div>
                            <span>Films</span>
                        </button>
                        <button 
                            onClick={() => setShowSeries(!showSeries)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none",
                                showSeries 
                                    ? "bg-indigo-500/10 text-indigo-200/90 border-indigo-500/20 hover:bg-indigo-500/20" 
                                    : "bg-transparent text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-400"
                            )}
                        >
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", showSeries ? "bg-indigo-500 animate-pulse" : "bg-gray-600")}></div>
                            <span>Séries</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-black/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl relative">
                 {/* Days Header */}
                 <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
                    {daysOfWeek.map((day) => (
                        <div key={day} className="py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 auto-rows-fr h-full">
                    {calendarDays.map((day, dayIdx) => {
                        const dayEvents = getDayEvents(day)
                        const isCurrentMonth = isSameMonth(day, date)
                        const isTodayDate = isToday(day)

                        return (
                            <div 
                                key={day.toString()} 
                                className={cn(
                                    "min-h-[140px] p-2 border-b border-r border-white/5 relative group transition-colors hover:bg-white/[0.02]",
                                    !isCurrentMonth && "bg-black/20 text-gray-600",
                                    dayIdx % 7 === 6 && "border-r-0" // Remove right border for last column
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={cn(
                                        "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                                        isTodayDate 
                                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40" 
                                            : isCurrentMonth ? "text-gray-400 group-hover:text-gray-200" : "text-gray-700"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    {dayEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleSelectEvent(event)
                                            }}
                                            onMouseEnter={(e) => {
                                                setMousePos({ x: e.clientX, y: e.clientY })
                                                setHoveredEvent(event)
                                            }}
                                            onMouseLeave={() => {
                                                setHoveredEvent(null)
                                                setMousePos(null)
                                            }}
                                            onMouseMove={(e) => {
                                                setMousePos({ x: e.clientX, y: e.clientY })
                                            }}
                                            className={cn(
                                                "px-2 py-1 rounded text-[11px] font-medium truncate cursor-pointer transition-all border-l-2",
                                                event.mediaType === 'movie' 
                                                    ? "bg-amber-500/10 text-amber-200/90 border-amber-500/50 hover:bg-amber-500/20" 
                                                    : "bg-indigo-500/10 text-indigo-200/90 border-indigo-500/50 hover:bg-indigo-500/20",
                                                event.status === 'unmonitored' && "opacity-50 grayscale"
                                            )}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Hover Card Portal */}
            {mounted && hoveredEvent && mousePos && createPortal(
                <div 
                    className="fixed z-[100] w-[380px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden pointer-events-none animate-in fade-in zoom-in-95 duration-200 flex ring-1 ring-white/5"
                    style={{
                        top: mousePos.y + 15 > window.innerHeight - 250 ? mousePos.y - 220 : mousePos.y + 15,
                        left: mousePos.x + 400 > window.innerWidth ? mousePos.x - 395 : mousePos.x + 15,
                    }}
                >
                    <div className="w-[120px] bg-gray-900 relative flex-shrink-0 border-r border-white/5">
                            {hoveredEvent.posterUrl ? (
                            <img src={hoveredEvent.posterUrl} alt={hoveredEvent.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                {hoveredEvent.mediaType === 'movie' ? <Film className="w-8 h-8 text-gray-800" /> : <Tv className="w-8 h-8 text-gray-800" />}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <div className="flex-1 p-4 flex flex-col min-w-0">
                        <div className="mb-2">
                            <Badge variant="outline" className={cn(
                                "mb-1.5 text-[10px] h-5 px-2 border-0 font-medium shadow-sm",
                                hoveredEvent.mediaType === 'movie' ? 'bg-amber-500/20 text-amber-200' : 'bg-indigo-500/20 text-indigo-200'
                            )}>
                                {hoveredEvent.mediaType === 'movie' ? 'Film' : 'Série'}
                            </Badge>
                            <h3 className="text-base font-bold text-white leading-tight line-clamp-2">{hoveredEvent.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-3">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                            {format(hoveredEvent.start, 'd MMMM yyyy', { locale: fr })}
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed font-light opacity-80">
                            {hoveredEvent.overview || "Aucune description disponible."}
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
