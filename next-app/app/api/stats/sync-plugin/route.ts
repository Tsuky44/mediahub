import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { defineAbilityFor } from '@/lib/ability';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { EmbyService } from '@/lib/services/emby';
import { PlexService } from '@/lib/services/plex';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

// External API item shapes (asserted at runtime from JSON responses)
interface PlexHistoryItem {
    viewedAt: number;
    duration?: number;
    accountID?: string | number;
    ratingKey: string | number;
    title?: string;
    type?: string;
    user?: string;
    User?: { title?: string };
    player?: { product?: string; title?: string };
    grandparentTitle?: string;
    parentTitle?: string;
    index?: number;
    parentIndex?: number;
}

interface EmbyHistoryItem {
    DateCreated: string;
    PlayDuration?: number;
    UserId: string;
    ItemId: string;
    ItemType: string;
    ItemName?: string;
    UserName?: string;
    Client?: string;
    ClientName?: string;
    DeviceName?: string;
    SeriesName?: string;
    SeasonName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
}

interface JellyfinPlayedItem {
    Id: string;
    Name?: string;
    Type?: string;
    SeriesName?: string;
    SeasonName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    RunTimeTicks?: number;
    UserData?: {
        LastPlayedDate?: string;
    };
}


const BATCH_SIZE = 1000;
const SAFETY_LIMIT = 50000;

// Helper: Batch process and insert/update logs
async function batchProcess(source: string, items: Array<Record<string, unknown>>, userMap: Map<string, string>, localUserMap: Map<string, number>) {
    if (items.length === 0) return 0;

    // 1. Normalize items to WatchEvent schema
    const candidates = items.map(item => {
        let startTime: Date;
        let playDuration: number;
        let embyUserId: string;
        let itemId: string;
        let itemName: string;
        let itemType: string;
        let userName: string;
        let client: string;
        let device: string;
        let seriesName: string | null = null;
        let seasonName: string | null = null;
        let episodeNumber: number | null = null;
        let seasonNumber: number | null = null;

        if (source === 'plex') {
            const plexItem = item as unknown as PlexHistoryItem;
            startTime = new Date(plexItem.viewedAt * 1000);
            playDuration = Math.round((plexItem.duration || 1800000) / 1000);
            embyUserId = String(plexItem.accountID || 'unknown');
            itemId = String(plexItem.ratingKey);
            itemName = plexItem.title || 'Unknown';
            itemType = plexItem.type === 'episode' ? 'Episode' : (plexItem.type === 'movie' ? 'Movie' : 'Unknown');
            userName = plexItem.user || plexItem.User?.title || userMap.get(embyUserId) || 'Plex User';
            client = plexItem.player?.product || 'Plex';
            device = plexItem.player?.title || 'Plex Device';
            
            seriesName = plexItem.grandparentTitle || null;
            seasonName = plexItem.parentTitle || null;
            episodeNumber = plexItem.index || null;
            seasonNumber = plexItem.parentIndex || null;
        } else {
            // Emby/Jellyfin
            const embyItem = item as unknown as EmbyHistoryItem;
            startTime = new Date(embyItem.DateCreated);
            playDuration = Math.round(embyItem.PlayDuration || 0);
            embyUserId = String(embyItem.UserId);
            itemId = String(embyItem.ItemId);
            itemName = embyItem.ItemName || 'Unknown';
            itemType = embyItem.ItemType;
            userName = embyItem.UserName || 'Unknown';
            if (!userName || userName === 'Unknown' || userName.includes('User')) {
                userName = userMap.get(embyUserId) || userName || (source === 'emby' ? 'Emby User' : 'Jellyfin User');
            }
            client = embyItem.Client || embyItem.ClientName || (source === 'emby' ? 'Emby' : 'Jellyfin');
            device = embyItem.DeviceName || (source === 'emby' ? 'Emby Device' : 'Jellyfin Device');
            
            seriesName = embyItem.SeriesName || null;
            seasonName = embyItem.SeasonName || null;
            // Emby usually provides IndexNumber and ParentIndexNumber but logic might vary
            // Assuming standard Emby structure if available, otherwise null
            episodeNumber = embyItem.IndexNumber || null;
            seasonNumber = embyItem.ParentIndexNumber || null;
        }

        // Try to link to local user
        // For Plex, embyUserId is the Plex ID (integer usually).
        // For Emby/Jellyfin, it's a GUID.
        // The localUserMap keys should match these IDs if they were stored correctly in User table.
        const userId = localUserMap.get(embyUserId) || null;

        return {
            userId,
            embyUserId, // This stores the external ID (Plex/Emby/Jellyfin ID)
            userName,
            itemId,
            itemName,
            itemType,
            playedAt: startTime,
            durationMinutes: Math.round(playDuration / 60),
            client,
            device,
            seriesName,
            seasonName,
            episodeNumber,
            // Additional fields
            plays: 1
        };
    }).filter(c => c.durationMinutes > 0); // Filter very short plays (< 1 min)

    if (candidates.length === 0) return 0;

    // 2. Fetch existing records in time range
    const startTimes = candidates.map(c => c.playedAt.getTime());
    const minTime = new Date(Math.min(...startTimes) - 10000); // +/- 10s buffer
    const maxTime = new Date(Math.max(...startTimes) + 10000);

    const existing = await prisma.watchEvent.findMany({
        where: {
            playedAt: { gte: minTime, lte: maxTime }
        },
        select: {
            id: true,
            embyUserId: true,
            itemId: true,
            playedAt: true,
            userName: true
        }
    });

    const toCreate: Prisma.WatchEventCreateManyInput[] = [];
    const toUpdate: Array<{ id: number; userName: string }> = [];

    // 3. Filter duplicates and identify updates
    for (const cand of candidates) {
        // Fuzzy match: same user, same item, similar time (+/- 5s)
        const match = existing.find(e => 
            e.embyUserId === cand.embyUserId &&
            e.itemId === cand.itemId &&
            Math.abs(e.playedAt.getTime() - cand.playedAt.getTime()) <= 5000 
        );

        if (!match) {
            toCreate.push(cand);
        } else if (
            (match.userName === 'Plex User' || match.userName === 'Unknown' || (match.userName && match.userName.includes('User'))) && 
            cand.userName && !cand.userName.includes('User') && cand.userName !== 'Unknown'
        ) {
            toUpdate.push({ id: match.id, userName: cand.userName });
        }
    }

    // 4. Execute DB writes (Batched)
    let createdCount = 0;
    if (toCreate.length > 0) {
        // Chunk to avoid SQLite limits
        const chunkSize = 100;
        for (let i = 0; i < toCreate.length; i += chunkSize) {
            const batch = toCreate.slice(i, i + chunkSize);
            await prisma.watchEvent.createMany({ data: batch });
            createdCount += batch.length;
        }
    }

    // Updates are rare, sequential is fine
    for (const update of toUpdate) {
        await prisma.watchEvent.update({
            where: { id: update.id },
            data: { userName: update.userName }
        });
    }

    return createdCount;
}

async function syncPlex(settings: Array<Record<string, unknown>>, getSetting: (k: string) => string | null | undefined, localUserMap: Map<string, number>) {
    const plexUrl = getSetting('plex_url');
    const plexToken = getSetting('plex_token');
    if (!plexUrl || !plexToken) throw new Error('Plex not configured');

    log(`[SyncPlugin] Syncing from Plex (${plexUrl})...`);
    const plex = new PlexService(plexUrl, plexToken);
    
    // Map users (remote Plex users)
    let userMap = new Map<string, string>();
    try {
        const plexUsers = await plex.getUsers();
        userMap = new Map(plexUsers.map((u: Record<string, unknown>) => [String(u.Id), String(u.Name)]));
    } catch (e) { warn('Failed to fetch Plex users', e); }

    let syncedCount = 0;
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;

    // Sync Recent
    while (hasMore) {
        const batch = await plex.getHistory(BATCH_SIZE, offset, 'viewedAt:desc');
        if (!batch || batch.length === 0) {
            hasMore = false;
        } else {
            syncedCount += await batchProcess('plex', batch, userMap, localUserMap);
            totalFetched += batch.length;
            offset += BATCH_SIZE;
            
            if (totalFetched >= SAFETY_LIMIT || batch.length < BATCH_SIZE) hasMore = false;
        }
    }

    // Sync Oldest (to ensure coverage)
    try {
        const oldestBatch = await plex.getHistory(BATCH_SIZE, 0, 'viewedAt:asc');
        if (oldestBatch && oldestBatch.length > 0) {
            syncedCount += await batchProcess('plex', oldestBatch, userMap, localUserMap);
        }
    } catch (e) { warn('Plex oldest sync failed', e); }

    return syncedCount;
}

async function syncEmbyLike(source: 'emby' | 'jellyfin', settings: Array<Record<string, unknown>>, getSetting: (k: string) => string | null | undefined, localUserMap: Map<string, number>) {
    const isEmby = source === 'emby';
    const targetUrl = isEmby ? getSetting('emby_url') : getSetting('jellyfin_url');
    const targetKey = isEmby ? getSetting('emby_api_key') : getSetting('jellyfin_api_key');
    
    if (!targetUrl || !targetKey) throw new Error(`${source} not configured`);

    log(`[SyncPlugin] Syncing from ${source} (${targetUrl})...`);
    const service = new EmbyService(targetUrl, targetKey);
    
    let userMap = new Map<string, string>();
    try {
        const users = await service.getUsers();
        userMap = new Map(users.map((u: Record<string, unknown>) => [String(u.Id), String(u.Name)]));
    } catch (e) { warn(`Failed to fetch ${source} users`, e); }

    let syncedCount = 0;
    let startIndex = 0;
    let hasMore = true;
    let totalFetched = 0;

    // Try PlaybackReporting first
    try {
        while (hasMore) {
            const data = await service.getPlaybackReport({
                startIndex,
                pageSize: BATCH_SIZE,
                sortOrder: 'Descending',
                sortBy: 'DateCreated'
            });
            
            const items = data?.Items || [];
            if (items.length === 0) {
                hasMore = false;
            } else {
                syncedCount += await batchProcess(source, items, userMap, localUserMap);
                totalFetched += items.length;
                startIndex += BATCH_SIZE;
                
                if (totalFetched >= SAFETY_LIMIT || items.length < BATCH_SIZE) hasMore = false;
            }
        }
    } catch (err) {
        error(`[SyncPlugin] ${source} PlaybackReporting failed:`, (err as Error).message);
        
        // Fallback for Emby: Custom Query (Statistics Plugin / Direct DB)
        if (isEmby && syncedCount === 0) {
             log(`[SyncPlugin] Attempting fallback via custom query...`);
             try {
                 // Fetch more items for fallback since it's a one-shot query usually
                 const query = `SELECT rowid, DateCreated, UserId, ItemId, ItemType, ItemName, PlaybackMethod, ClientName, DeviceName, PlayDuration FROM PlaybackActivity ORDER BY DateCreated DESC LIMIT ${Math.min(SAFETY_LIMIT, 10000)}`;
                 const response = await service.getCustomQuery(query);
                 
                 if (response && response.results) {
                     const history = response.results.map((item: Array<unknown>) => ({
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
                     syncedCount += await batchProcess(source, history, userMap, localUserMap);
                 }
             } catch (fbErr) {
                 throw new Error(`${(err as Error).message} | Fallback: ${(fbErr as Error).message}`);
             }
        } 
        // Fallback for Jellyfin: User Played Items (Standard API)
        else if (!isEmby && syncedCount === 0) {
             log(`[SyncPlugin] Attempting Jellyfin fallback via UserPlayedItems...`);
             try {
                 const users = await service.getUsers();
                 for (const user of users) {
                     // Limit to 500 recent items per user to avoid timeouts
                     const playedItems = await service.getUserPlayedItems(user.Id);
                     
                     if (playedItems && playedItems.Items) {
                         const history = playedItems.Items.map((item: Record<string, unknown>) => {
                             const ji = item as unknown as JellyfinPlayedItem;
                             return {
                                 DateCreated: ji.UserData?.LastPlayedDate || new Date().toISOString(),
                                 UserId: user.Id,
                                 ItemId: ji.Id,
                                 ItemType: ji.Type,
                                 ItemName: ji.Name,
                                 PlaybackMethod: 'Unknown',
                                 Client: 'Jellyfin',
                                 DeviceName: 'Unknown',
                                 PlayDuration: ji.RunTimeTicks ? Math.round(ji.RunTimeTicks / 10000000) : 0,
                                 UserName: user.Name,
                                 SeriesName: ji.SeriesName,
                                 SeasonName: ji.SeasonName,
                                 IndexNumber: ji.IndexNumber,
                                 ParentIndexNumber: ji.ParentIndexNumber
                             };
                         });
                         
                         syncedCount += await batchProcess(source, history, userMap, localUserMap);
                     }
                 }
             } catch (fbErr) {
                 throw new Error(`${(err as Error).message} | Jellyfin Fallback: ${(fbErr as Error).message}`);
             }
        } else {
            throw err;
        }
    }

    return syncedCount;
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role: string } | undefined;
    const ability = defineAbilityFor(user);
    const isAdmin = user?.role === 'admin';

    if (!session || (!isAdmin && !ability.can('import', 'Stats'))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const source = body.source || 'all';

        const settings = await prisma.setting.findMany({
            where: {
                key: { in: ['plex_url', 'plex_token', 'emby_url', 'emby_api_key', 'jellyfin_url', 'jellyfin_api_key'] }
            }
        });
        const getSetting = (key: string) => settings.find(s => s.key === key)?.value;

        // Fetch local users to link
        const localUsers = await prisma.user.findMany({
            select: { id: true, plexUserId: true, embyUserId: true, jellyfinUserId: true }
        });
        
        // Map external IDs to local user ID
        const localUserMap = new Map<string, number>();
        for (const u of localUsers) {
            if (u.plexUserId) localUserMap.set(u.plexUserId, u.id);
            if (u.embyUserId) localUserMap.set(u.embyUserId, u.id);
            if (u.jellyfinUserId) localUserMap.set(u.jellyfinUserId, u.id);
        }

        let totalSynced = 0;
        const errors: string[] = [];

        // Run syncs (sequentially to avoid massive DB locking if run in parallel on SQLite)
        if (source === 'all' || source === 'plex') {
            try {
                totalSynced += await syncPlex(settings, getSetting, localUserMap);
            } catch (e) {
                if (source === 'plex') errors.push((e as Error).message);
                error('[SyncPlugin] Plex error:', e);
            }
        }

        if (source === 'all' || source === 'emby') {
            try {
                totalSynced += await syncEmbyLike('emby', settings, getSetting, localUserMap);
            } catch (e) {
                if (source === 'emby') errors.push((e as Error).message);
                error('[SyncPlugin] Emby error:', e);
            }
        }

        if (source === 'all' || source === 'jellyfin') {
            try {
                totalSynced += await syncEmbyLike('jellyfin', settings, getSetting, localUserMap);
            } catch (e) {
                // Only error if explicitly requested or if it's the only source? 
                // For 'all', we might ignore if not configured.
                if (source === 'jellyfin') errors.push((e as Error).message);
                else if ((e as Error).message.includes('not configured')) { /* ignore */ }
                else error('[SyncPlugin] Jellyfin error:', e);
            }
        }

        if (errors.length > 0 && totalSynced === 0) {
            return NextResponse.json({ error: errors.join(', ') }, { status: 500 });
        }

        return NextResponse.json({ 
            message: `Synchronisation terminée. ${totalSynced} nouveaux éléments importés.`, 
            syncedCount: totalSynced,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err) {
        error('Plugin sync error:', err);
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
}
