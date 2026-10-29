'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const isDev = process.env.NODE_ENV === 'development'
const log = (...args: unknown[]) => { if (isDev) console.log(...args) }

/**
 * Fenêtre de regroupement des événements.
 *
 * Un redémarrage émet `die` puis `start` à quelques millisecondes d'écart, et
 * une action de masse en produit une rafale. Sans regroupement, chaque
 * événement déclencherait sa propre requête de liste.
 */
const DEBOUNCE_MS = 400

interface DockerEvent {
    action: string
    containerId?: string
    containerName?: string
}

/**
 * Rafraîchit la liste dès que Docker signale un changement d'état, au lieu
 * d'attendre le prochain cycle de polling.
 *
 * Le polling reste en place comme filet : si le sidecar est absent ou si le
 * socket Docker n'est pas monté, aucun événement n'arrive et la page continue
 * de fonctionner comme avant, simplement moins vite.
 */
export function useDockerEvents(onChange: () => void): void {
    const socketRef = useRef<Socket | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onChangeRef = useRef(onChange)

    // La callback change à chaque rendu ; on la garde dans une ref pour ne pas
    // reconnecter le socket à chaque fois. L'affectation passe par un effet :
    // écrire dans une ref pendant le rendu casse les rendus concurrents.
    useEffect(() => {
        onChangeRef.current = onChange
    })

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
        const runtimeUrl = window.__ENV?.TRACKER_WS_URL
        const buildUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL
        const fallbackUrl = process.env.NODE_ENV === 'development'
            ? `${protocol}://${window.location.hostname}:3005`
            : undefined

        const socket = io(runtimeUrl || buildUrl || fallbackUrl || undefined, {
            path: '/socket.io',
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 10,
            withCredentials: true,
        })

        socketRef.current = socket

        socket.on('docker_event', (event: DockerEvent) => {
            log('[DockerEvents]', event.action, event.containerName ?? event.containerId)

            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => onChangeRef.current(), DEBOUNCE_MS)
        })

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            socket.disconnect()
        }
    }, [])
}
