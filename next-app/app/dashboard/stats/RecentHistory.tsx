'use client'

import React, { useEffect, useState } from 'react'
import { Clock, Film, Play, Activity, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { io, Socket } from 'socket.io-client'
import { EmbyImage } from '@/components/EmbyImage'

interface RecentHistoryProps {
    initialHistory: any[]
    instanceId?: number
    filteredInstanceIds?: number[]
    instanceTypes: Record<number, string>
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`
}

export function RecentHistory({ initialHistory, instanceId, filteredInstanceIds, instanceTypes }: RecentHistoryProps) {
    const [history, setHistory] = useState(initialHistory)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        // Update history when filters change, but we should rely on initialHistory prop update from parent mostly
        setHistory(initialHistory)
    }, [initialHistory])

    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
        const wsUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL || `${protocol}://${window.location.hostname}:3005`
        
        const socket: Socket = io(wsUrl, {
            transports: ['websocket'],
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
            // Apply filtering logic to live updates too
            if (filteredInstanceIds && filteredInstanceIds.length > 0) {
                if (!filteredInstanceIds.includes(data.instanceId)) return
            } else if (instanceId && data.instanceId !== instanceId) {
                return
            }

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
                let hasChanged = false;
                const next = prev.map(item => {
                    // If item is live but not in active sessions, convert to non-live
                    if (item.isLive && item.sessionId && !activeSessionIds.has(item.sessionId)) {
                        hasChanged = true;
                        return { ...item, isLive: false };
                    }
                    return item;
                });
                return hasChanged ? next : prev;
            });
        });

        socket.on('history_update', (data: { instanceId: number, log: any }) => {
            // Only update if it's for the current instance (if filtering is active)
            if (filteredInstanceIds && filteredInstanceIds.length > 0) {
                if (!filteredInstanceIds.includes(data.instanceId)) return
            } else if (instanceId && data.instanceId !== instanceId) {
                return
            }

            const newLog = {
                ...data.log,
                source: data.log.source || instanceTypes[data.instanceId] || 'emby'
            }
            
            setHistory(prev => {
                const itemId = newLog.itemId
                const userId = newLog.embyUserId || newLog.userName
                const source = newLog.source
                const instanceId = newLog.instanceId || data.instanceId
                const date = new Date(newLog.startTime || newLog.endTime)
                
                // 1. Update or remove items for the same session/user
                let itemHandled = false;
                let newHistory = prev.map(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null;
                    
                    // Stricter session matching: must match sessionId AND instanceId
                    const isSameSession = (item.sessionId && newLog.sessionId && item.sessionId === newLog.sessionId && item.instanceId === instanceId) || 
                                         (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove) && item.instanceId === instanceId);
                    
                    // Stricter user/item matching: must match source, instance, item, and user
                    // We only allow this match if both items are Live and have valid IDs
                    const isSameUserItem = !!itemId && !!userId && 
                                          (item.source === source) && 
                                          (item.instanceId === instanceId) &&
                                          (String(item.itemId || item.NowPlayingItemId || item.ItemId) === String(itemId)) && 
                                          (String(item.embyUserId || item.UserId || item.UserName || item.userName) === String(userId));
                    
                    // If it's a live update for the same session OR same user/item, update it
                    if (item.isLive && (isSameSession || (newLog.isLive && isSameUserItem))) {
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
                            isLive: newLog.isLive ?? item.isLive,
                            instanceId: instanceId,
                            source: source
                        };
                    }
                    return item;
                });

                // If a live session was updated, we're done with this update
                if (itemHandled) {
                    return newHistory.sort((a, b) => {
                        if (a.isLive && !b.isLive) return -1;
                        if (!a.isLive && b.isLive) return 1;
                        
                        // For live sessions, sort by start time (fixed) to avoid jumping
                        if (a.isLive && b.isLive) {
                            const startA = new Date(a.startTime || a.startedAt || 0).getTime();
                            const startB = new Date(b.startTime || b.startedAt || 0).getTime();
                            return startA - startB; // Oldest live session first
                        }

                        const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
                        const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
                        return dateB - dateA
                    });
                }

                // 2. If it's a new log (Live or History), check for merging or duplicates
                // Filter out any "Live" entries that this new log replaces
                let filteredPrev = prev.filter(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null;
                    const isSameSession = (item.sessionId && newLog.sessionId && item.sessionId === newLog.sessionId && item.instanceId === instanceId) || 
                                         (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove) && item.instanceId === instanceId);
                    
                    const isSameUserItem = !!itemId && !!userId && 
                                          (item.source === source) && 
                                          (item.instanceId === instanceId) &&
                                          (String(item.itemId || item.NowPlayingItemId || item.ItemId) === String(itemId)) && 
                                          (String(item.embyUserId || item.UserId || item.UserName || item.userName) === String(userId));
                    
                    // If we're adding a final history log, remove the corresponding live session
                    if (!newLog.isLive && isSameSession) return false;
                    
                    // If we're adding a live session, remove any old live session for same user/item
                    if (newLog.isLive && item.isLive && isSameUserItem) {
                        return false; // Replace old session with new update for same user/item
                    }
                    
                    return true;
                });

                // 2. Find if there's an existing static history entry to merge with (non-live)
                const existingIndex = filteredPrev.findIndex(item => {
                    if (item.isLive) return false; // Don't merge with live items here
                    if (item.source !== source || item.instanceId !== instanceId) return false; // Must be same source/instance

                    const itemMatch = String(item.NowPlayingItemId || item.ItemId || item.itemId) === String(itemId)
                    const userMatch = String(item.UserId || item.UserName || item.userName || item.embyUserId) === String(userId)
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
                        if (a.isLive && !b.isLive) return -1;
                        if (!a.isLive && b.isLive) return 1;

                        // For live sessions, sort by start time (fixed) to avoid jumping
                        if (a.isLive && b.isLive) {
                            const startA = new Date(a.startTime || a.startedAt || 0).getTime();
                            const startB = new Date(b.startTime || b.startedAt || 0).getTime();
                            return startA - startB; // Oldest live session first
                        }

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
                    mediaType: newLog.itemType === 'Episode' ? 'tv' : 'movie',
                    instanceId: newLog.instanceId || data.instanceId // Ensure instanceId is preserved
                }
                    return [newItem, ...filteredPrev].sort((a, b) => {
                        if (a.isLive && !b.isLive) return -1;
                        if (!a.isLive && b.isLive) return 1;

                        // For live sessions, sort by start time (fixed) to avoid jumping
                        if (a.isLive && b.isLive) {
                            const startA = new Date(a.startTime || a.startedAt || 0).getTime();
                            const startB = new Date(b.startTime || b.startedAt || 0).getTime();
                            return startA - startB; // Oldest live session first
                        }

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
    }, [instanceId, filteredInstanceIds, instanceTypes])

    // Memoize and process history items to avoid heavy logic in render
    const processedHistory = React.useMemo(() => {
        return history
            .filter((item: any) => {
                // Strict source filtering
                if (filteredInstanceIds && filteredInstanceIds.length > 0) {
                    return filteredInstanceIds.includes(item.instanceId);
                }
                if (filteredInstanceIds !== undefined && Array.isArray(filteredInstanceIds) && filteredInstanceIds.length === 0) {
                    return false;
                }
                if (instanceId) {
                    return item.instanceId === instanceId;
                }
                return true;
            })
            .slice(0, 50)
            .map((item: any) => {
                const mediaInfo = typeof item.mediaInfo === 'string' ? JSON.parse(item.mediaInfo) : (item.mediaInfo || {});
                
                const itemType = item.itemType || item.ItemType || item.Type || (item.mediaType === 'tv' ? 'Episode' : 'Movie');
                const isSeries = itemType === 'Episode' || itemType === 'Series' || itemType === 'tv' || item.mediaType === 'tv' || 
                                 !!item.SeriesName || !!mediaInfo.seriesName;
                 
                let displayName = item.itemName || item.Name || item.NowPlayingItemName || 'Inconnu';
                let subName = null;

                const seriesName = item.SeriesName || mediaInfo.seriesName || (isSeries && displayName.includes(' : ') ? displayName.split(' : ')[0] : null);
                const s = item.ParentIndexNumber !== undefined ? item.ParentIndexNumber : mediaInfo.seasonIndex;
                const e = item.IndexNumber !== undefined ? item.IndexNumber : mediaInfo.episodeIndex;

                if (isSeries) {
                    if (!seriesName && displayName.includes(' : ')) {
                        const parts = displayName.split(' : ');
                        subName = parts.slice(1).join(' : ');
                        displayName = parts[0];
                    } else if (seriesName && seriesName !== displayName) {
                        subName = displayName;
                        displayName = seriesName;
                    } else if (item.NowPlayingItemName && item.NowPlayingItemName !== displayName) {
                        subName = item.NowPlayingItemName;
                    }

                    if (!subName && !seriesName && (s !== undefined || e !== undefined)) {
                        subName = displayName;
                        displayName = 'Série inconnue';
                    }

                    if (subName && (s !== undefined || e !== undefined)) {
                        const seasonStr = s !== undefined ? (s < 10 ? `0${s}` : s) : '??';
                        const episodeStr = e !== undefined ? (e < 10 ? `0${e}` : e) : '??';
                        subName = `S${seasonStr}E${episodeStr} • ${subName}`;
                    }
                }

                const itemId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.itemId;
                const date = new Date(item.ActivityDateInserted || item.DateCreated || item.endTime || item.startTime);
                const duration = item.PlaybackDuration || item.playDuration || 0;
                const isLive = item.isLive === true;

                return {
                    ...item,
                    displayName,
                    subName,
                    seasonIndex: s,
                    episodeIndex: e,
                    mediaInfo,
                    isSeries,
                    itemId,
                    date,
                    duration,
                    isLive
                };
            });
    }, [history, instanceId, filteredInstanceIds]);

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
                        {processedHistory.map((item: any, idx) => {
                            const { displayName, subName, isLive, itemId, date, duration, isSeries } = item;
                            const stableKey = isLive && item.sessionId 
                                ? `live-${item.sessionId}` 
                                : `${itemId}-${date.getTime()}-${item.id || idx}`;

                            return (
                                <tr key={stableKey} className={`hover:bg-blue-500/5 transition-colors group ${isLive ? 'bg-blue-500/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-10 w-7 flex-shrink-0 overflow-hidden rounded bg-gray-900 border border-gray-700/50">
                                                {itemId ? (
                                                    <EmbyImage 
                                                        itemId={itemId} 
                                                        alt={displayName} 
                                                        itemName={displayName}
                                                        instanceId={item.instanceId || instanceId} 
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
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                                                        {displayName}
                                                    </span>
                                                    {isLive && (
                                                        <span className="text-[9px] px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse font-bold uppercase tracking-wider">
                                                            En direct
                                                        </span>
                                                    )}
                                                    {item.source && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                            item.source === 'plex' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                            item.source === 'jellyfin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                            'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        }`}>
                                                            {item.source}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
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
