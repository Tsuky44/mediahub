'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { compareHistoryItems, compareHistoryItemsNewestLive } from '../_utils/history-formatters'

export interface UseHistorySocketResult {
    history: any[]
    isConnected: boolean
}

/**
 * Construit l'URL du serveur socket.io selon l'environnement.
 * - En dev : http(s)://hostname:3005
 * - En prod : relative (les rewrites Next.js proxy sur /socket.io/)
 */
function resolveSocketUrl(): string | undefined {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const fromEnv = process.env.NEXT_PUBLIC_TRACKER_WS_URL
    if (fromEnv) return fromEnv

    if (process.env.NODE_ENV === 'development') {
        return `${protocol === 'wss' ? 'https' : 'http'}://${window.location.hostname}:3005`
    }
    // Production: laisser socket.io-client utiliser window.location par defaut
    return undefined
}

/**
 * Gere la connexion socket.io au tracker et synchronise l'historique
 * en temps reel (`session_removed`, `sessions_update`, `history_update`).
 *
 * Remet `history` a jour quand `initialHistory` change (ex : filtres).
 */
export function useHistorySocket(initialHistory: any[]): UseHistorySocketResult {
    const [history, setHistory] = useState<any[]>(initialHistory)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        setHistory(initialHistory)
    }, [initialHistory])

    useEffect(() => {
        const wsUrl = resolveSocketUrl()

        const socket: Socket = io(wsUrl || undefined, {
            path: '/socket.io',
            transports: ['polling', 'websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            withCredentials: true,
        })

        socket.on('connect', () => setIsConnected(true))
        socket.on('disconnect', () => setIsConnected(false))

        socket.on('session_removed', (data: { sessionId: string }) => {
            setHistory(prev => {
                const liveIdToRemove = `live-${data.sessionId}`
                return prev.filter(item => {
                    const isTargetSession =
                        (item.sessionId === data.sessionId) ||
                        (item.id === liveIdToRemove || item.Id === liveIdToRemove)
                    if (isTargetSession && item.isLive) return false
                    return true
                })
            })
        })

        socket.on('sessions_update', (data: any[]) => {
            setHistory(prev => {
                const sessionsMap = new Map(data.map(s => [s.sessionId, s]))
                const activeSessionIds = new Set(data.map(s => s.sessionId))
                let hasChanged = false

                const next = prev.map(item => {
                    if (item.isLive) {
                        if (item.sessionId && !activeSessionIds.has(item.sessionId)) {
                            hasChanged = true
                            return { ...item, isLive: false }
                        }

                        if (item.sessionId && sessionsMap.has(item.sessionId)) {
                            const session = sessionsMap.get(item.sessionId)
                            const newDuration = session.accumulatedDuration || 0

                            const detailsChanged =
                                item.itemName !== session.itemName ||
                                item.SeriesName !== session.seriesName ||
                                item.ParentIndexNumber !== session.seasonIndex ||
                                item.IndexNumber !== session.episodeIndex

                            if (Math.abs((item.PlaybackDuration || 0) - newDuration) > 1 || detailsChanged) {
                                hasChanged = true
                                return {
                                    ...item,
                                    PlaybackDuration: newDuration,
                                    itemName: session.itemName,
                                    SeriesName: session.seriesName || item.SeriesName,
                                    ParentIndexNumber: session.seasonIndex ?? item.ParentIndexNumber,
                                    IndexNumber: session.episodeIndex ?? item.IndexNumber,
                                    mediaInfo: {
                                        ...item.mediaInfo,
                                        ...session.mediaInfo,
                                    },
                                }
                            }
                        }
                    }
                    return item
                })

                const existingSessionIds = new Set(next.filter(i => i.isLive).map(i => i.sessionId))

                for (const session of data) {
                    if (!existingSessionIds.has(session.sessionId)) {
                        hasChanged = true
                        const newItem = {
                            id: `live-${session.sessionId}`,
                            sessionId: session.sessionId,
                            source: session.source,
                            userName: session.userName,
                            UserId: session.userId,
                            UserName: session.userName,
                            itemId: session.itemId,
                            itemName: session.itemName,
                            Name: session.itemName,
                            SeriesName: session.seriesName,
                            ParentIndexNumber: session.seasonIndex,
                            IndexNumber: session.episodeIndex,
                            itemType: session.itemType,
                            Type: session.itemType,
                            mediaType: session.itemType === 'Episode' ? 'tv' : 'movie',
                            startTime: session.startedAt,
                            ActivityDateInserted: session.startedAt,
                            PlaybackDuration: session.accumulatedDuration || 0,
                            isLive: true,
                            mediaInfo: session.mediaInfo || {},
                        }

                        next.unshift(newItem)
                    }
                }

                if (hasChanged) {
                    return [...next].sort(compareHistoryItemsNewestLive)
                }
                return prev
            })
        })

        socket.on('history_update', (data: { log: any }) => {
            const newLog = {
                ...data.log,
                source: data.log.source || 'emby',
            }

            setHistory(prev => {
                const itemId = newLog.itemId
                const userId = newLog.embyUserId || newLog.userName
                const source = newLog.source
                const date = new Date(newLog.startTime || newLog.endTime)

                // 1. Update existing live sessions matching this log
                let itemHandled = false
                const newHistory = prev.map(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null

                    const isSameSession = (item.sessionId && newLog.sessionId && item.sessionId === newLog.sessionId) ||
                        (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove))

                    const isSameUserItem = !!itemId && !!userId &&
                        (item.source === source) &&
                        (String(item.itemId || item.NowPlayingItemId || item.ItemId) === String(itemId)) &&
                        (String(item.embyUserId || item.UserId || item.UserName || item.userName) === String(userId))

                    if (item.isLive && (isSameSession || (newLog.isLive && isSameUserItem))) {
                        itemHandled = true
                        const mediaType = newLog.itemType
                            ? (newLog.itemType === 'Episode' ? 'tv' : 'movie')
                            : item.mediaType
                        return {
                            ...item,
                            ...newLog,
                            PlaybackDuration: newLog.playDuration ?? newLog.accumulatedDuration ?? item.PlaybackDuration ?? 0,
                            ActivityDateInserted: newLog.endTime || newLog.ActivityDateInserted || item.ActivityDateInserted,
                            imageItemId: newLog.itemId || item.imageItemId,
                            mediaType,
                            isLive: newLog.isLive ?? item.isLive,
                            source,
                        }
                    }
                    return item
                })

                if (itemHandled) {
                    return [...newHistory].sort(compareHistoryItems)
                }

                // 2. Filter out live entries replaced by this new log
                const filteredPrev = prev.filter(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null
                    const isSameSession = (item.sessionId && newLog.sessionId && item.sessionId === newLog.sessionId) ||
                        (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove))

                    const isSameUserItem = !!itemId && !!userId &&
                        (item.source === source) &&
                        (String(item.itemId || item.NowPlayingItemId || item.ItemId) === String(itemId)) &&
                        (String(item.embyUserId || item.UserId || item.UserName || item.userName) === String(userId))

                    if (!newLog.isLive && isSameSession) return false
                    if (newLog.isLive && item.isLive && isSameUserItem) return false
                    return true
                })

                // 3. Try to merge into an existing static history entry (< 7 days)
                const existingIndex = filteredPrev.findIndex(item => {
                    if (item.isLive) return false
                    if (item.source !== source) return false

                    const itemMatch = String(item.NowPlayingItemId || item.ItemId || item.itemId) === String(itemId)
                    const userMatch = String(item.UserId || item.UserName || item.userName || item.embyUserId) === String(userId)
                    if (!itemMatch || !userMatch) return false

                    const itemDate = new Date(item.ActivityDateInserted || item.DateCreated || item.startTime || item.endTime)
                    const diffDays = Math.abs(date.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
                    return diffDays <= 7
                })

                if (existingIndex !== -1 && !newLog.isLive) {
                    const nextHistory = [...filteredPrev]
                    const existing = { ...nextHistory[existingIndex] }

                    const additionalDuration = newLog.playDuration ?? 0
                    existing.PlaybackDuration = (existing.PlaybackDuration ?? existing.playDuration ?? 0) + additionalDuration
                    existing.ActivityDateInserted = newLog.endTime || newLog.ActivityDateInserted
                    existing.startTime = newLog.startTime || existing.startTime
                    existing.endTime = newLog.endTime || existing.endTime
                    existing.Client = newLog.client || existing.Client
                    existing.DeviceName = newLog.device || existing.DeviceName

                    nextHistory[existingIndex] = existing
                    return nextHistory.sort(compareHistoryItems)
                }

                // 4. Add as new entry
                const newItem = {
                    ...newLog,
                    PlaybackDuration: newLog.playDuration ?? newLog.PlaybackDuration ?? newLog.accumulatedDuration ?? 0,
                    ActivityDateInserted: newLog.endTime || newLog.ActivityDateInserted,
                    Client: newLog.client,
                    DeviceName: newLog.device,
                    imageItemId: newLog.itemId,
                    mediaType: newLog.itemType === 'Episode' ? 'tv' : 'movie',
                }

                return [newItem, ...filteredPrev]
                    .sort(compareHistoryItems)
                    .slice(0, 50)
            })
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return { history, isConnected }
}
