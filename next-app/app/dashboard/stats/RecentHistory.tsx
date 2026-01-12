'use client'

import React, { useEffect, useState } from 'react'
import { Clock, Film, Play, Activity, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { io, Socket } from 'socket.io-client'
import { EmbyImage } from '@/components/EmbyImage'

interface RecentHistoryProps {
    initialHistory: any[]
    instanceId: number
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`
}

export function RecentHistory({ initialHistory, instanceId }: RecentHistoryProps) {
    const [history, setHistory] = useState(initialHistory)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
        const wsUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL || `${protocol}://${window.location.hostname}:3001`
        
        const socket: Socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000
        })

        socket.on('connect', () => {
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
            setIsConnected(false)
        })

        socket.on('session_removed', (data: { instanceId: number, sessionId: string }) => {
            if (instanceId && data.instanceId !== instanceId) return

            setHistory(prev => {
                const liveIdToRemove = `live-${data.sessionId}`;
                // Remove the live item if it exists
                return prev.filter(item => {
                    const isTargetSession = (item.sessionId === data.sessionId) || (item.id === liveIdToRemove || item.Id === liveIdToRemove);
                    // Only remove if it's a live item
                    if (isTargetSession && item.isLive) return false;
                    return true;
                });
            });
        });

        socket.on('sessions_update', (data: any[]) => {
            // data is an array of active sessions from emby-tracker
            setHistory(prev => {
                const activeSessionIds = new Set(data.map(s => s.sessionId));
                return prev.map(item => {
                    // If item is live but not in active sessions, convert to non-live
                    if (item.isLive && item.sessionId && !activeSessionIds.has(item.sessionId)) {
                        return { ...item, isLive: false };
                    }
                    return item;
                });
            });
        });

        socket.on('history_update', (data: { instanceId: number, log: any }) => {
            // Only update if it's for the current instance (if filtering is active)
            if (instanceId && data.instanceId !== instanceId) return

            const newLog = data.log
            
            setHistory(prev => {
                const itemId = newLog.itemId
                const userId = newLog.embyUserId || newLog.userName
                const date = new Date(newLog.startTime || newLog.endTime)
                
                // 1. Update or remove items for the same session/user
                let itemHandled = false;
                let newHistory = prev.map(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null;
                    const isSameSession = (item.sessionId === newLog.sessionId) || (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove));
                    
                    // If it's exactly the same live session, update it
                    if (isSameSession && item.isLive) {
                        itemHandled = true;
                        const mediaType = newLog.itemType 
                            ? (newLog.itemType === 'Episode' ? 'tv' : 'movie') 
                            : item.mediaType;
                        return {
                            ...item,
                            ...newLog,
                            // Priority: 1. explicit playDuration (seconds), 2. accumulatedDuration (seconds), 3. fallback to existing
                            PlaybackDuration: newLog.playDuration ?? newLog.accumulatedDuration ?? item.PlaybackDuration ?? 0,
                            ActivityDateInserted: newLog.endTime || newLog.ActivityDateInserted || item.ActivityDateInserted,
                            imageItemId: newLog.itemId || item.imageItemId,
                            mediaType: mediaType,
                            isLive: newLog.isLive ?? item.isLive
                        };
                    }
                    return item;
                });

                // If a live session was updated, we're done with this update
                if (itemHandled) {
                    return newHistory.sort((a, b) => {
                        const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
                        const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
                        return dateB - dateA
                    });
                }

                // 2. If it's a new log (Live or History), check for merging or duplicates
                // Filter out any "Live" entries that this new log replaces
                let filteredPrev = prev.filter(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null;
                    const isSameSession = (item.sessionId === newLog.sessionId) || (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove));
                    const isSameUserItem = (item.itemId === itemId || item.NowPlayingItemId === itemId || item.ItemId === itemId) && 
                                          (item.embyUserId === userId || item.UserId === userId || item.UserName === userId || item.userName === userId);
                    
                    // If we're adding a final history log, remove the corresponding live session
                    if (!newLog.isLive && isSameSession) return false;
                    
                    // If we're adding a live session, remove any old live session for same user/item
                    if (newLog.isLive && item.isLive && isSameUserItem) return false;
                    
                    return true;
                });

                // 2. Find if there's an existing static history entry to merge with (non-live)
                const existingIndex = filteredPrev.findIndex(item => {
                    if (item.isLive) return false; // Don't merge with live items here

                    const itemMatch = (item.NowPlayingItemId || item.ItemId || item.itemId) === itemId
                    const userMatch = (item.UserId || item.UserName || item.userName || item.embyUserId) === userId
                    if (!itemMatch || !userMatch) return false
                    
                    const itemDate = new Date(item.ActivityDateInserted || item.DateCreated || item.startTime || item.endTime)
                    const diffTime = Math.abs(date.getTime() - itemDate.getTime())
                    const diffDays = diffTime / (1000 * 60 * 60 * 24)
                    return diffDays <= 7
                })

                if (existingIndex !== -1 && !newLog.isLive) {
                    const newHistory = [...filteredPrev]
                    const existing = { ...newHistory[existingIndex] }
                    
                    // Merge
                    const additionalDuration = newLog.playDuration ?? 0;
                    existing.PlaybackDuration = (existing.PlaybackDuration ?? existing.playDuration ?? 0) + additionalDuration
                    
                    // Update metadata to most recent
                    existing.ActivityDateInserted = newLog.endTime || newLog.ActivityDateInserted
                    existing.startTime = newLog.startTime || existing.startTime
                    existing.endTime = newLog.endTime || existing.endTime
                    existing.Client = newLog.client || existing.Client
                    existing.DeviceName = newLog.device || existing.DeviceName
                    
                    newHistory[existingIndex] = existing
                    
                    return newHistory.sort((a, b) => {
                        const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
                        const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
                        return dateB - dateA
                    })
                } else {
                    // Add as new entry (could be Live or new static history)
                    const newItem = {
                        ...newLog,
                        PlaybackDuration: newLog.playDuration ?? newLog.PlaybackDuration ?? newLog.accumulatedDuration ?? 0,
                        ActivityDateInserted: newLog.endTime || newLog.ActivityDateInserted,
                        Client: newLog.client,
                        DeviceName: newLog.device,
                        imageItemId: newLog.itemId,
                        mediaType: newLog.itemType === 'Episode' ? 'tv' : 'movie'
                    }
                    return [newItem, ...filteredPrev].sort((a, b) => {
                        const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
                        const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
                        return dateB - dateA
                    }).slice(0, 50)
                }
            })
        })

        return () => {
            socket.disconnect()
        }
    }, [instanceId])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Historique récent
                    {isConnected && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Connecté en direct" />
                    )}
                </h2>
            </div>
            <div className="rounded-xl bg-gray-900/40 border border-gray-700/50 overflow-hidden backdrop-blur-md shadow-2xl ring-1 ring-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="px-6 py-4 font-medium">Contenu</th>
                            <th className="px-6 py-4 font-medium">Client / Appareil</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium text-right">Durée</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {history.slice(0, 50).map((item: any, idx) => {
                            const isSeries = item.ItemType === 'Episode' || item.Type === 'Episode' || item.itemType === 'Episode' || !!item.SeriesName;
                            const isEpisode = item.Type === 'Episode' || item.ItemType === 'Episode' || item.itemType === 'Episode';
                            
                            const displayName = isEpisode 
                                ? (item.Name || item.ItemName || item.NowPlayingItemName || item.itemName)
                                : (isSeries ? (item.SeriesName || item.Name || item.itemName) : (item.NowPlayingItemName || item.Name || item.ItemName || item.itemName));

                            let subName = null;
                            if (isSeries) {
                                const parts = [];
                                if (item.SeriesName && item.SeriesName !== displayName) {
                                    parts.push(item.SeriesName);
                                }
                                if (item.ParentIndexNumber !== undefined && item.IndexNumber !== undefined) {
                                    parts.push(`S${item.ParentIndexNumber} • Épisode ${item.IndexNumber}`);
                                } else if (item.NowPlayingItemName && item.NowPlayingItemName !== displayName && item.NowPlayingItemName !== item.SeriesName) {
                                    parts.push(item.NowPlayingItemName);
                                }
                                subName = parts.length > 0 ? parts.join(' • ') : null;
                            }

                            const itemId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.itemId;
                            const date = new Date(item.ActivityDateInserted || item.DateCreated || item.endTime || item.startTime);
                            const duration = item.PlaybackDuration || item.playDuration || 0;
                            const isLive = item.isLive === true;

                            return (
                                <tr key={`${itemId}-${date.getTime()}-${idx}`} className={`hover:bg-blue-500/5 transition-colors group ${isLive ? 'bg-blue-500/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-gray-900 border border-gray-700/50">
                                                {itemId ? (
                                                    <EmbyImage 
                                                        itemId={itemId} 
                                                        alt={displayName} 
                                                        itemName={displayName}
                                                        instanceId={instanceId} 
                                                        tmdbId={item.tmdbId}
                                                        mediaType={item.mediaType || (isSeries ? 'tv' : 'movie')}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                        <Film className="h-4 w-4 text-gray-600" />
                                                    </div>
                                                )}
                                                {isLive && (
                                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                        <div className="flex h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                                    {displayName}
                                                    {isLive && (
                                                        <span className="text-[9px] px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse font-bold uppercase tracking-wider">
                                                            En direct
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-900 text-gray-500 font-medium border border-gray-700">
                                                        {isSeries ? 'Série' : 'Film'}
                                                    </span>
                                                    {subName && (
                                                        <span className="text-[10px] text-gray-500 truncate max-w-[250px]">
                                                            {subName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-300">{item.Client || item.client || item.ClientName || 'Client web'}</div>
                                        <div className="text-xs text-gray-500">{item.DeviceName || item.device || 'Inconnu'}</div>
                                        <div className="text-[10px] text-blue-400/80 mt-1 flex items-center gap-1 font-medium uppercase tracking-wider">
                                            <User size={10} className="text-blue-500" />
                                            {item.UserName || item.userName || 'Utilisateur'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-mono text-blue-400">
                                        {formatDuration(duration)}
                                    </td>
                                </tr>
                            );
                        })}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-500 italic">
                                    Aucun historique de visionnage trouvé
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
