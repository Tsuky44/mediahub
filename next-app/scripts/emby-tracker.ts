import WebSocket from 'ws';
import dotenv from 'dotenv';
import { EmbyService } from '../lib/services/emby';
import { PlexService } from '../lib/services/plex';
import { getPrisma } from '../lib/prisma';
import { Server } from 'socket.io';
import http from 'http';

// Load environment variables
dotenv.config();

// FIX: Global BigInt serialization for JSON
// This prevents crashes when sending BigInt values over Socket.IO
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// Socket.io Server Setup
const isFullSync = process.argv.includes('--full-sync');
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"]
  }
});

const WS_PORT = process.env.TRACKER_WS_PORT || 3001;

if (!isFullSync) {
    server.listen(WS_PORT, () => {
      console.log(`[Tracker] WebSocket broadcast server listening on port ${WS_PORT}`);
    });
}

io.on('connection', (socket) => {
  console.log(`[Tracker] Frontend client connected: ${socket.id}`);
  // Send current active sessions immediately
  const sanitizedSessions = Array.from(activeSessions.values()).map(s => ({
    ...s,
    runTimeTicks: s.runTimeTicks ? Number(s.runTimeTicks) : null,
    lastPositionTicks: s.lastPositionTicks ? Number(s.lastPositionTicks) : null,
    lastAuthTicks: s.lastAuthTicks ? Number(s.lastAuthTicks) : null,
    playbackPosition: s.lastPositionTicks ? Number(s.lastPositionTicks) : null
  }));
  socket.emit('sessions_init', sanitizedSessions);
  
  // Also send individual history updates for each active session
  // This ensures RecentHistory component gets immediate up-to-date duration/state
  activeSessions.forEach(sessionState => {
      console.log(`[Tracker] Sending history_init for ${sessionState.userName}: ${sessionState.accumulatedDuration}s`);
      socket.emit('history_update', {
          instanceId: sessionState.instanceId,
          log: {
              id: `live-${sessionState.sessionId}`,
              sessionId: sessionState.sessionId,
              instanceId: sessionState.instanceId,
              embyUserId: sessionState.userId,
              userName: sessionState.userName,
              itemId: sessionState.itemId,
              itemName: sessionState.itemName,
              itemType: sessionState.itemType,
              startTime: sessionState.startedAt,
              endTime: new Date(),
              playDuration: Math.round(sessionState.accumulatedDuration),
              totalDuration: sessionState.runTimeTicks ? Number(sessionState.runTimeTicks) : null,
              client: sessionState.client,
              device: sessionState.device,
              deviceId: sessionState.deviceId,
              mediaInfo: sessionState.mediaInfo,
              source: sessionState.source,
              isLive: true
          }
      });
  });

  socket.on('disconnect', () => {
    console.log(`[Tracker] Frontend client disconnected: ${socket.id}`);
  });
});

function broadcastSessions() {
  const sanitizedSessions = Array.from(activeSessions.values()).map(s => ({
    ...s,
    runTimeTicks: s.runTimeTicks ? Number(s.runTimeTicks) : null,
    lastPositionTicks: s.lastPositionTicks ? Number(s.lastPositionTicks) : null,
    lastAuthTicks: s.lastAuthTicks ? Number(s.lastAuthTicks) : null,
    // Add playbackPosition for compatibility with frontend expectation
    playbackPosition: s.lastPositionTicks ? Number(s.lastPositionTicks) : null
  }));
  io.emit('sessions_update', sanitizedSessions);
}

interface SessionState {
  instanceId: number;
  source: string; // emby, jellyfin, plex
  sessionId: string;
  userId: string;
  userName: string;
  itemId: string;
  itemName: string;
  itemType: string;
  runTimeTicks: bigint | null;
  startedAt: Date;
  lastUpdate: number; // timestamp in ms
  lastHistoryEmit?: number; // timestamp in ms
  lastSeen: number;
  accumulatedDuration: number; // in seconds
  lastAuthAccumulated: number; // The confirmed accumulated duration from the last Emby update
  isPaused: boolean;
  lastPositionTicks: bigint | null;
  lastAuthTicks: bigint | null; // The position ticks from the last Emby update
  lastAuthTime: number; // Timestamp of the last Emby update
  markedForCleanup: number | null; // Timestamp when session was first marked as missing
  client: string;
  device: string;
  deviceId: string;
  mediaInfo: any;
}

// Global state tracking
const activeSessions = new Map<string, SessionState>();
interface ServiceConnection {
  ws: WebSocket | null;
  keepAlive?: NodeJS.Timeout;
  pollingInterval?: NodeJS.Timeout;
  url: string;
  key: string;
  type: string;
}

const instanceConnections = new Map<string, ServiceConnection>();
const instanceUsers = new Map<string, Map<string, string>>(); // "instanceId-source" -> (userId -> userName)

async function startTracker() {
  if (isFullSync) {
      console.log('[Tracker] Running EXHAUSTIVE Plex history sync as requested...');
      const p = getPrisma() as any;
      const instances = await p.instance.findMany();
      for (const inst of instances) {
          if (inst.plexUrl && inst.plexToken) {
              console.log(`[Tracker] Full sync for instance: ${inst.name}`);
              
              const plex = new PlexService(inst.plexUrl, inst.plexToken);
              
              // Fetch users first
               const plexUsers = await plex.getUsers();
               const userMap = new Map<string, string>(plexUsers.map((u: any) => [String(u.Id), String(u.Name)]));
               instanceUsers.set(`${inst.id}-plex`, userMap);

              // 1. Fetch recent (up to 20k)
              let offset = 0;
              const limit = 500;
              let hasMore = true;
              let totalFetched = 0;

              while (hasMore && totalFetched < 20000) {
                  const batch = await plex.getHistory(limit, offset, 'viewedAt:desc');
                  if (!batch || batch.length === 0) {
                      hasMore = false;
                  } else {
                      // Process batch immediately to save memory
                      for (const item of batch) {
                          const date = new Date(item.viewedAt * 1000);
                          const existing = await p.embyActivityLog.findFirst({
                              where: {
                                  instanceId: inst.id,
                                  source: 'plex',
                                  embyUserId: String(item.accountID),
                                  itemId: String(item.ratingKey),
                                  startTime: {
                                      gte: new Date(date.getTime() - 5000),
                                      lte: new Date(date.getTime() + 5000)
                                  }
                              }
                          });

                          if (!existing) {
                              const playDurationMs = item.duration || 1800000;
                              const embyUserId = String(item.accountID || 'unknown');
                              const userName = item.user || item.User?.title || userMap.get(embyUserId) || 'Plex User';

                              await p.embyActivityLog.create({
                                    data: {
                                        instanceId: inst.id,
                                        source: 'plex',
                                        embyUserId,
                                        userName,
                                        itemId: String(item.ratingKey),
                                        itemName: item.title || 'Unknown Item',
                                        itemType: item.type || 'Unknown',
                                        startTime: date,
                                        endTime: new Date(date.getTime() + playDurationMs),
                                        playDuration: Math.floor(playDurationMs / 1000),
                                        mediaInfo: JSON.stringify({
                                            seriesName: item.grandparentTitle,
                                            seasonName: item.parentTitle,
                                            client: item.Player?.product || 'Plex',
                                            pluginSynced: true,
                                            exhaustive: true
                                        })
                                    }
                                });
                          }
                      }
                      totalFetched += batch.length;
                      offset += limit;
                      console.log(`[Tracker] ${inst.name}: Synced ${totalFetched} recent items...`);
                      if (batch.length < limit) hasMore = false;
                  }
              }

              // 2. Fetch oldest (ensure "first thing seen")
              console.log(`[Tracker] ${inst.name}: Fetching oldest items (beginning of time)...`);
              const oldestBatch = await plex.getHistory(500, 0, 'viewedAt:asc');
              if (oldestBatch) {
                  for (const item of oldestBatch) {
                      const date = new Date(item.viewedAt * 1000);
                      const existing = await p.embyActivityLog.findFirst({
                          where: {
                              instanceId: inst.id,
                              source: 'plex',
                              embyUserId: String(item.accountID),
                              itemId: String(item.ratingKey),
                              startTime: {
                                  gte: new Date(date.getTime() - 5000),
                                  lte: new Date(date.getTime() + 5000)
                              }
                          }
                      });

                      if (!existing) {
                          const playDurationMs = item.duration || 1800000;
                          const embyUserId = String(item.accountID || 'unknown');
                          const userName = item.user || item.User?.title || userMap.get(embyUserId) || 'Plex User';

                          await p.embyActivityLog.create({
                                data: {
                                    instanceId: inst.id,
                                    source: 'plex',
                                    embyUserId,
                                    userName,
                                    itemId: String(item.ratingKey),
                                    itemName: item.title || 'Unknown Item',
                                    itemType: item.type || 'Unknown',
                                    startTime: date,
                                    endTime: new Date(date.getTime() + playDurationMs),
                                    playDuration: Math.floor(playDurationMs / 1000),
                                    mediaInfo: JSON.stringify({
                                        seriesName: item.grandparentTitle,
                                        seasonName: item.parentTitle,
                                        client: item.Player?.product || 'Plex',
                                        pluginSynced: true,
                                        exhaustiveOldest: true
                                    })
                                }
                            });
                      }
                  }
                  console.log(`[Tracker] ${inst.name}: Synced ${oldestBatch.length} oldest items.`);
              }
          }
      }
      console.log('[Tracker] EXHAUSTIVE sync completed.');
      process.exit(0);
  }

  console.log('--- Emby Multi-Instance Tracker Starting ---');
  
  const p = getPrisma() as any;
  const availableModels = Object.keys(p).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  console.log(`[Tracker] Available Prisma models: ${availableModels.join(', ')}`);
  
  // 1. Initial connection to all instances in DB
  await refreshInstances();

  // 2. Periodically refresh instances (every 5 minutes)
  setInterval(refreshInstances, 5 * 60 * 1000);

  // 3. Periodically cleanup orphaned live sessions (every 1 minute)
  setInterval(cleanupOrphanedSessions, 60 * 1000);

  // 4. Periodic polling sync (fallback if WS misses messages)
  // This is a slow sync for all instances
  setInterval(pollAllInstances, 5 * 60 * 1000);

  // 5. Sync from plugins (Statistics or Playback Reporting)
  setInterval(() => syncFromPlugins(2), 15 * 60 * 1000);
  // Initial deep sync on start (1000 days = ~3 years)
  syncFromPlugins(1000);
  
  // Load existing live sessions from DB to memory to persist accumulatedDuration across tracker restarts
  const loadExistingSessions = async () => {
    try {
        const p = getPrisma() as any;
        // Fetch instance types map
        const instances = await p.instance.findMany({ select: { id: true, type: true } });
        const instanceTypes = new Map<number, string>();
        instances.forEach((i: any) => instanceTypes.set(i.id, i.type || 'emby'));

        if (p.embyLiveSession) {
            const existing = await p.embyLiveSession.findMany();
            console.log(`[Tracker] Loading ${existing.length} existing live sessions from DB...`);
            for (const s of existing) {
                const sessionKey = `${s.instanceId}-${s.sessionId}`;
                activeSessions.set(sessionKey, {
                    instanceId: s.instanceId,
                    source: s.source || 'emby',
                    sessionId: s.sessionId,
                    userId: s.userId,
                    userName: s.userName,
                    itemId: s.itemId,
                    itemName: s.itemName,
                    itemType: s.itemType,
                    runTimeTicks: s.runTimeTicks ? BigInt(s.runTimeTicks) : null,
                    startedAt: s.startedAt,
                    lastUpdate: Date.now(),
                    lastHistoryEmit: Date.now(),
                    lastSeen: Date.now(),
                    accumulatedDuration: s.accumulatedDuration || 0,
                    lastAuthAccumulated: s.accumulatedDuration || 0,
                    isPaused: s.isPaused,
                    lastPositionTicks: s.playbackPosition ? BigInt(s.playbackPosition) : null,
                    lastAuthTicks: s.playbackPosition ? BigInt(s.playbackPosition) : null,
                    lastAuthTime: Date.now(),
                    markedForCleanup: null,
                    client: s.client,
                    device: s.device,
                    deviceId: s.deviceId,
                    mediaInfo: {} // Will be updated on first message
                });
            }
        }
    } catch (e) { console.error(`[Tracker] Error loading existing sessions: ${e}`); }
  };
  await loadExistingSessions();


  // 6. Real-time broadcast and interpolation (every 1 second)
  setInterval(async () => {
    const now = Date.now();
    let hasChanges = false;
    
    // Use Array.from(entries) to safely delete while iterating if needed, 
    // though Map iteration handles deletion gracefully usually, explicit key is better.
    for (const [key, state] of activeSessions.entries()) {
      // Only project forward if not paused AND recently seen
    const isRecentlySeen = (now - state.lastSeen) < 30000; // 30s grace (increased from 15s)
    
    // Background cleanup for sessions marked for deletion
    // Plex sessions are especially prone to flickering in the sessions list, so we use a longer grace period
    const cleanupDelay = state.source === 'plex' ? 30000 : 15000;
    if (state.markedForCleanup && (now - state.markedForCleanup > cleanupDelay)) { 
        console.log(`[Tracker] Background cleanup for session: ${state.userName} - ${state.itemName} (Source: ${state.source})`);
        await flushSession(state);
        activeSessions.delete(key);
          
          try {
            const p = getPrisma() as any;
            if (p.embyLiveSession) {
                await p.embyLiveSession.delete({ 
                    where: { sessionId_instanceId: { sessionId: state.sessionId, instanceId: state.instanceId } } 
                });
            }
          } catch (e) { /* ignore */ }
          
          hasChanges = true; // Trigger broadcast
          continue; // Skip processing this session
      }
      
      if (!state.markedForCleanup && !state.isPaused && isRecentlySeen) {
        const elapsedSinceAuth = (now - state.lastAuthTime) / 1000;
        state.accumulatedDuration = state.lastAuthAccumulated + elapsedSinceAuth;
        hasChanges = true;
        
        // Cap accumulated duration
        if (state.runTimeTicks) {
          const maxSeconds = Number(state.runTimeTicks) / 10000000;
          if (state.accumulatedDuration > maxSeconds) {
            state.accumulatedDuration = maxSeconds;
          }
        }
        
        // Interpolate position: add 10,000,000 ticks per second
        if (state.lastAuthTicks !== null && state.runTimeTicks !== null) {
          const additionalTicks = BigInt(Math.floor(elapsedSinceAuth * 10000000));
          const newPosition = state.lastAuthTicks + additionalTicks;
          
          // Don't interpolate past the end
          if (newPosition <= state.runTimeTicks) {
            state.lastPositionTicks = newPosition;
          }
        }
      } else {
         // If paused or lost connection, stick to the last confirmed values
         state.accumulatedDuration = state.lastAuthAccumulated;
         if (state.lastAuthTicks !== null) {
            state.lastPositionTicks = state.lastAuthTicks;
         }
      }
      state.lastUpdate = now;
    }
    
    // Periodically sync the accumulated duration to DB (every 5 seconds to avoid DB spam)
    const shouldSyncToDB = now % 5000 < 1000;
    if (shouldSyncToDB && hasChanges) {
      const p = getPrisma() as any;
      if (p.embyLiveSession) {
        for (const state of activeSessions.values()) {
          try {
            await p.embyLiveSession.update({
              where: { sessionId_instanceId: { sessionId: state.sessionId, instanceId: state.instanceId } },
              data: { 
                accumulatedDuration: Math.round(state.accumulatedDuration),
                lastActivity: new Date()
              }
            });
          } catch (e) { /* ignore */ }
        }
      }
    }
    
    // Always broadcast every second to ensure frontend state is synced (even if empty)
    // console.log(`[Tracker] Broadcasting ${activeSessions.size} active sessions: ${Array.from(activeSessions.values()).map(s => s.userName).join(', ')}`);
    broadcastSessions();
  }, 1000);
}

async function syncFromPlugins(days: number = 2) {
  console.log(`--- Syncing from Media Plugins (Last ${days} days) ---`);
  try {
    const prisma = getPrisma();
    const instances = await (prisma as any).instance.findMany();
    for (const inst of instances) {
      // 1. Sync Emby if configured
      if (inst.embyUrl && inst.embyApiKey) {
        await syncEmbyOrJellyfinHistory(inst, 'emby', days);
      }
      
      // 2. Sync Jellyfin if configured
      if (inst.jellyfinUrl && inst.jellyfinApiKey) {
        await syncEmbyOrJellyfinHistory(inst, 'jellyfin', days);
      }

      // 3. Sync Plex if configured
      if (inst.plexUrl && inst.plexToken) {
        await syncPlexHistory(inst);
      }
    }
  } catch (err: any) {
    console.error(`[Tracker] syncFromPlugins global error:`, err.message);
  }
}

async function syncEmbyOrJellyfinHistory(inst: any, type: 'emby' | 'jellyfin', days: number) {
  try {
    const url = type === 'jellyfin' ? inst.jellyfinUrl : inst.embyUrl;
    const key = type === 'jellyfin' ? inst.jellyfinApiKey : inst.embyApiKey;
    
    if (!url || !key) return;

    const service = new EmbyService(url, key);
    
    // 1. Try Statistics Plugin first (user preference)
    let stats = await service.getStatisticsStats(days);
    let pluginName = 'Statistics';

    // 2. If no data from Statistics, try Playback Reporting as fallback
    if (!stats || stats.length === 0) {
        const pbStats = await service.getPlaybackReportingStats(days);
        if (pbStats && pbStats.length > 0) {
            stats = pbStats;
            pluginName = 'Playback Reporting';
        }
    }

    if (!stats || stats.length === 0) return;

    // Pre-fetch item details for all unique item IDs to get TMDB IDs
    const uniqueItemIds = Array.from(new Set(stats.map((s: any) => s.ItemId || s.NowPlayingItemId).filter(Boolean))) as string[];
    const itemDetailsMap = new Map<string, any>();
    
    if (uniqueItemIds.length > 0) {
      console.log(`[${inst.name}] (${type}) Fetching details for ${uniqueItemIds.length} items...`);
      for (let i = 0; i < uniqueItemIds.length; i += 50) {
        const batch = uniqueItemIds.slice(i, i + 50);
        const details = await service.getItemsDetails(batch);
        details.forEach((item: any) => {
          itemDetailsMap.set(String(item.Id), item);
        });
      }

      // Second pass for series details
      const missingTmdbSeriesIds = new Set<string>();
      itemDetailsMap.forEach((item: any) => {
        const tmdbId = item?.ProviderIds?.Tmdb || item?.ProviderIds?.TMDB;
        if (!tmdbId && item.SeriesId) {
          missingTmdbSeriesIds.add(String(item.SeriesId));
        }
      });

      if (missingTmdbSeriesIds.size > 0) {
        const seriesIds = Array.from(missingTmdbSeriesIds);
        for (let i = 0; i < seriesIds.length; i += 50) {
          const batch = seriesIds.slice(i, i + 50);
          const details = await service.getItemsDetails(batch);
          details.forEach((item: any) => {
            itemDetailsMap.set(`series_${item.Id}`, item);
          });
        }
      }
    }

    let syncedCount = 0;
    const prisma = getPrisma();
    for (const s of stats) {
      const itemId = String(s.ItemId || s.NowPlayingItemId);
      const itemDetail = itemDetailsMap.get(itemId);
      let tmdbId = itemDetail?.ProviderIds?.Tmdb || itemDetail?.ProviderIds?.TMDB;

      if (!tmdbId && itemDetail?.SeriesId) {
        const seriesDetail = itemDetailsMap.get(`series_${itemDetail.SeriesId}`);
        tmdbId = seriesDetail?.ProviderIds?.Tmdb || seriesDetail?.ProviderIds?.TMDB;
      }
      
      const startTime = new Date(s.DateCreated || s.ActivityDateInserted || s.Timestamp);
      const playDuration = Math.round(s.PlayDuration || 0);
      
      if (playDuration < 10) continue; 

      const embyUserId = s.UserId;
      const itemName = s.ItemName || s.Name || 'Unknown';

      // Filter out junk
      if (itemName.includes('Not Known') || itemName.toLowerCase().includes('theme')) {
          continue;
      }

      const exists = await (prisma as any).embyActivityLog.findFirst({
        where: {
          instanceId: inst.id,
          source: type,
          embyUserId,
          itemId,
          startTime: {
            gte: new Date(startTime.getTime() - 5000), 
            lte: new Date(startTime.getTime() + 5000)
          }
        }
      });

      if (!exists) {
        const cachedUserName = instanceUsers.get(`${inst.id}-${type}`)?.get(embyUserId);
        const userName = s.UserName || s.User || cachedUserName || 'Unknown';

        await (prisma as any).embyActivityLog.create({
          data: {
            instanceId: inst.id,
            source: type,
            embyUserId,
            userName,
            itemId,
            itemName: s.ItemName || s.Name || 'Unknown',
            itemType: s.ItemType || s.Type || 'Unknown',
            startTime,
            endTime: new Date(startTime.getTime() + playDuration * 1000),
            playDuration,
            totalDuration: itemDetail?.RunTimeTicks ? BigInt(itemDetail.RunTimeTicks) : null,
            client: s.ClientName || s.Client || 'Unknown',
            device: s.DeviceName || s.Device || 'Unknown',
            mediaInfo: JSON.stringify({
              playbackMethod: s.PlaybackMethod || s.PlayMethod,
              pluginSynced: true,
              pluginSource: pluginName,
              tmdbId,
              seriesId: itemDetail?.SeriesId,
              seriesName: itemDetail?.SeriesName,
              seasonName: itemDetail?.SeasonName,
              episodeIndex: itemDetail?.IndexNumber,
              seasonIndex: itemDetail?.ParentIndexNumber
            })
          }
        });
        syncedCount++;
      }
    }
    if (syncedCount > 0) {
      console.log(`[${inst.name}] (${type}) Synced ${syncedCount} logs from ${pluginName}`);
    }
  } catch (err: any) {
    if (err.response?.status !== 404) {
       console.error(`[${inst.name}] (${type}) Failed to sync from plugins:`, err.message);
    }
  }
}

async function fixUnknownUsersInDB(instanceId: number, source: string, userMap: Map<string, string>) {
    try {
        const prisma = getPrisma() as any;
        if (!prisma.embyActivityLog) return;

        // Find logs for this instance and source with "Unknown" or "UNKNOWN" or empty userName
        const logsToFix = await prisma.embyActivityLog.findMany({
            where: {
                instanceId,
                source,
                OR: [
                    { userName: 'Unknown' },
                    { userName: 'UNKNOWN' },
                    { userName: '' }
                ]
            }
        });

        if (logsToFix.length === 0) return;

        let fixedCount = 0;
        for (const log of logsToFix) {
            const realName = userMap.get(log.embyUserId);
            if (realName) {
                await prisma.embyActivityLog.update({
                    where: { id: log.id },
                    data: { userName: realName }
                });
                fixedCount++;
            }
        }

        if (fixedCount > 0) {
            console.log(`[Tracker] Fixed ${fixedCount} "Unknown" logs for instance ${instanceId} (${source}) using user map.`);
        }
    } catch (e: any) {
        console.error(`[Tracker] Error fixing unknown users in DB: ${e.message}`);
    }
}

async function refreshInstances() {
  try {
    const prisma = getPrisma();
    const instances = await (prisma as any).instance.findMany();

    // Refresh user cache for all active instances
    for (const inst of instances) {
        const sources = [
            { type: 'jellyfin', url: inst.jellyfinUrl, key: inst.jellyfinApiKey },
            { type: 'emby', url: inst.embyUrl, key: inst.embyApiKey },
            { type: 'plex', url: inst.plexUrl, key: inst.plexToken }
        ];

        for (const source of sources) {
            if (!source.url || !source.key) continue;

            try {
                let users = [];
                if (source.type === 'plex') {
                    const plex = new PlexService(source.url, source.key);
                    users = await plex.getUsers();
                } else {
                    const service = new EmbyService(source.url, source.key);
                    users = await service.getUsers();
                }

                if (users && Array.isArray(users)) {
                    const userMap = new Map<string, string>();
                    users.forEach((u: any) => {
                        userMap.set(u.Id, u.Name);
                    });
                    
                    const cacheKey = `${inst.id}-${source.type}`;
                    instanceUsers.set(cacheKey, userMap);
                    console.log(`[Tracker] Cached ${userMap.size} users for instance [${inst.name}] (${source.type})`);
                    
                    // If source is Plex, also try to fix "Plex User" names in DB
                    if (source.type === 'plex') {
                        try {
                            const p = getPrisma() as any;
                            const logsToFix = await p.embyActivityLog.findMany({
                                where: {
                                    instanceId: inst.id,
                                    source: 'plex',
                                    userName: 'Plex User'
                                }
                            });
                            for (const log of logsToFix) {
                                const realName = userMap.get(log.embyUserId);
                                if (realName && realName !== 'Plex User') {
                                    await p.embyActivityLog.update({
                                        where: { id: log.id },
                                        data: { userName: realName }
                                    });
                                }
                            }
                        } catch (e) {}
                    }

                    // Attempt to fix existing "Unknown" or "UNKNOWN" logs in DB for this instance and source
                    await fixUnknownUsersInDB(inst.id, source.type, userMap);
                }
            } catch (e: any) {
                console.error(`[Tracker] Failed to refresh ${source.type} users for instance [${inst.name}]: ${e.message}`);
            }
        }
    }

  // Identify which service connections should exist
  const desiredConnections = new Set<string>();
  for (const inst of instances) {
      if (inst.embyUrl && inst.embyApiKey) desiredConnections.add(`${inst.id}-emby`);
      if (inst.plexUrl && inst.plexToken) desiredConnections.add(`${inst.id}-plex`);
      if (inst.jellyfinUrl && inst.jellyfinApiKey) desiredConnections.add(`${inst.id}-jellyfin`);
  }

  // Close connections for removed or updated services
  for (const [key, conn] of instanceConnections.entries()) {
    const [instIdStr, type] = key.split('-');
    const instId = parseInt(instIdStr);
    const inst = instances.find((i: any) => i.id === instId);
    
    const isRemoved = !desiredConnections.has(key);
    let isUpdated = false;

    if (inst) {
      if (type === 'emby') {
          isUpdated = inst.embyUrl !== conn.url || inst.embyApiKey !== conn.key;
      } else if (type === 'plex') {
          isUpdated = inst.plexUrl !== conn.url || inst.plexToken !== conn.key;
      } else if (type === 'jellyfin') {
          isUpdated = inst.jellyfinUrl !== conn.url || inst.jellyfinApiKey !== conn.key;
      }
    }

    if (isRemoved || isUpdated) {
      console.log(`Closing connection for ${key} (${isRemoved ? 'removed' : 'updated'} in DB)`);
      if (conn.ws) conn.ws.close();
      if (conn.keepAlive) clearInterval(conn.keepAlive);
      if (conn.pollingInterval) clearInterval(conn.pollingInterval);
      instanceConnections.delete(key);
    }
  }

  // Connect to new or updated services
  for (const inst of instances) {
      // Emby
      if (inst.embyUrl && inst.embyApiKey && !instanceConnections.has(`${inst.id}-emby`)) {
          connectToInstance(inst, 'emby');
      }
      // Plex
      if (inst.plexUrl && inst.plexToken && !instanceConnections.has(`${inst.id}-plex`)) {
          connectToPlexInstance(inst);
      }
      // Jellyfin
      if (inst.jellyfinUrl && inst.jellyfinApiKey && !instanceConnections.has(`${inst.id}-jellyfin`)) {
          connectToInstance(inst, 'jellyfin');
      }
  }
  } catch (err: any) {
    console.error(`Error refreshing instances: ${err.message}`);
  }
}

async function syncPlexHistory(inst: any) {
    try {
        const plex = new PlexService(inst.plexUrl || inst.embyUrl, inst.plexToken || inst.embyApiKey);
        
        // Exhaustive sync in background too, but limited to 2000 for regular background checks
        let allHistory: any[] = [];
        let offset = 0;
        const limit = 500;
        let hasMore = true;

        while (hasMore && allHistory.length < 2000) {
            const batch = await plex.getHistory(limit, offset, 'viewedAt:desc');
            if (!batch || batch.length === 0) {
                hasMore = false;
            } else {
                allHistory = [...allHistory, ...batch];
                offset += limit;
                if (batch.length < limit) hasMore = false;
            }
        }

        if (allHistory.length === 0) return;

        const p = getPrisma() as any;
        for (const item of allHistory) {
            // item.viewedAt is unix timestamp (seconds)
            const date = new Date(item.viewedAt * 1000);
            
            // Check if exists
            const existing = await p.embyActivityLog.findFirst({
                where: {
                    instanceId: inst.id,
                    source: 'plex',
                    embyUserId: String(item.accountID),
                    itemId: String(item.ratingKey),
                    startTime: {
                        gte: new Date(date.getTime() - 5000),
                        lte: new Date(date.getTime() + 5000)
                    }
                }
            });

            if (!existing) {
                // Insert
                const playDurationMs = item.duration || 1800000; // Default to 30 mins if missing
                
                const embyUserId = String(item.accountID || 'unknown');
                const cachedUserName = instanceUsers.get(`${inst.id}-plex`)?.get(embyUserId);
                const userName = item.user || item.User?.title || cachedUserName || 'Plex User';

                await p.embyActivityLog.create({
                    data: {
                        instanceId: inst.id,
                        source: 'plex',
                        embyUserId,
                        userName,
                        itemId: String(item.ratingKey),
                        itemName: item.title,
                        itemType: item.type,
                        startTime: date,
                        endTime: new Date(date.getTime() + playDurationMs),
                        playDuration: Math.floor(playDurationMs / 1000), // ms to seconds
                        mediaInfo: JSON.stringify({
                            seriesName: item.grandparentTitle,
                            seasonName: item.parentTitle,
                            client: item.Player?.product || 'Plex',
                            pluginSynced: true
                        })
                    }
                });
                console.log(`[${inst.name}] Synced Plex history: ${item.title} at ${date.toISOString()}`);
            }
        }

    } catch (e: any) {
        console.error(`[${inst.name}] Sync Plex History error: ${e.message}`);
    }
}

function connectToPlexInstance(inst: any) {
    const url = inst.plexUrl;
    const token = inst.plexToken;
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const wsUrl = baseUrl.replace(/^http/, 'ws') + `/:/websockets/notifications?X-Plex-Token=${token}`;
    
    console.log(`[${inst.name}] Connecting to Plex WebSocket for notifications...`);
    
    const ws = new WebSocket(wsUrl);
    let pollingInterval: NodeJS.Timeout;

    let lastPlexRefresh = 0;
    const refreshPlexSessions = async (force = false) => {
        const now = Date.now();
        if (!force && now - lastPlexRefresh < 2000) return; // Throttle to every 2s
        
        lastPlexRefresh = now;
        try {
            const plex = new PlexService(url, token);
            const sessions = await plex.getSessions();
            if (sessions) {
                const normalizedSessions = sessions.map((s: any) => PlexService.normalizeSession(s));
                await processSessions(inst.id, inst.name, normalizedSessions, 'plex');
            }
        } catch (e: any) {
            console.error(`[${inst.name}] Plex refresh error:`, e.message);
        }
    };

    ws.on('open', () => {
        console.log(`[${inst.name}] Plex WebSocket Connected`);
        // Initial refresh
        refreshPlexSessions(true);
        
        // Slower polling as fallback (every 10s instead of 2s)
        pollingInterval = setInterval(() => refreshPlexSessions(false), 10000);

        instanceConnections.set(`${inst.id}-plex`, { 
            ws, 
            pollingInterval, 
            url: inst.plexUrl, 
            key: inst.plexToken,
            type: 'plex'
        });
    });

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            // Plex sends notifications for various things. 
            // We care about 'playing' notifications to trigger a refresh.
            if (msg.NotificationContainer?.type === 'playing' || msg.NotificationContainer?.type === 'progress') {
                // console.log(`[${inst.name}] Plex activity detected, refreshing sessions...`);
                refreshPlexSessions(false);
            }
        } catch (e) {}
    });

    ws.on('close', (code, reason) => {
        console.log(`[${inst.name}] Plex WebSocket Disconnected. Reconnecting in 5s...`);
        if (pollingInterval) clearInterval(pollingInterval);
        instanceConnections.delete(`${inst.id}-plex`);
        setTimeout(() => {
            (getPrisma() as any).instance.findUnique({ where: { id: inst.id } }).then((exists: any) => {
                if (exists && exists.plexUrl && exists.plexToken) connectToPlexInstance(exists);
            });
        }, 5000);
    });

    ws.on('error', (err) => {
        console.error(`[${inst.name}] Plex WebSocket error: ${err.message}`);
        // Fallback to pure polling if WS fails
        if (!instanceConnections.get(`${inst.id}-plex`)?.pollingInterval) {
            console.log(`[${inst.name}] Falling back to pure Plex polling (2s)`);
            pollingInterval = setInterval(() => refreshPlexSessions(false), 2000);
            instanceConnections.set(`${inst.id}-plex`, { 
                ws: null, 
                pollingInterval, 
                url: inst.plexUrl, 
                key: inst.plexToken,
                type: 'plex'
            });
        }
        ws.close();
    });
}

function connectToInstance(inst: any, type: string = 'emby') {
  const isJellyfin = type === 'jellyfin';
  const url = isJellyfin ? inst.jellyfinUrl : inst.embyUrl;
  const key = isJellyfin ? inst.jellyfinApiKey : inst.embyApiKey;

  if (!url || !key) {
    console.error(`[${inst.name}] Missing URL or API Key for ${type} connection`);
    return;
  }

  const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  let wsUrl = '';
  
  if (isJellyfin) {
    // Jellyfin sometimes prefers /socket or a simpler WS URL
    wsUrl = baseUrl.replace(/^http/, 'ws') + `/socket?api_key=${key}`;
  } else {
    wsUrl = baseUrl.replace(/^http/, 'ws') + `/embywebsocket?api_key=${key}&deviceId=NextAppTracker&deviceName=NextAppTracker&format=json`;
  }
  
  console.log(`Connecting to instance [${inst.name}] at ${url} (type: ${type})`);
  
  const ws = new WebSocket(wsUrl);
  let keepAlive: NodeJS.Timeout;
  let hasWSError = false;

  ws.on('open', () => {
    console.log(`[${inst.name}] ${type} WebSocket Connected`);
    ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,1500' }));
    
    keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ MessageType: 'KeepAlive' }));
      }
    }, 30000);

    // If it was polling, stop it
    const existing = instanceConnections.get(`${inst.id}-${type}`);
    if (existing?.pollingInterval) clearInterval(existing.pollingInterval);

    instanceConnections.set(`${inst.id}-${type}`, { 
        ws, 
        keepAlive, 
        url, 
        key,
        type
    });
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.MessageType === 'Sessions') {
        await processSessions(inst.id, inst.name, msg.Data, type);
      } else if (msg.MessageType === 'ForceKeepAlive') {
        ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,1500' }));
      }
    } catch (err: any) {
      console.error(`[${inst.name}] ${type} Error processing message: ${err.message}`);
    }
  });

  ws.on('close', (code, reason) => {
    if (keepAlive) clearInterval(keepAlive);
    console.log(`[${inst.name}] ${type} WebSocket Disconnected (Code: ${code}). Reason: ${reason || 'None'}`);
    
    // Only try to reconnect if we haven't switched to polling
    const conn = instanceConnections.get(`${inst.id}-${type}`);
    if (!conn?.pollingInterval) {
        console.log(`[${inst.name}] ${type} Reconnecting in 2s...`);
        instanceConnections.delete(`${inst.id}-${type}`);
        setTimeout(() => {
            (getPrisma() as any).instance.findUnique({ where: { id: inst.id } }).then((exists: any) => {
                if (exists) {
                    if (type === 'emby' && exists.embyUrl && exists.embyApiKey) connectToInstance(exists, 'emby');
                    else if (type === 'jellyfin' && exists.jellyfinUrl && exists.jellyfinApiKey) connectToInstance(exists, 'jellyfin');
                    else if (type === 'plex' && exists.plexUrl && exists.plexToken) connectToPlexInstance(exists);
                }
            }).catch((e: any) => console.error(`[${inst.name}] ${type} Reconnect failed: ${e.message}`));
        }, 2000);
    }
  });

  ws.on('error', (err: any) => {
    hasWSError = true;
    console.error(`[${inst.name}] ${type} WebSocket error: ${err.message}`);
    
    // Fallback to polling on any error if not already polling
    if (!instanceConnections.get(`${inst.id}-${type}`)?.pollingInterval) {
        console.warn(`[${inst.name}] ${type} Switching to HTTP Polling fallback due to WebSocket error.`);
        startPollingFallback(inst, type);
    }
    
    ws.close();
  });
}

function startPollingFallback(inst: any, type: string) {
    // Stop any existing WS/KeepAlive for this service
    const existing = instanceConnections.get(`${inst.id}-${type}`);
    if (existing?.keepAlive) clearInterval(existing.keepAlive);
    if (existing?.pollingInterval) clearInterval(existing.pollingInterval);

    console.log(`[${inst.name}] Starting HTTP Polling for ${type} (every 2s)`);
    
    const url = type === 'jellyfin' ? inst.jellyfinUrl : inst.embyUrl;
    const key = type === 'jellyfin' ? inst.jellyfinApiKey : inst.embyApiKey;

    const pollingInterval = setInterval(async () => {
        try {
            const service = new EmbyService(url, key);
            const sessions = await service.getSessions();
            if (sessions) {
                await processSessions(inst.id, inst.name, sessions, type);
            }
        } catch (e: any) {
            console.error(`[${inst.name}] ${type} Polling error:`, e.message);
        }
    }, 2000);

    instanceConnections.set(`${inst.id}-${type}`, { 
        ws: null, 
        pollingInterval, 
        url, 
        key,
        type
    });
}

async function processSessions(instanceId: number, instanceName: string, sessions: any[], sourceType: string = 'emby') {
  const now = Date.now();
  const currentSessionIds = new Set<string>();
  const prisma = getPrisma();

  // Log all found sessions for debugging
  if (sessions.length > 0) {
    console.log(`[Tracker] Instance ${instanceName} (${instanceId}): Found ${sessions.length} sessions in total`);
    sessions.forEach((s: any) => {
      console.log(`  - Session ${s.Id}: User=${s.UserName}, Device=${s.DeviceName}, Playing=${s.NowPlayingItem ? s.NowPlayingItem.Name : 'Nothing'}`);
    });
  }

  // 1. First pass: identify and group sessions by DeviceId/UserId to avoid duplicates
  // Emby sometimes reports multiple sessions for the same physical playback
  const sessionGroups = new Map<string, any[]>();
  for (const s of sessions) {
      if (!s.NowPlayingItem) continue;
      const groupKey = `${instanceId}-${s.UserId}-${s.DeviceId}`;
      if (!sessionGroups.has(groupKey)) {
          sessionGroups.set(groupKey, []);
      }
      sessionGroups.get(groupKey)!.push(s);
  }

  // 2. Second pass: process only the "best" session from each group
  for (const [groupKey, groupSessions] of sessionGroups) {
      // Pick the best session: prefer one that is NOT paused, then prefer one with more recent activity
      const s = groupSessions.length === 1 ? groupSessions[0] : groupSessions.sort((a, b) => {
          const aPaused = a.PlayState?.IsPaused || a.PlayState?.Status === 'Paused' || !a.PlayState;
          const bPaused = b.PlayState?.IsPaused || b.PlayState?.Status === 'Paused' || !b.PlayState;
          if (aPaused !== bPaused) return aPaused ? 1 : -1;
          return (b.LastActivityDate || 0) > (a.LastActivityDate || 0) ? 1 : -1;
      })[0];

    // Filter out junk data like theme songs or unknown items
    const itemName = s.NowPlayingItem.Name || '';
    if (itemName.includes('Not Known') || itemName.toLowerCase().includes('theme')) {
        continue;
    }
    
    const sessionId = `${sourceType}-${s.Id}`;
    const sessionKey = `${instanceId}-${sessionId}`;
    currentSessionIds.add(sessionKey);

    // Also mark other sessions in the same group as "handled" so they don't count as ended immediately
    // if we switch session IDs
    if (groupSessions.length > 1) {
        for (const otherS of groupSessions) {
            if (otherS.Id !== s.Id) {
                currentSessionIds.add(`${instanceId}-${sourceType}-${otherS.Id}`);
            }
        }
    }
    
    // Robust pause detection: check IsPaused flag OR if the playback status is explicitly "Paused"
    // Also consider it paused if there is no PlayState (shouldn't happen for active playback)
    const isPaused = s.PlayState?.IsPaused || s.PlayState?.Status === 'Paused' || !s.PlayState;
    
    const currentPositionTicks = s.PlayState?.PositionTicks ? BigInt(s.PlayState.PositionTicks) : null;
    
    let sessionState = activeSessions.get(sessionKey);

    if (!sessionState) {
      console.log(`[${instanceName}] New Session: ${s.UserName} playing ${s.NowPlayingItem.Name}`);
      
      const cachedUserName = instanceUsers.get(`${instanceId}-${sourceType}`)?.get(s.UserId);
      const userName = (s.UserName && s.UserName !== 'Plex User' && s.UserName !== 'Unknown') 
        ? s.UserName 
        : (cachedUserName || s.UserName || 'Unknown');
      
      sessionState = {
        instanceId,
        source: sourceType,
        sessionId,
        userId: s.UserId,
        userName: userName,
        itemId: s.NowPlayingItem.Id,
        itemName: s.NowPlayingItem.Name,
        itemType: s.NowPlayingItem.Type,
        runTimeTicks: s.NowPlayingItem.RunTimeTicks ? BigInt(s.NowPlayingItem.RunTimeTicks) : null,
        startedAt: new Date(),
        lastUpdate: now,
        lastHistoryEmit: now,
        lastSeen: now,
        accumulatedDuration: 0,
        lastAuthAccumulated: 0,
        isPaused: isPaused,
        lastPositionTicks: currentPositionTicks,
        lastAuthTicks: currentPositionTicks,
        lastAuthTime: now,
        client: s.Client,
        device: s.DeviceName,
        deviceId: s.DeviceId,
        markedForCleanup: null,
        mediaInfo: {
            seasonName: s.NowPlayingItem.SeasonName || s.NowPlayingItem.ParentTitle,
            episodeTitle: s.NowPlayingItem.Name,
            seriesName: s.NowPlayingItem.SeriesName || s.NowPlayingItem.GrandparentTitle || (s.NowPlayingItem.Type === 'Episode' && s.NowPlayingItem.Name?.includes(' : ') ? s.NowPlayingItem.Name.split(' : ')[0] : undefined),
            seriesId: s.NowPlayingItem.SeriesId || s.NowPlayingItem.GrandparentItemId,
            episodeIndex: s.NowPlayingItem.IndexNumber,
            seasonIndex: s.NowPlayingItem.ParentIndexNumber,
            tmdbId: s.NowPlayingItem.ProviderIds?.Tmdb || s.NowPlayingItem.ProviderIds?.TMDB,
            imdbId: s.NowPlayingItem.ProviderIds?.Imdb || s.NowPlayingItem.ProviderIds?.IMDB
        }
      };
      
      activeSessions.set(sessionKey, sessionState);
      broadcastSessions();

      // Emit to history in real-time as "Live"
      io.emit('history_update', {
          instanceId: sessionState.instanceId,
          log: {
              id: `live-${sessionState.sessionId}`,
              instanceId: sessionState.instanceId,
              embyUserId: sessionState.userId,
              userName: sessionState.userName,
              itemId: sessionState.itemId,
              itemName: sessionState.itemName,
              itemType: sessionState.itemType,
              startTime: sessionState.startedAt,
              endTime: new Date(),
              playDuration: Math.round(sessionState.accumulatedDuration),
              totalDuration: sessionState.runTimeTicks ? Number(sessionState.runTimeTicks) : null,
              client: sessionState.client,
              device: sessionState.device,
              deviceId: sessionState.deviceId,
              mediaInfo: sessionState.mediaInfo,
              source: sessionState.source,
              isLive: true
          }
      });

      try {
        const p = prisma as any;
        if (p.embyLiveSession) {
            await p.embyLiveSession.upsert({
                where: { 
                    sessionId_instanceId: { 
                        sessionId, 
                        instanceId 
                    } 
                },
                create: mapToLiveSession(sessionState, s),
                update: {
                    ...mapToLiveSession(sessionState, s),
                    source: sourceType,
                    accumulatedDuration: Math.round(sessionState.accumulatedDuration)
                }
            });
        } else {
            const models = Object.keys(p).filter(k => !k.startsWith('$') && !k.startsWith('_'));
            console.error(`[${instanceName}] Prisma model embyLiveSession not found! Available models: ${models.join(', ')}`);
        }
      } catch (e: any) { console.error(`[${instanceName}] DB Error (Live Session Upsert): ${e.message}`); }

    } else {
      // --- STRICT TICK DELTA VALIDATION & SYNC ---
      const tickDelta = (currentPositionTicks !== null && sessionState.lastAuthTicks !== null) 
          ? currentPositionTicks - sessionState.lastAuthTicks 
          : BigInt(0);
      const timeDelta = (now - sessionState.lastAuthTime) / 1000; // seconds
      const tickDeltaSeconds = Number(tickDelta) / 10000000;

      // Handle State Changes
      if (sessionState.isPaused !== isPaused) {
           console.log(`[${instanceName}] [${sessionState.userName}] ${isPaused ? 'Paused' : 'Resumed'} at ${Number(currentPositionTicks ?? BigInt(0))/10000000}s`);
           
           if (!isPaused) {
               // RESUMED: Reset anchors to avoid counting paused time or calculating bad deltas
               sessionState.lastAuthTime = now;
               sessionState.lastAuthTicks = currentPositionTicks;
               sessionState.lastUpdate = now;
               // No duration added on the exact resume event
           } else {
               // PAUSED: Calculate the final segment of playback before the pause
               // Only if it looks valid (tick delta matches time delta)
               const difference = Math.abs(tickDeltaSeconds - timeDelta);
               if (difference < 3.0 && tickDeltaSeconds > 0) {
                   sessionState.lastAuthAccumulated += tickDeltaSeconds;
                   sessionState.accumulatedDuration = sessionState.lastAuthAccumulated;
               }
               sessionState.lastAuthTime = now;
               sessionState.lastAuthTicks = currentPositionTicks;
           }
      } 
      else if (!isPaused) {
          // CONTINUOUS PLAYBACK: Validate the segment
          const difference = Math.abs(tickDeltaSeconds - timeDelta);
          
          if (difference < 5.0 && tickDeltaSeconds > 0) {
              // Valid playback segment
              sessionState.lastAuthAccumulated += tickDeltaSeconds;
              sessionState.accumulatedDuration = sessionState.lastAuthAccumulated;
          } else if (Math.abs(Number(tickDeltaSeconds)) > 5.0) {
             // Large jump = Seek (or buffering lag)
             // We do NOT add this to duration
             // console.log(`[${instanceName}] [${sessionState.userName}] Seek/Lag detected (diff: ${difference.toFixed(1)}s). Ignoring segment duration.`);
          }
          
          // Always update anchors to current
          sessionState.lastAuthTime = now;
          sessionState.lastAuthTicks = currentPositionTicks;
          sessionState.lastUpdate = now; // Reset predictive loop
      } 
      else {
          // CONTINUOUS PAUSE: Just update timestamps, no duration added
          sessionState.lastAuthTime = now;
          sessionState.lastAuthTicks = currentPositionTicks;
      }

      sessionState.lastPositionTicks = currentPositionTicks;
      sessionState.isPaused = isPaused;
      sessionState.lastSeen = now;

      // Update userName if it was Unknown but we now have it or found it in cache
      if (sessionState.userName === 'Unknown' || !sessionState.userName) {
          const cachedUserName = instanceUsers.get(`${instanceId}-${sourceType}`)?.get(s.UserId);
          const userName = s.UserName || cachedUserName;
          if (userName) sessionState.userName = userName;
      }
      
      // Item change in same session
      if (sessionState.itemId !== s.NowPlayingItem.Id) {
          console.log(`[${instanceName}] Session ${sessionId} changed item. Flushing old, starting new.`);
          // Ensure flushSession handles SessionState correctly
          if (sessionState) await flushSession(sessionState);
          
          sessionState.itemId = s.NowPlayingItem.Id;
          sessionState.itemName = s.NowPlayingItem.Name;
          sessionState.itemType = s.NowPlayingItem.Type;
          sessionState.runTimeTicks = s.NowPlayingItem.RunTimeTicks ? BigInt(s.NowPlayingItem.RunTimeTicks) : null;
          sessionState.accumulatedDuration = 0;
          sessionState.lastAuthAccumulated = 0;
          sessionState.lastHistoryEmit = now;
          sessionState.lastPositionTicks = currentPositionTicks;
          sessionState.lastAuthTicks = currentPositionTicks;
          sessionState.lastAuthTime = now;
          sessionState.startedAt = new Date();
          sessionState.markedForCleanup = null;
          sessionState.mediaInfo = {
            seasonName: s.NowPlayingItem.SeasonName,
            episodeTitle: s.NowPlayingItem.Name,
            seriesName: s.NowPlayingItem.SeriesName,
            seriesId: s.NowPlayingItem.SeriesId,
            episodeIndex: s.NowPlayingItem.IndexNumber,
            seasonIndex: s.NowPlayingItem.ParentIndexNumber,
            tmdbId: s.NowPlayingItem.ProviderIds?.Tmdb || s.NowPlayingItem.ProviderIds?.TMDB,
            imdbId: s.NowPlayingItem.ProviderIds?.Imdb || s.NowPlayingItem.ProviderIds?.IMDB
          };
      } else {
        sessionState.markedForCleanup = null; // Session confirmed active
      }

      activeSessions.set(sessionKey, sessionState);
      broadcastSessions();

      // Periodically update the history list with real-time duration
      const shouldEmitHistory = !sessionState.lastHistoryEmit || (now - sessionState.lastHistoryEmit > 2000); // every 2s
      if (shouldEmitHistory) {
          io.emit('history_update', {
              instanceId: sessionState.instanceId,
              log: {
                  id: `live-${sessionState.sessionId}`,
                  instanceId: sessionState.instanceId,
                  embyUserId: sessionState.userId,
                  userName: sessionState.userName,
                  itemId: sessionState.itemId,
                  itemName: sessionState.itemName,
                  itemType: sessionState.itemType,
                  startTime: sessionState.startedAt,
                  endTime: new Date(),
                  playDuration: Math.round(sessionState.accumulatedDuration),
                  totalDuration: sessionState.runTimeTicks ? Number(sessionState.runTimeTicks) : null,
                  client: sessionState.client,
                  device: sessionState.device,
                  deviceId: sessionState.deviceId,
                  mediaInfo: sessionState.mediaInfo,
                  source: sessionState.source,
                  isLive: true
              }
          });
          sessionState.lastHistoryEmit = now;
      }

      try {
        const p = prisma as any;
        if (p.embyLiveSession) {
            await p.embyLiveSession.update({
                where: { 
                    sessionId_instanceId: { 
                        sessionId, 
                        instanceId 
                    } 
                },
                data: {
                    isPaused,
                    lastActivity: new Date(),
                    playbackPosition: BigInt(s.PlayState.PositionTicks || 0),
                    accumulatedDuration: Math.round(sessionState.accumulatedDuration),
                    itemId: sessionState.itemId,
                    itemName: sessionState.itemName,
                    itemType: sessionState.itemType
                }
            });
        }
      } catch (e) { /* ignore update errors */ }
    }
  }

  // Check for sessions that ended
    // We use a grace period to handle temporary API drops or session refreshes
    // Plex is especially prone to this.
    const GRACE_PERIOD = 30000; // 30s grace period (increased from 20s)
    for (const [key, state] of activeSessions.entries()) {
        if (state.instanceId === instanceId && !currentSessionIds.has(key)) {
            // Mark for cleanup if not already marked
            if (!state.markedForCleanup) {
                state.markedForCleanup = now;
            }

            const timeSinceMarked = now - state.markedForCleanup;
            const timeSinceLastSeen = now - state.lastSeen;
            
            // If the session ID is missing from Emby entirely, it's a stronger signal it stopped
            // If it's still in grace period, we wait.
            // We use the MAX of timeSinceLastSeen and timeSinceMarked to be safe, 
            // but rely primarily on the explicit "missing from list" signal (markedForCleanup)
            if (timeSinceMarked > GRACE_PERIOD || timeSinceLastSeen > GRACE_PERIOD) {
                console.log(`[${instanceName}] Session ended (grace period expired): ${state.userName} - ${state.itemName} (${state.accumulatedDuration.toFixed(1)}s)`);
                await flushSession(state);
                activeSessions.delete(key);
                broadcastSessions();
                
                try {
                  const p = prisma as any;
                  if (p.embyLiveSession) {
                      await p.embyLiveSession.delete({ 
                          where: { 
                              sessionId_instanceId: { 
                                  sessionId: state.sessionId, 
                                  instanceId: state.instanceId 
                              } 
                          } 
                      });
                  }
                } catch (e: any) { console.error(`[${instanceName}] DB Error (Live Session Delete): ${e.message}`); }
            }
        }
    }
}

async function flushSession(state: SessionState) {
    // Explicitly tell frontend to remove this session from "Live" view
    // This ensures that even if we don't save a history log (e.g. < 10s), the UI clears immediately
    io.emit('session_removed', { 
        sessionId: state.sessionId, 
        instanceId: state.instanceId 
    });

    if (state.accumulatedDuration < 10) return; // Minimum 10s to log

    try {
        const prisma = getPrisma();
        const p = prisma as any;
        if (!p.embyActivityLog) {
            const models = Object.keys(p).filter(k => !k.startsWith('$') && !k.startsWith('_'));
            console.error(`[Tracker] Cannot save activity log: embyActivityLog model not found! Available models: ${models.join(', ')}`);
            return;
        }

        const newLog = await p.embyActivityLog.create({
            data: {
                instanceId: state.instanceId,
                source: state.source || 'emby',
                embyUserId: state.userId,
                userName: state.userName,
                itemId: state.itemId,
                itemName: state.itemName,
                itemType: state.itemType,
                startTime: state.startedAt,
                endTime: new Date(),
                playDuration: Math.round(state.accumulatedDuration),
                totalDuration: state.runTimeTicks,
                client: state.client,
                device: state.device,
                deviceId: state.deviceId,
                mediaInfo: JSON.stringify(state.mediaInfo)
            }
        });

        // Broadcast history update to all connected clients
        io.emit('history_update', {
            instanceId: state.instanceId,
            log: {
                ...newLog,
                sessionId: state.sessionId, // Pass this to help frontend cleanup
                isLive: false
            }
        });
    } catch (e: any) {
        console.error(`Failed to save activity log: ${e.message}`);
    }
}

function mapToLiveSession(state: SessionState, raw: any) {
    return {
        instanceId: state.instanceId,
        sessionId: state.sessionId,
        source: state.source || 'emby',
        userId: state.userId,
        userName: state.userName,
        client: state.client,
        device: state.device,
        deviceId: state.deviceId,
        applicationVersion: raw.ApplicationVersion,
        itemId: state.itemId,
        itemName: state.itemName,
        itemType: state.itemType,
        runTimeTicks: state.runTimeTicks,
        isPaused: state.isPaused,
        lastActivity: new Date(),
        startedAt: state.startedAt,
        playbackPosition: BigInt(raw.PlayState.PositionTicks || 0),
        accumulatedDuration: Math.round(state.accumulatedDuration)
    };
}

async function cleanupOrphanedSessions() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
        const prisma = getPrisma();
        const p = prisma as any;
        if (!p.embyLiveSession) return;

        // If a session hasn't been updated in 5 minutes, it's probably dead
        const orphaned = await p.embyLiveSession.findMany({
            where: { lastActivity: { lt: fiveMinutesAgo } }
        });

        for (const s of orphaned) {
            console.log(`Cleaning up orphaned session: ${s.sessionId} (Instance: ${s.instanceId})`);
            await p.embyLiveSession.delete({ 
                where: { 
                    sessionId_instanceId: { 
                        sessionId: s.sessionId, 
                        instanceId: s.instanceId 
                    } 
                } 
            });
            const sessionKey = `${s.instanceId}-${s.sessionId}`;
            activeSessions.delete(sessionKey);
            broadcastSessions();
        }
    } catch (e) { }
}

async function pollAllInstances() {
    // This is a fallback sync mechanism using HTTP API
    try {
        const prisma = getPrisma();
        const instances = await (prisma as any).instance.findMany();
        for (const inst of instances) {
            // Emby
            if (inst.embyUrl && inst.embyApiKey) {
                try {
                    const cleanUrl = inst.embyUrl.endsWith('/') ? inst.embyUrl.slice(0, -1) : inst.embyUrl;
                    const response = await fetch(`${cleanUrl}/Sessions?api_key=${inst.embyApiKey}`);
                    if (response.ok) {
                        const data = await response.json();
                        await processSessions(inst.id, inst.name, data, 'emby');
                    }
                } catch (e) { }
            }

            // Jellyfin
            if (inst.jellyfinUrl && inst.jellyfinApiKey) {
                try {
                    const cleanUrl = inst.jellyfinUrl.endsWith('/') ? inst.jellyfinUrl.slice(0, -1) : inst.jellyfinUrl;
                    const response = await fetch(`${cleanUrl}/Sessions?api_key=${inst.jellyfinApiKey}`);
                    if (response.ok) {
                        const data = await response.json();
                        await processSessions(inst.id, inst.name, data, 'jellyfin');
                    }
                } catch (e) { }
            }

            // Plex has its own polling already in connectToPlexInstance, 
            // but we could add a sync here if needed.
        }
    } catch (e) { }
}

// Start
startTracker();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  for (const conn of instanceConnections.values()) {
      if (conn.ws) conn.ws.close();
      if (conn.keepAlive) clearInterval(conn.keepAlive);
      if (conn.pollingInterval) clearInterval(conn.pollingInterval);
  }
  await getPrisma().$disconnect();
  process.exit(0);
});
