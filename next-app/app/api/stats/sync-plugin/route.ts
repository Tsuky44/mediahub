import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmbyService } from '@/lib/services/emby';
import { PlexService } from '@/lib/services/plex';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any
    const permissions = user?.permissions || []
    const isAdmin = user?.role === 'admin'
    const canView = isAdmin || permissions.includes('stats.view')

    if (!session || !canView) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        let source = body.source;
        
        // Default to emby if not specified or "all"
        if (!source || source === 'all') source = 'emby';

        const user = await (prisma as any).user.findUnique({
            where: { id: parseInt(session.user.id) },
            include: { instance: true }
        });

        if (!user || !user.instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        let syncedCount = 0;

        if (source === 'plex') {
            if (!user.instance.plexUrl || !user.instance.plexToken) {
                return NextResponse.json({ error: 'Plex not configured' }, { status: 400 });
            }

            console.log(`[SyncPlugin] Syncing from Plex (${user.instance.plexUrl})...`);
            const plex = new PlexService(user.instance.plexUrl, user.instance.plexToken);
            
            // Fetch users to map accountID to names
             const plexUsers = await plex.getUsers();
             const userMap = new Map(plexUsers.map((u: any) => [u.Id, u.Name]));
             console.log(`[SyncPlugin] Loaded ${userMap.size} Plex users for mapping`);

             let history: any[] = [];
             let offset = 0;
             const limit = 500;
             let hasMore = true;
             let totalFetched = 0;

             console.log(`[SyncPlugin] Starting exhaustive Plex history sync (recent first)...`);

             while (hasMore) {
                 try {
                     const batch = await plex.getHistory(limit, offset, 'viewedAt:desc');
                     if (!batch || batch.length === 0) {
                         hasMore = false;
                     } else {
                         history = [...history, ...batch];
                         totalFetched += batch.length;
                         offset += limit;
                         
                         console.log(`[SyncPlugin] Fetched ${totalFetched} items from Plex (offset: ${offset})...`);
                         
                         // Safety break to avoid infinite loops or massive memory usage
                         if (totalFetched >= 20000) {
                             console.warn(`[SyncPlugin] Reached safety limit of 20,000 items. Stopping descending sync.`);
                             hasMore = false;
                         }
                         if (batch.length < limit) hasMore = false;
                     }
                 } catch (err: any) {
                     console.error(`[SyncPlugin] Plex getHistory batch failed:`, err.message);
                     hasMore = false;
                 }
             }

             // Also fetch oldest items to ensure we have the beginning
             console.log(`[SyncPlugin] Fetching oldest items from Plex (first things seen)...`);
             try {
                const oldestBatch = await plex.getHistory(500, 0, 'viewedAt:asc');
                if (oldestBatch && oldestBatch.length > 0) {
                    console.log(`[SyncPlugin] Fetched ${oldestBatch.length} oldest items`);
                    history = [...history, ...oldestBatch];
                }
             } catch (err: any) {
                console.error(`[SyncPlugin] Plex getHistory (asc) failed:`, err.message);
             }

            console.log(`[SyncPlugin] Total items to process: ${history.length}`);

            for (const item of history) {
                try {
                    const startTime = new Date(item.viewedAt * 1000);
                    // Plex history items might not have duration, default to 30 mins (1800000ms)
                    const playDuration = Math.round((item.duration || 1800000) / 1000); 
                    
                    const embyUserId = String(item.accountID || 'unknown');
                    const itemId = String(item.ratingKey);
                    const itemName = item.title || 'Unknown';
                    
                    // Try to get user name from various possible fields in Plex history metadata
                    // Fallback to userMap if we have the accountID
                    const plexUserName = item.user || item.User?.title || userMap.get(embyUserId) || 'Plex User';
                    
                    const itemType = item.type === 'episode' ? 'Episode' : (item.type === 'movie' ? 'Movie' : 'Unknown');

                    const exists = await (prisma as any).embyActivityLog.findFirst({
                        where: {
                            instanceId: user.instance.id,
                            source: 'plex',
                            embyUserId,
                            itemId,
                            startTime: {
                                gte: new Date(startTime.getTime() - 5000),
                                lte: new Date(startTime.getTime() + 5000)
                            }
                        }
                    });

                    if (!exists) {
                        await (prisma as any).embyActivityLog.create({
                            data: {
                                instanceId: user.instance.id,
                                source: 'plex',
                                embyUserId,
                                userName: plexUserName,
                                itemId,
                                itemName,
                                itemType,
                                startTime,
                                endTime: new Date(startTime.getTime() + playDuration * 1000),
                                playDuration,
                                totalDuration: item.duration ? BigInt(item.duration) * BigInt(10000) : null,
                                client: item.player?.product || 'Plex',
                                device: item.player?.title || 'Plex Device',
                                mediaInfo: JSON.stringify({
                                    pluginSynced: true,
                                    seriesName: item.grandparentTitle,
                                    seasonName: item.parentTitle,
                                    episodeIndex: item.index,
                                    seasonIndex: item.parentIndex
                                })
                            }
                        });
                        syncedCount++;
                    } else if (exists.userName === 'Plex User' && plexUserName !== 'Plex User') {
                        // Update the user name if it was previously unknown
                        await (prisma as any).embyActivityLog.update({
                            where: { id: exists.id },
                            data: { userName: plexUserName }
                        });
                    }
                } catch (itemErr: any) {
                    console.error(`[SyncPlugin] Error processing Plex item ${item?.ratingKey}:`, itemErr.message);
                }
            }
        } else if (source === 'jellyfin' || source === 'emby') {
            const isEmby = source === 'emby';
            const targetUrl = isEmby ? user.instance.embyUrl : user.instance.jellyfinUrl;
            const targetKey = isEmby ? user.instance.embyApiKey : user.instance.jellyfinApiKey;

            if (!targetUrl || !targetKey) {
                return NextResponse.json({ error: `${source} not configured` }, { status: 400 });
            }

            console.log(`[SyncPlugin] Exhaustive sync from ${source} (${targetUrl})...`);
            const service = new EmbyService(targetUrl, targetKey);
            
            // Fetch users to map UserId to Name
            const embyUsers = await service.getUsers();
            const userMap = new Map(embyUsers.map((u: any) => [String(u.Id), u.Name]));
            console.log(`[SyncPlugin] Loaded ${userMap.size} ${source} users for mapping`);

            let history: any[] = [];
            let startIndex = 0;
            const pageSize = 2000;
            let hasMore = true;
            let totalFetched = 0;

            try {
                while (hasMore) {
                    const data = await service.getPlaybackReport({
                        startIndex,
                        pageSize,
                        sortOrder: 'Descending',
                        sortBy: 'DateCreated'
                    });

                    const items = data?.Items || [];
                    if (items.length === 0) {
                        hasMore = false;
                    } else {
                        history = [...history, ...items];
                        totalFetched += items.length;
                        startIndex += pageSize;
                        console.log(`[SyncPlugin] Fetched ${totalFetched} items from ${source}...`);
                        
                        if (items.length < pageSize || totalFetched >= 50000) {
                            hasMore = false;
                        }
                    }
                }
            } catch (err: any) {
                console.error(`[SyncPlugin] ${source} PlaybackReporting loop failed:`, err.message);
                
                // Final fallback for Emby: try custom query via Statistics plugin
                if (isEmby && history.length === 0) {
                    console.log(`[SyncPlugin] Attempting final fallback via Statistics plugin custom query...`);
                    try {
                        const query = `SELECT rowid, DateCreated, UserId, ItemId, ItemType, ItemName, PlaybackMethod, ClientName, DeviceName, PlayDuration FROM PlaybackActivity ORDER BY DateCreated DESC LIMIT 10000`;
                        const response = await service.getCustomQuery(query);
                        if (response && response.results) {
                            history = response.results.map((item: any[]) => ({
                                DateCreated: item[1],
                                UserId: item[2],
                                ItemId: item[3],
                                ItemType: item[4],
                                ItemName: item[5],
                                PlaybackMethod: item[6],
                                Client: item[7],
                                DeviceName: item[8],
                                PlayDuration: item[9],
                                UserName: userMap.get(String(item[2])) || 'Unknown'
                            }));
                            console.log(`[SyncPlugin] Fallback got ${history.length} items`);
                        }
                    } catch (fallbackErr: any) {
                        console.error(`[SyncPlugin] All fallbacks failed:`, fallbackErr.message);
                        return NextResponse.json({ error: `${source} plugin error: ${err.message}. Fallback also failed: ${fallbackErr.message}` }, { status: 500 });
                    }
                } else if (history.length === 0) {
                    return NextResponse.json({ error: `${source} plugin error: ${err.message}` }, { status: 500 });
                }
            }

            if (!history || history.length === 0) {
                return NextResponse.json({ error: `No history found on ${source}` }, { status: 404 });
            }

            for (const item of history) {
                try {
                    const startTime = new Date(item.DateCreated);
                    const playDuration = Math.round(item.PlayDuration || 0);
                    
                    if (playDuration < 10) continue;

                    const embyUserId = String(item.UserId);
                    const itemId = String(item.ItemId);
                    const itemName = item.ItemName || 'Unknown';
                    const itemType = item.ItemType;

                    // Resolve user name
                    let resolvedUserName = item.UserName;
                    if (!resolvedUserName || resolvedUserName === 'Unknown' || resolvedUserName === 'Emby User' || resolvedUserName === 'Jellyfin User') {
                        resolvedUserName = userMap.get(embyUserId) || resolvedUserName || (isEmby ? 'Emby User' : 'Jellyfin User');
                    }

                    const exists = await (prisma as any).embyActivityLog.findFirst({
                        where: {
                            instanceId: user.instance.id,
                            source: source,
                            embyUserId,
                            itemId,
                            startTime: {
                                gte: new Date(startTime.getTime() - 5000),
                                lte: new Date(startTime.getTime() + 5000)
                            }
                        }
                    });

                    if (!exists) {
                        await (prisma as any).embyActivityLog.create({
                            data: {
                                instanceId: user.instance.id,
                                source: source,
                                embyUserId,
                                userName: resolvedUserName,
                                itemId,
                                itemName,
                                itemType,
                                startTime,
                                endTime: new Date(startTime.getTime() + playDuration * 1000),
                                playDuration,
                                client: item.Client || item.ClientName || (isEmby ? 'Emby' : 'Jellyfin'),
                                device: item.DeviceName || (isEmby ? 'Emby Device' : 'Jellyfin Device'),
                                mediaInfo: JSON.stringify({
                                    pluginSynced: true,
                                    seriesName: item.SeriesName,
                                    seasonName: item.SeasonName
                                })
                            }
                        });
                        syncedCount++;
                    } else if ((exists.userName === 'Unknown' || exists.userName === 'Emby User' || exists.userName === 'Jellyfin User') && resolvedUserName !== exists.userName) {
                        // Update the user name if it was previously unknown
                        await (prisma as any).embyActivityLog.update({
                            where: { id: exists.id },
                            data: { userName: resolvedUserName }
                        });
                    }
                } catch (itemErr: any) {
                    console.error(`[SyncPlugin] Error processing ${source} item:`, itemErr.message);
                }
            }
        }

        return NextResponse.json({ message: 'Sync successful', syncedCount });

    } catch (error: any) {
        console.error('Plugin sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
