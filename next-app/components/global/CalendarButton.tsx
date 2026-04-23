'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Check, Loader2, CalendarMinus } from 'lucide-react'
import { addToCalendar, removeFromCalendar } from '@/app/actions/calendar'
import { toast } from 'react-hot-toast'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CalendarButtonProps {
    tmdbId: string
    mediaType: 'movie' | 'tv'
    title: string
    releaseDate?: string
    initialIsInCalendar?: boolean // To be implemented if we want to check status on load
}

export function CalendarButton({ tmdbId, mediaType, title, releaseDate, initialIsInCalendar = false }: CalendarButtonProps) {
    const [loading, setLoading] = useState(false)
    const [isInCalendar, setIsInCalendar] = useState(initialIsInCalendar)

    const handleToggleCalendar = async () => {
        if (!releaseDate) {
            toast.error("Impossible d'ajouter au calendrier sans date de sortie")
            return
        }

        setLoading(true)
        try {
            if (isInCalendar) {
                await removeFromCalendar(tmdbId, mediaType)
                setIsInCalendar(false)
                toast.success("Retiré de votre calendrier personnel")
            } else {
                await addToCalendar(tmdbId, mediaType, title, new Date(releaseDate))
                setIsInCalendar(true)
                const dateStr = new Date(releaseDate).toLocaleDateString('fr-FR')
                toast.success(`Ajouté au calendrier pour le ${dateStr}`)
            }
        } catch (error) {
            console.error('Failed to update calendar:', error)
            toast.error("Une erreur est survenue")
        } finally {
            setLoading(false)
        }
    }

    if (!releaseDate) return null

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handleToggleCalendar}
                        disabled={loading}
                        className={isInCalendar ? "text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/10" : ""}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isInCalendar ? (
                            <CalendarMinus className="h-4 w-4" />
                        ) : (
                            <CalendarPlus className="h-4 w-4" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isInCalendar ? "Retirer du calendrier" : "Ajouter à mon calendrier"}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
