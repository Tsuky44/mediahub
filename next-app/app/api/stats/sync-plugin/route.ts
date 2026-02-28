import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { defineAbilityFor } from '@/lib/ability';
import { prisma } from '@/lib/prisma';
import { EmbyService } from '@/lib/services/emby';
import { PlexService } from '@/lib/services/plex';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


const BATCH_SIZE = 1000;
const SAFETY_LIMIT = 50000;

// Helper: Batch process and insert/update logs
async function batchProcess(source: string, items: any[], userMap: Map<string, string>) {
    if (items.length === 0) return 0;

    // 1. Normalize items to DB schema
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
        let mediaInfo: string;
        let totalDuration: bigint | null = null;

        if (source === 'plex') {
            startTime = new Date(item.viewedAt * 1000);
            playDuration = Math.round((item.duration || 1800000) / 1000);
            embyUserId = String(item.accountID || 'unknown');
            itemId = String(item.ratingKey);
            itemName = item.title || 'Unknown';
            itemType = item.type === 'episode' ? 'Episode' : (item.type === 'movie' ? 'Movie' : 'Unknown');
            userName = item.user || item.User?.title || userMap.get(embyUserId) || 'Plex User';
            client = item.player?.product || 'Plex';
            device = item.player?.title || 'Plex Device';
            totalDuration = item.duration ? BigInt(item.duration) * BigInt(10000) : null;
            mediaInfo = JSON.stringify({
                pluginSynced: true,
                seriesName: item.grandparentTitle,
                seasonName: item.parentTitle,
                episodeIndex: item.index,
                seasonIndex: item.parentIndex
            });
        } else {
            // Emby/Jellyfin
            startTime = new Date(item.DateCreated);
            playDuration = Math.round(item.PlayDuration || 0);
            embyUserId = String(item.UserId);
            itemId = String(item.ItemId);
            itemName = item.ItemName || 'Unknown';
            itemType = item.ItemType;
            userName = item.UserName;
            if (!userName || userName === 'Unknown' || userName.includes('User')) {
                userName = userMap.get(embyUserId) || userName || (source === 'emby' ? 'Emby User' : 'Jellyfin User');
            }
            client = item.Client || item.ClientName || (source === 'emby' ? 'Emby' : 'Jellyfin');
            device = item.DeviceName || (source === 'emby' ? 'Emby Device' : 'Jellyfin Device');
            mediaInfo = JSON.stringify({
                pluginSynced: true,
                seriesName: item.SeriesName,
                seasonName: item.SeasonName
            });
        }

        return {
            source,
            embyUserId,
            userName,
            itemId,
            itemName,
            itemType,
            startTime,
            endTime: new Date(startTime.getTime() + playDuration * 1000),
            playDuration,
            totalDuration,
            client,
            device,
            mediaInfo
        };
    }).filter(c => c.playDuration > 10); // Filter short plays

    if (candidates.length === 0) return 0;

    // 2. Fetch existing records in time range
    const startTimes = candidates.map(c => c.startTime.getTime());
    const minTime = new Date(Math.min(...startTimes) - 10000); // +/- 10s buffer
    const maxTime = new Date(Math.max(...startTimes) + 10000);

    const existing = await prisma.embyActivityLog.findMany({
        where: {
            source,
            startTime: { gte: minTime, lte: maxTime }
        },
        select: {
            id: true,
            embyUserId: true,
            itemId: true,
            startTime: true,
            userName: true
        }
    });

    const toCreate: any[] = [];
    const toUpdate: any[] = [];

    // 3. Filter duplicates and identify updates
    for (const cand of candidates) {
        const match = existing.find(e => 
            e.embyUserId === cand.embyUserId &&
            e.itemId === cand.itemId &&
            Math.abs(e.startTime.getTime() - cand.startTime.getTime()) <= 5000 // 5s tolerance
        );

        if (!match) {
            toCreate.push(cand);
        } else if (
            (match.userName === 'Plex User' || match.userName === 'Unknown' || match.userName.includes('User')) && 
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
            await prisma.embyActivityLog.createMany({ data: batch });
            createdCount += batch.length;
        }
    }

    // Updates are rare, sequential is fine
    for (const update of toUpdate) {
        await prisma.embyActivityLog.update({
            where: { id: update.id },
            data: { userName: update.userName }
        });
    }

    return createdCount;
}

async function syncPlex(settings: any[], getSetting: (k: string) => string | null | undefined) {
    const plexUrl = getSetting('plex_url');
    const plexToken = getSetting('plex_token');
    if (!plexUrl || !plexToken) throw new Error('Plex not configured');

    log(`[SyncPlugin] Syncing from Plex (${plexUrl})...`);
    const plex = new PlexService(plexUrl, plexToken);
    
    // Map users
    let userMap = new Map<string, string>();
    try {
        const plexUsers = await plex.getUsers();
        userMap = new Map(plexUsers.map((u: any) => [u.Id, u.Name]));
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
            syncedCount += await batchProcess('plex', batch, userMap);
            totalFetched += batch.length;
            offset += BATCH_SIZE;
            
            if (totalFetched >= SAFETY_LIMIT || batch.length < BATCH_SIZE) hasMore = false;
        }
    }

    // Sync Oldest (to ensure coverage)
    try {
        const oldestBatch = await plex.getHistory(BATCH_SIZE, 0, 'viewedAt:asc');
        if (oldestBatch && oldestBatch.length > 0) {
            syncedCount += await batchProcess('plex', oldestBatch, userMap);
        }
    } catch (e) { warn('Plex oldest sync failed', e); }

    return syncedCount;
}

async function syncEmbyLike(source: 'emby' | 'jellyfin', settings: any[], getSetting: (k: string) => string | null | undefined) {
    const isEmby = source === 'emby';
    const targetUrl = isEmby ? getSetting('emby_url') : getSetting('jellyfin_url');
    const targetKey = isEmby ? getSetting('emby_api_key') : getSetting('jellyfin_api_key');
    
    if (!targetUrl || !targetKey) throw new Error(`${source} not configured`);

    log(`[SyncPlugin] Syncing from ${source} (${targetUrl})...`);
    const service = new EmbyService(targetUrl, targetKey);
    
    let userMap = new Map<string, string>();
    try {
        const users = await service.getUsers();
        userMap = new Map(users.map((u: any) => [String(u.Id), u.Name]));
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
                syncedCount += await batchProcess(source, items, userMap);
                totalFetched += items.length;
                startIndex += BATCH_SIZE;
                
                if (totalFetched >= SAFETY_LIMIT || items.length < BATCH_SIZE) hasMore = false;
            }
        }
    } catch (err: any) {
        error(`[SyncPlugin] ${source} PlaybackReporting failed:`, err.message);
        
        // Fallback for Emby: Custom Query (Statistics Plugin / Direct DB)
        if (isEmby && syncedCount === 0) {
             log(`[SyncPlugin] Attempting fallback via custom query...`);
             try {
                 // Fetch more items for fallback since it's a one-shot query usually
                 const query = `SELECT rowid, DateCreated, UserId, ItemId, ItemType, ItemName, PlaybackMethod, ClientName, DeviceName, PlayDuration FROM PlaybackActivity ORDER BY DateCreated DESC LIMIT ${Math.min(SAFETY_LIMIT, 10000)}`;
                 const response = await service.getCustomQuery(query);
                 
                 if (response && response.results) {
                     const history = response.results.map((item: any[]) => ({
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
                     syncedCount += await batchProcess(source, history, userMap);
                 }
             } catch (fbErr: any) {
                 throw new Error(`${err.message} | Fallback: ${fbErr.message}`);
             }
        } else {
            throw err;
        }
    }

    return syncedCount;
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
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

        let totalSynced = 0;
        const errors: string[] = [];

        // Run syncs (sequentially to avoid massive DB locking if run in parallel on SQLite)
        if (source === 'all' || source === 'plex') {
            try {
                totalSynced += await syncPlex(settings, getSetting);
            } catch (e: any) {
                if (source === 'plex') errors.push(e.message);
                error('[SyncPlugin] Plex error:', e);
            }
        }

        if (source === 'all' || source === 'emby') {
            try {
                totalSynced += await syncEmbyLike('emby', settings, getSetting);
            } catch (e: any) {
                if (source === 'emby') errors.push(e.message);
                error('[SyncPlugin] Emby error:', e);
            }
        }

        if (source === 'all' || source === 'jellyfin') {
            try {
                totalSynced += await syncEmbyLike('jellyfin', settings, getSetting);
            } catch (e: any) {
                // Only error if explicitly requested or if it's the only source? 
                // For 'all', we might ignore if not configured.
                if (source === 'jellyfin') errors.push(e.message);
                else if (e.message.includes('not configured')) { /* ignore */ }
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

    } catch (error: any) {
        error('Plugin sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
