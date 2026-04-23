'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, Film, Play, Activity, User, Monitor } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { io, Socket } from 'socket.io-client'
import { EmbyImage } from '@/components/EmbyImage'

interface RecentHistoryProps {
    initialHistory: any[]
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`
}

export function RecentHistory({ initialHistory }: RecentHistoryProps) {
    const [history, setHistory] = useState(initialHistory)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        // Update history when filters change, but we should rely on initialHistory prop update from parent mostly
        setHistory(initialHistory)
    }, [initialHistory])

    useEffect(() => {
        // Initialize socket connection
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        
        // In production, we use the rewrite rule in next.config.ts to proxy requests
        // through the main app domain to avoid Mixed Content issues (HTTPS -> HTTP).
        // In development, we connect directly to port 3005.
        let wsUrl = process.env.NEXT_PUBLIC_TRACKER_WS_URL;
        
        if (!wsUrl) {
            if (process.env.NODE_ENV === 'development') {
                wsUrl = `${protocol === 'wss' ? 'https' : 'http'}://${window.location.hostname}:3005`;
            } else {
                // Production: Use relative path to leverage Next.js rewrites
                // This connects to https://domain.com/socket.io/ which is proxied to http://tracker:3005/socket.io/
                wsUrl = undefined; // socket.io-client defaults to window.location
            }
        }

        const socket: Socket = io(wsUrl || undefined, {
            path: '/socket.io',
            transports: ['websocket', 'polling'], // Enable polling for better compatibility through proxies
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
            setIsConnected(false)
        })

        socket.on('session_removed', (data: { sessionId: string }) => {
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
                const sessionsMap = new Map(data.map(s => [s.sessionId, s]));
                const activeSessionIds = new Set(data.map(s => s.sessionId));
                let hasChanged = false;
                
                // 1. Update existing items
                const next = prev.map(item => {
                    // If item is marked as live
                    if (item.isLive) {
                        // If no longer active, convert to non-live
                        if (item.sessionId && !activeSessionIds.has(item.sessionId)) {
                            hasChanged = true;
                            return { ...item, isLive: false };
                        }
                        
                        // If still active, update with latest data
                        if (item.sessionId && sessionsMap.has(item.sessionId)) {
                            const session = sessionsMap.get(item.sessionId);
                            // Update fields if changed
                            const newDuration = session.accumulatedDuration || 0;
                            
                            // Check if item details changed
                            const detailsChanged = 
                                item.itemName !== session.itemName ||
                                item.SeriesName !== session.seriesName ||
                                item.ParentIndexNumber !== session.seasonIndex ||
                                item.IndexNumber !== session.episodeIndex;
                                
                            // Always update if duration changed significantly (>1s) or details changed
                            if (Math.abs((item.PlaybackDuration || 0) - newDuration) > 1 || detailsChanged) {
                                hasChanged = true;
                                return {
                                    ...item,
                                    PlaybackDuration: newDuration,
                                    itemName: session.itemName,
                                    SeriesName: session.seriesName || item.SeriesName,
                                    ParentIndexNumber: session.seasonIndex ?? item.ParentIndexNumber,
                                    IndexNumber: session.episodeIndex ?? item.IndexNumber,
                                    mediaInfo: {
                                        ...item.mediaInfo,
                                        ...session.mediaInfo
                                    }
                                };
                            }
                        }
                    }
                    return item;
                });
                
                // 2. Add new active sessions that are not in history yet
                const existingSessionIds = new Set(next.filter(i => i.isLive).map(i => i.sessionId));
                
                for (const session of data) {
                    if (!existingSessionIds.has(session.sessionId)) {
                        hasChanged = true;
                        // Create a new history item from the session
                        const newItem = {
                            id: `live-${session.sessionId}`,
                            sessionId: session.sessionId,
                            source: session.source,
                            userName: session.userName,
                            // Emby specific fields mapping
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
                            mediaInfo: session.mediaInfo || {}
                        };
                        
                        // Add to the beginning of the list
                        next.unshift(newItem);
                    }
                }
                
                if (hasChanged) {
                    // Re-sort to ensure live items are at top, sorted by start time
                    return next.sort((a, b) => {
                        if (a.isLive && !b.isLive) return -1;
                        if (!a.isLive && b.isLive) return 1;
                        
                        // For live sessions, sort by start time (newest first usually? Or oldest?)
                        // User screenshot shows live items at top.
                        if (a.isLive && b.isLive) {
                            const startA = new Date(a.startTime || a.startedAt || 0).getTime();
                            const startB = new Date(b.startTime || b.startedAt || 0).getTime();
                            return startB - startA; // Newest first
                        }

                        const dateA = new Date(a.ActivityDateInserted || a.DateCreated || a.endTime || a.startTime).getTime()
                        const dateB = new Date(b.ActivityDateInserted || b.DateCreated || b.endTime || b.startTime).getTime()
                        return dateB - dateA
                    });
                }
                
                return prev;
            });
        });

        socket.on('history_update', (data: { log: any }) => {
            const newLog = {
                ...data.log,
                source: data.log.source || 'emby'
            }
            
            setHistory(prev => {
                const itemId = newLog.itemId
                const userId = newLog.embyUserId || newLog.userName
                const source = newLog.source
                const date = new Date(newLog.startTime || newLog.endTime)
                
                // 1. Update or remove items for the same session/user
                let itemHandled = false;
                let newHistory = prev.map(item => {
                    const liveIdToRemove = newLog.sessionId ? `live-${newLog.sessionId}` : null;
                    
                    // Stricter session matching: must match sessionId
                    const isSameSession = (item.sessionId && newLog.sessionId && item.sessionId === newLog.sessionId) || 
                                         (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove));
                    
                    // Stricter user/item matching: must match source, item, and user
                    // We only allow this match if both items are Live and have valid IDs
                    const isSameUserItem = !!itemId && !!userId && 
                                          (item.source === source) && 
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
                    const isSameSession = (item.sessionId && newLog.sessionId && item.sessionId === newLog.sessionId) || 
                                         (liveIdToRemove && (item.id === liveIdToRemove || item.Id === liveIdToRemove));
                    
                    const isSameUserItem = !!itemId && !!userId && 
                                          (item.source === source) && 
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
                    if (item.source !== source) return false; // Must be same source

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
                    mediaType: newLog.itemType === 'Episode' ? 'tv' : 'movie'
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
    }, [])

    // Memoize and process history items to avoid heavy logic in render
    const processedHistory = React.useMemo(() => {
        return history
            .slice(0, 50)
            .map((item: any) => {
                const mediaInfo = typeof item.mediaInfo === 'string' ? JSON.parse(item.mediaInfo) : (item.mediaInfo || {});
                
                const itemType = item.itemType || item.ItemType || item.Type || (item.mediaType === 'tv' ? 'Episode' : 'Movie');
                const isSeries = itemType === 'Episode' || itemType === 'Series' || itemType === 'tv' || item.mediaType === 'tv' || 
                                 !!item.SeriesName || !!mediaInfo.seriesName;
                 
                let displayName = item.itemName || item.Name || item.NowPlayingItemName || 'Inconnu';
                let subName = null;

                let extractedSeriesName = null;
                if (isSeries) {
                    if (displayName.includes(' : ')) extractedSeriesName = displayName.split(' : ')[0];
                    else if (displayName.includes(' - s')) extractedSeriesName = displayName.split(' - s')[0];
                    else if (displayName.includes(' - S')) extractedSeriesName = displayName.split(' - S')[0];
                    else if (displayName.includes(' - ')) extractedSeriesName = displayName.split(' - ')[0];
                }

                const seriesName = item.seriesName || item.SeriesName || mediaInfo.seriesName || mediaInfo.SeriesName || extractedSeriesName;
                const s = item.seasonIndex ?? item.ParentIndexNumber ?? mediaInfo.seasonIndex ?? mediaInfo.ParentIndexNumber;
                const e = item.episodeIndex ?? item.IndexNumber ?? mediaInfo.episodeIndex ?? mediaInfo.IndexNumber;

                if (isSeries) {
                    let seString = '';
                    if (s !== undefined && e !== undefined) {
                        const seasonStr = s < 10 ? `0${s}` : s;
                        const episodeStr = e < 10 ? `0${e}` : e;
                        seString = `S${seasonStr}E${episodeStr}`;
                    }

                    if (seriesName) {
                        // Main title: Series Name - SxxExx - Episode Title
                        // Sub title: Date / Device info (handled later)
                        let episodeTitle = displayName;
                        
                        // Clean up episode title if it contains series name
                        if (episodeTitle.startsWith(seriesName + ' - ')) {
                            episodeTitle = episodeTitle.substring(seriesName.length + 3);
                        } else if (episodeTitle.startsWith(seriesName + ' : ')) {
                            episodeTitle = episodeTitle.substring(seriesName.length + 3);
                        } else if (episodeTitle === seriesName) {
                            episodeTitle = ''; // Just series name available
                        }

                        // Clean up SxxExx from episode title if present (to avoid duplication with seString)
                        // Regex for SxxExx or SxEx at start
                        const sxeRegex = /^S\d+E\d+\s*[-:•]?\s*/i;
                        if (sxeRegex.test(episodeTitle)) {
                             episodeTitle = episodeTitle.replace(sxeRegex, '');
                        }
                        // Regex for 1x01 or 1x1 at start
                        const numXNumRegex = /^\d+x\d+\s*[-:•]?\s*/i;
                        if (numXNumRegex.test(episodeTitle)) {
                             episodeTitle = episodeTitle.replace(numXNumRegex, '');
                        }

                        // Construct the full display name
                        displayName = seriesName;
                        
                        if (seString) {
                            displayName += ` - ${seString}`;
                        }
                        
                        if (episodeTitle) {
                            displayName += ` - ${episodeTitle}`;
                        }
                        
                        // subName will be empty or null as all info is in displayName
                        subName = null;
                    } else if (displayName.includes(' : ')) {
                        // Fallback split if no series name found but separator exists
                        const parts = displayName.split(' : ');
                        const inferredSeriesName = parts[0];
                        const episodePart = parts.slice(1).join(' : ');
                        
                        displayName = inferredSeriesName;
                        if (seString) displayName += ` - ${seString}`;
                        displayName += ` - ${episodePart}`;
                        subName = null;
                    } else {
                         // No series name, no separator. 
                         if (seString) {
                             displayName = `${seString} - ${displayName}`;
                         }
                         subName = null;
                    }
                }

                const itemId = item.imageItemId || item.NowPlayingItemId || item.ItemId || item.Id || item.itemId;
                const date = new Date(item.ActivityDateInserted || item.DateCreated || item.endTime || item.startTime);
                const duration = item.PlaybackDuration || item.playDuration || 0;
                const isLive = item.isLive === true;

                // Fallback for subName if we want to show something else?
                // The original code used subName for SxxExx. Now that's in displayName.
                // The table component renders subName below displayName.
                // If subName is null, it might render nothing or just date/device depending on layout.
                // Let's check how subName is used in the render.
                
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
    }, [history]);

    return (
        <div className="rounded-3xl bg-black/20 backdrop-blur-md p-6 shadow-2xl border border-white/5 ring-1 ring-white/5 transition-all duration-300 hover:bg-white/[0.03] hover:border-indigo-500/20 hover:shadow-indigo-500/10">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <Clock className="h-5 w-5 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-wide">Historique Récent</h3>
                </div>
                {isConnected && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">En direct</span>
                    </div>
                )}
            </div>
            
            <div className="space-y-3">
                {processedHistory.length > 0 ? (
                    processedHistory.map((item: any, idx) => {
                        const { displayName, subName, isLive, itemId, date, duration, isSeries } = item;
                        const stableKey = isLive && item.sessionId 
                            ? `live-${item.sessionId}` 
                            : `${itemId}-${date.getTime()}-${item.id || idx}`;

                        const seasonNum = item.seasonIndex ?? item.ParentIndexNumber;
                        const episodeNum = item.episodeIndex ?? item.IndexNumber;

                        const tmdbId = item.tmdbId || item.TmdbId || item.mediaInfo?.tmdbId || item.mediaInfo?.ProviderIds?.Tmdb;

                        const searchName = isSeries 
                            ? (item.SeriesName || item.seriesName || item.mediaInfo?.seriesName || displayName) 
                            : (item.Name || item.itemName || displayName);

                        let href = null;
                        if (tmdbId) {
                            href = `/dashboard/media/${tmdbId}?type=${isSeries ? 'tv' : 'movie'}${isSeries && seasonNum !== undefined && episodeNum !== undefined ? `&season=${seasonNum}&episode=${episodeNum}` : ''}`;
                        } else if (itemId) {
                            href = `/dashboard/media/${itemId}?type=${isSeries ? 'tv' : 'movie'}&source=${item.Source || 'emby'}&name=${encodeURIComponent(searchName || 'Unknown')}${isSeries && seasonNum !== undefined && episodeNum !== undefined ? `&season=${seasonNum}&episode=${episodeNum}` : ''}`;
                        }

                        const Content = (
                            <div 
                                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:scale-[1.01] ${
                                    isLive 
                                        ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/40 hover:border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                        : 'bg-black/20 border-white/5 hover:bg-white/10 hover:border-indigo-500/30'
                                }`}
                            >
                                {/* Live Indicator Bar */}
                                {isLive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-pulse"></div>
                                )}

                                {/* Background Gradient on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

                                <div className="flex items-center gap-4 p-4 relative z-10">
                                    {/* Image / Icon */}
                                    <div className={`relative shrink-0 overflow-hidden rounded-xl border shadow-lg group-hover:scale-105 transition-transform duration-300 w-16 h-16 bg-gray-900 ${
                                        isLive ? 'border-indigo-500/30 shadow-indigo-500/20' : 'border-white/10'
                                    }`}>
                                        {itemId ? (
                                            <EmbyImage 
                                                itemId={itemId} 
                                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                alt={displayName}
                                                itemName={displayName}
                                                tmdbId={item.tmdbId}
                                                mediaType={item.mediaType || (isSeries ? 'tv' : 'movie')}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-800 text-gray-600">
                                                <Film className="h-8 w-8 opacity-50" />
                                            </div>
                                        )}
                                        {/* Play Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                                            <Play className="h-6 w-6 text-white fill-current drop-shadow-lg scale-0 group-hover:scale-100 transition-transform duration-300 delay-75" />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex flex-1 flex-col justify-center min-w-0 gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white truncate text-base group-hover:text-indigo-400 transition-colors tracking-tight leading-tight">
                                                {displayName}
                                            </h4>
                                            {isLive && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500 text-white animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                                                    LIVE
                                                </span>
                                            )}
                                        </div>
                                        
                                        {subName && (
                                            <span className="text-xs font-medium text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                                                {subName}
                                            </span>
                                        )}
                                        
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-2">
                                            <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                                                <User className="h-3 w-3 text-indigo-400" />
                                                <span className="font-medium text-gray-300 truncate max-w-[100px]">{item.userName || item.UserName}</span>
                                            </div>

                                            {(item.Client || item.client || item.DeviceName || item.device) && (
                                                <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                                                    <Monitor className="h-3 w-3 text-blue-400" />
                                                    <span className="font-medium text-gray-300 truncate max-w-[150px]" title={`${item.Client || item.client || ''} ${item.DeviceName || item.device ? `(${item.DeviceName || item.device})` : ''}`}>
                                                        {(() => {
                                                            const client = item.Client || item.client;
                                                            const device = item.DeviceName || item.device;
                                                            if (client && device && client !== device && !client.includes(device)) return `${client} (${device})`;
                                                            return client || device;
                                                        })()}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                <Activity className="h-3 w-3 text-emerald-400" />
                                                <span className="font-medium tabular-nums text-gray-400 group-hover:text-gray-300 transition-colors">{formatDuration(duration)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div className="shrink-0 flex flex-col items-end gap-1">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border transition-all duration-300 ${
                                            isLive 
                                                ? 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20' 
                                                : 'text-gray-500 bg-gray-900/50 border-white/5 group-hover:text-indigo-300 group-hover:border-indigo-500/30'
                                        }`}>
                                            {isLive ? 'En cours' : formatDistanceToNow(date, { addSuffix: true, locale: fr })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );

                        return href ? (
                            <Link key={stableKey} href={href} className="block">
                                {Content}
                            </Link>
                        ) : (
                            <div key={stableKey}>
                                {Content}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl bg-black/20 border border-white/5 border-dashed group hover:border-indigo-500/30 transition-all duration-300 hover:bg-white/[0.02]">
                        <div className="p-5 bg-black/40 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/5 shadow-inner">
                            <Clock className="h-10 w-10 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <p className="text-lg font-bold text-gray-300">Aucun historique récent</p>
                        <p className="text-sm text-gray-500 mt-2 max-w-[250px] font-medium">L'activité apparaîtra ici une fois que du contenu sera visionné</p>
                    </div>
                )}
            </div>
        </div>
    )
}
