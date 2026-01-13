import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmbyService } from '@/lib/services/emby';
import { PlexService } from '@/lib/services/plex';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
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
        } else if (source === 'jellyfin') {
            if (!user.instance.jellyfinUrl || !user.instance.jellyfinApiKey) {
                return NextResponse.json({ error: 'Jellyfin not configured' }, { status: 400 });
            }

            console.log(`[SyncPlugin] Syncing from Jellyfin (${user.instance.jellyfinUrl})...`);
            const jellyfin = new EmbyService(user.instance.jellyfinUrl, user.instance.jellyfinApiKey);
            let history;
            try {
                // Jellyfin/Emby Playback Reporting plugin endpoint
                const response = await (jellyfin as any).axios.get('/PlaybackReporting/Report', {
                    params: {
                        pageSize: 2000,
                        sortOrder: 'Descending',
                        sortBy: 'DateCreated'
                    }
                });
                history = response.data?.Items;
                console.log(`[SyncPlugin] Got ${history?.length || 0} items from Jellyfin`);
            } catch (err: any) {
                console.error(`[SyncPlugin] Jellyfin PlaybackReporting failed:`, err.message);
                return NextResponse.json({ error: `Jellyfin plugin error: ${err.message}` }, { status: 500 });
            }

            if (!history || !Array.isArray(history)) {
                return NextResponse.json({ error: 'Playback Reporting plugin not found or empty on Jellyfin' }, { status: 500 });
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

                    const exists = await (prisma as any).embyActivityLog.findFirst({
                        where: {
                            instanceId: user.instance.id,
                            source: 'jellyfin',
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
                                source: 'jellyfin',
                                embyUserId,
                                userName: item.UserName || 'Jellyfin User',
                                itemId,
                                itemName,
                                itemType,
                                startTime,
                                endTime: new Date(startTime.getTime() + playDuration * 1000),
                                playDuration,
                                client: item.Client || 'Jellyfin',
                                device: item.DeviceName || 'Jellyfin Device',
                                mediaInfo: JSON.stringify({
                                    pluginSynced: true,
                                    seriesName: item.SeriesName,
                                    seasonName: item.SeasonName
                                })
                            }
                        });
                        syncedCount++;
                    }
                } catch (itemErr: any) {
                    console.error(`[SyncPlugin] Error processing Jellyfin item:`, itemErr.message);
                }
            }
        } else {
            // Emby
            let targetUrl = user.instance.embyUrl;
            let targetKey = user.instance.embyApiKey;

            console.log(`[SyncPlugin] Syncing from Emby (${targetUrl})...`);
            const emby = new EmbyService(targetUrl, targetKey);
            let history;
            try {
                const response = await (emby as any).axios.get('/PlaybackReporting/Report', {
                    params: {
                        pageSize: 2000,
                        sortOrder: 'Descending',
                        sortBy: 'DateCreated'
                    }
                });
                history = response.data?.Items;
                console.log(`[SyncPlugin] Got ${history?.length || 0} items from Emby`);
            } catch (err: any) {
                console.error(`[SyncPlugin] Emby PlaybackReporting failed:`, err.message);
                return NextResponse.json({ error: `Emby plugin error: ${err.message}` }, { status: 500 });
            }

            if (!history || !Array.isArray(history)) {
                return NextResponse.json({ error: 'Playback Reporting plugin not found or empty on Emby' }, { status: 500 });
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

                    const exists = await (prisma as any).embyActivityLog.findFirst({
                        where: {
                            instanceId: user.instance.id,
                            source: 'emby',
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
                                source: 'emby',
                                embyUserId,
                                userName: item.UserName || 'Emby User',
                                itemId,
                                itemName,
                                itemType,
                                startTime,
                                endTime: new Date(startTime.getTime() + playDuration * 1000),
                                playDuration,
                                client: item.Client || 'Emby',
                                device: item.DeviceName || 'Emby Device',
                                mediaInfo: JSON.stringify({
                                    pluginSynced: true,
                                    seriesName: item.SeriesName,
                                    seasonName: item.SeasonName
                                })
                            }
                        });
                        syncedCount++;
                    }
                } catch (itemErr: any) {
                    console.error(`[SyncPlugin] Error processing Emby item:`, itemErr.message);
                }
            }
        }

        return NextResponse.json({ message: 'Sync successful', syncedCount });

    } catch (error: any) {
        console.error('Plugin sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
