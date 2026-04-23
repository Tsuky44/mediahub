'use client'

import { useEffect, useRef } from 'react'

/**
 * Fait defiler la page automatiquement quand l'utilisateur approche
 * le haut ou le bas de la fenetre pendant un drag.
 *
 * @param isDragging true tant qu'un drag est en cours
 */
export function useDragAutoScroll(isDragging: boolean): void {
    const scrollAnimRef = useRef<number | null>(null)
    const mouseYRef = useRef<number>(0)

    useEffect(() => {
        if (!isDragging) {
            if (scrollAnimRef.current) {
                cancelAnimationFrame(scrollAnimRef.current)
                scrollAnimRef.current = null
            }
            return
        }

        const handleWindowDragOver = (e: DragEvent) => {
            e.preventDefault()
            mouseYRef.current = e.clientY
        }

        window.addEventListener('dragover', handleWindowDragOver)

        const scrollLoop = () => {
            const SCROLL_ZONE = 100
            const BASE_SPEED = 5
            const MAX_SPEED = 25

            const y = mouseYRef.current
            const windowHeight = window.innerHeight

            if (y < SCROLL_ZONE && y > 0) {
                const intensity = 1 - (y / SCROLL_ZONE)
                const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * intensity
                window.scrollBy(0, -speed)
            } else if (y > windowHeight - SCROLL_ZONE && y < windowHeight) {
                const intensity = (y - (windowHeight - SCROLL_ZONE)) / SCROLL_ZONE
                const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * intensity
                window.scrollBy(0, speed)
            }

            scrollAnimRef.current = requestAnimationFrame(scrollLoop)
        }

        scrollAnimRef.current = requestAnimationFrame(scrollLoop)

        return () => {
            window.removeEventListener('dragover', handleWindowDragOver)
            if (scrollAnimRef.current) {
                cancelAnimationFrame(scrollAnimRef.current)
                scrollAnimRef.current = null
            }
        }
    }, [isDragging])
}
