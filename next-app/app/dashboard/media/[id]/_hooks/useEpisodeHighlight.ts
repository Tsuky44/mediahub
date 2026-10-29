'use client'

import { useEffect } from 'react'
import { whenArrived } from '@/components/global/MotionDirector'

/** Pause apres l'arrivee : les textes de la fiche finissent de tomber, le panneau est ouvert */
const ARRIVAL_PAUSE_MS = 600
/** L'episode se souleve, plane, puis se repose en s'ecrasant legerement */
const LIFT_MS = 1150
const REDUCED_CLASSES = ['ring-1', 'ring-white/30']

const sleep = (ms: number) => new Promise((done) => window.setTimeout(done, ms))

/** Defilement termine : position stable quelques images de suite (ou delai maximal) */
function scrollSettled(max = 1600): Promise<void> {
    return new Promise((done) => {
        const start = performance.now()
        let last = -1
        let still = 0
        const tick = () => {
            still = window.scrollY === last ? still + 1 : 0
            last = window.scrollY
            if (still >= 4 || performance.now() - start > max) done()
            else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    })
}

/**
 * Survol puis atterrissage, dans l'esprit de l'envol vers la fiche (MotionDirector), sans jamais
 * deborder du panneau des episodes : l'agrandissement tient dans la marge qui l'entoure.
 */
function lift(el: HTMLElement) {
    const box = el.getBoundingClientRect()
    const room = el.parentElement?.closest('.rounded-3xl')?.getBoundingClientRect()
    const margin = room ? Math.min(box.left - room.left, room.right - box.right) - 3 : 6
    const grow = Math.max(0, Math.min(0.018, (2 * margin) / box.width))
    const up = String(1 + grow)
    const shadow = '0 18px 40px -16px rgb(0 0 0 / 0.65), 0 0 0 1px rgb(242 240 237 / 0.18)'
    Object.assign(el.style, { position: 'relative', zIndex: '1', transformOrigin: '50% 100%' })
    // Debut et fin implicites : l'episode part de sa place et y revient exactement
    const flight = el.animate(
        [
            { offset: 0.3, translate: '0 -6px', scale: up, boxShadow: shadow, easing: 'ease-in-out' },
            { offset: 0.56, translate: '0 -7px', scale: up, boxShadow: shadow, easing: 'ease-in' },
            { offset: 0.72, translate: '0 1px', scale: `${1 + grow * 0.4} ${1 - grow * 0.6}`, boxShadow: '0 6px 16px -10px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(242 240 237 / 0.1)', easing: 'ease-out' },
            { offset: 0.86, translate: '0 -1px', scale: `${1 - grow * 0.1} ${1 + grow * 0.2}`, easing: 'ease-in-out' },
        ],
        { duration: LIFT_MS }
    )
    const reset = () => Object.assign(el.style, { position: '', zIndex: '', transformOrigin: '' })
    flight.onfinish = reset
    flight.oncancel = reset
}

/**
 * Episode vise par le lien (calendrier, historique) : une fois la fiche arrivee (envol pose, textes
 * en place), la page descend jusqu'a lui, puis il se souleve, plane un instant et se repose.
 * Si l'on a deja fait defiler la page soi-meme, on la laisse ou elle est.
 */
export function useEpisodeHighlight(loaded: boolean, highlightEpisode: number | null | undefined) {
    useEffect(() => {
        if (!loaded || !highlightEpisode) return
        let cancelled = false
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        void (async () => {
            await whenArrived()
            const top = window.scrollY
            await sleep(ARRIVAL_PAUSE_MS)
            const el = document.getElementById(`episode-${highlightEpisode}`)
            if (cancelled || !el || Math.abs(window.scrollY - top) > 120) return
            el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
            await scrollSettled()
            if (cancelled) return
            if (!reduced) return lift(el)
            el.classList.add(...REDUCED_CLASSES)
            window.setTimeout(() => el.classList.remove(...REDUCED_CLASSES), 3000)
        })()
        return () => {
            cancelled = true
        }
    }, [loaded, highlightEpisode])
}
