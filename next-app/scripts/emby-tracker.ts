import WebSocket from 'ws';
import dotenv from 'dotenv';
import { EmbyService } from '../lib/services/emby';
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
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"]
  }
});

const WS_PORT = process.env.TRACKER_WS_PORT || 3001;

server.listen(WS_PORT, () => {
  console.log(`[Tracker] WebSocket broadcast server listening on port ${WS_PORT}`);
});

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
interface InstanceConnection {
  ws: WebSocket | null;
  keepAlive?: NodeJS.Timeout;
  pollingInterval?: NodeJS.Timeout;
  embyUrl: string;
  embyApiKey: string;
}

const instanceConnections = new Map<number, InstanceConnection>();
const instanceUsers = new Map<number, Map<string, string>>(); // instanceId -> (userId -> userName)

async function startTracker() {
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

  /*
  // Clear existing live sessions from DB to start fresh and avoid "stuck" long durations from previous bugs
  const clearExistingSessions = async () => {
    try {
        const p = getPrisma() as any;
        if (p.embyLiveSession) {
            await p.embyLiveSession.deleteMany({});
            console.log(`[Tracker] Cleared existing live sessions from DB for fresh start.`);
        }
    } catch (e) { console.error(`[Tracker] Error clearing existing sessions: ${e}`); }
  };
  clearExistingSessions();
  */
  
  // Load existing live sessions from DB to memory to persist accumulatedDuration across tracker restarts
  const loadExistingSessions = async () => {
    try {
        const p = getPrisma() as any;
        if (p.embyLiveSession) {
            const existing = await p.embyLiveSession.findMany();
            console.log(`[Tracker] Loading ${existing.length} existing live sessions from DB...`);
            for (const s of existing) {
                const sessionKey = `${s.instanceId}-${s.sessionId}`;
                activeSessions.set(sessionKey, {
                    instanceId: s.instanceId,
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
      const isRecentlySeen = (now - state.lastSeen) < 15000; // 15s grace
      
      // Background cleanup for sessions marked for deletion
      if (state.markedForCleanup && (now - state.markedForCleanup > 1000)) { 
          console.log(`[Tracker] Background cleanup for session: ${state.userName} - ${state.itemName}`);
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
  console.log(`--- Syncing from Emby Plugins (Last ${days} days) ---`);
  try {
    const prisma = getPrisma();
    const instances = await (prisma as any).instance.findMany();
    for (const inst of instances) {
      try {
        const emby = new EmbyService(inst.embyUrl, inst.embyApiKey);
        
        // 1. Try Statistics Plugin first (user preference)
        let stats = await emby.getStatisticsStats(days);
        let pluginName = 'Statistics';

        // 2. If no data from Statistics, try Playback Reporting as fallback
        if (!stats || stats.length === 0) {
            const pbStats = await emby.getPlaybackReportingStats(days);
            if (pbStats && pbStats.length > 0) {
                stats = pbStats;
                pluginName = 'Playback Reporting';
            }
        }

        if (!stats || stats.length === 0) continue;

        // Pre-fetch item details for all unique item IDs to get TMDB IDs
        const uniqueItemIds = Array.from(new Set(stats.map((s: any) => s.ItemId || s.NowPlayingItemId).filter(Boolean))) as string[];
        const itemDetailsMap = new Map<string, any>();
        
        if (uniqueItemIds.length > 0) {
          console.log(`[${inst.name}] Fetching details for ${uniqueItemIds.length} items in batches...`);
          // Fetch in batches of 50 to avoid URL length limits
          for (let i = 0; i < uniqueItemIds.length; i += 50) {
            const batch = uniqueItemIds.slice(i, i + 50);
            const details = await emby.getItemsDetails(batch);
            console.log(`[${inst.name}] Batch ${i/50 + 1}: Received ${details.length} item details`);
            details.forEach((item: any) => {
              itemDetailsMap.set(String(item.Id), item);
            });
          }

          // Second pass: Fetch series details for episodes missing TMDB IDs
          const missingTmdbSeriesIds = new Set<string>();
          itemDetailsMap.forEach((item: any) => {
            const tmdbId = item?.ProviderIds?.Tmdb || item?.ProviderIds?.TMDB;
            if (!tmdbId && item.SeriesId) {
              missingTmdbSeriesIds.add(String(item.SeriesId));
            }
          });

          if (missingTmdbSeriesIds.size > 0) {
            const seriesIds = Array.from(missingTmdbSeriesIds);
            console.log(`[${inst.name}] Fetching details for ${seriesIds.length} parent series...`);
            for (let i = 0; i < seriesIds.length; i += 50) {
              const batch = seriesIds.slice(i, i + 50);
              const details = await emby.getItemsDetails(batch);
              details.forEach((item: any) => {
                itemDetailsMap.set(`series_${item.Id}`, item);
              });
            }
          }
        }

        let syncedCount = 0;
        let tmdbFoundCount = 0;
        const missingTmdbItems = new Set<string>();
        for (const s of stats) {
          const itemId = String(s.ItemId || s.NowPlayingItemId);
          const itemDetail = itemDetailsMap.get(itemId);
          let tmdbId = itemDetail?.ProviderIds?.Tmdb || itemDetail?.ProviderIds?.TMDB;

          // Fallback to series TMDB ID if it's an episode
          if (!tmdbId && itemDetail?.SeriesId) {
            const seriesDetail = itemDetailsMap.get(`series_${itemDetail.SeriesId}`);
            tmdbId = seriesDetail?.ProviderIds?.Tmdb || seriesDetail?.ProviderIds?.TMDB;
          }

          if (tmdbId) {
            tmdbFoundCount++;
          } else if (itemDetail) {
            // Log once per unique item that is missing TMDB
            if (!missingTmdbItems.has(itemId)) {
                missingTmdbItems.add(itemId);
                console.log(`[${inst.name}] Item missing TMDB: ${itemDetail.Name} (Type: ${itemDetail.Type}, SeriesId: ${itemDetail.SeriesId})`);
            }
          }
          
          // Map plugin fields to our model
          const startTime = new Date(s.DateCreated || s.ActivityDateInserted || s.Timestamp);
          const playDuration = Math.round(s.PlayDuration || 0);
          
          if (playDuration < 10) continue; 

          const embyUserId = s.UserId;
          const itemName = s.ItemName || s.Name || 'Unknown';

          // Get real user name from cache if possible
          const cachedUserName = instanceUsers.get(inst.id)?.get(embyUserId);
          const userName = s.UserName || s.User || cachedUserName || 'Unknown';

          // Filter out junk data like theme songs or unknown items
          if (itemName.includes('Not Known') || itemName.toLowerCase().includes('theme')) {
              continue;
          }

            const exists = await (prisma as any).embyActivityLog.findFirst({
            where: {
              instanceId: inst.id,
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
                instanceId: inst.id,
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
          } else {
            // If exists but missing TMDB ID or totalDuration, update it
            const existingMediaInfo = typeof exists.mediaInfo === 'string' ? JSON.parse(exists.mediaInfo) : (exists.mediaInfo || {});
            const needsTmdbUpdate = !existingMediaInfo.tmdbId && tmdbId;
            const needsDurationUpdate = !exists.totalDuration && itemDetail?.RunTimeTicks;

            if (needsTmdbUpdate || needsDurationUpdate) {
              await (prisma as any).embyActivityLog.update({
                where: { id: exists.id },
                data: {
                  totalDuration: needsDurationUpdate ? BigInt(itemDetail.RunTimeTicks) : exists.totalDuration,
                  mediaInfo: JSON.stringify({
                    ...existingMediaInfo,
                    tmdbId: needsTmdbUpdate ? tmdbId : existingMediaInfo.tmdbId,
                    seriesId: itemDetail?.SeriesId || existingMediaInfo.seriesId,
                    seriesName: itemDetail?.SeriesName || existingMediaInfo.seriesName,
                    seasonName: itemDetail?.SeasonName || existingMediaInfo.seasonName,
                    episodeIndex: itemDetail?.IndexNumber || existingMediaInfo.episodeIndex,
                    seasonIndex: itemDetail?.ParentIndexNumber || existingMediaInfo.seasonIndex
                  })
                }
              });
            }
          }
        }
        if (syncedCount > 0 || tmdbFoundCount > 0) {
          console.log(`[${inst.name}] Synced ${syncedCount} new logs, found TMDB IDs for ${tmdbFoundCount}/${stats.length} logs from ${pluginName} plugin`);
        }
      } catch (err: any) {
        // Only log if it's not a 404 (plugin missing)
        if (err.response?.status !== 404) {
           console.error(`[${inst.name}] Failed to sync from plugins:`, err.message);
        }
      }
    }
  } catch (err: any) {
    console.error('Error in syncFromPlugins:', err.message);
  }
}

async function fixUnknownUsersInDB(instanceId: number, userMap: Map<string, string>) {
    try {
        const prisma = getPrisma() as any;
        if (!prisma.embyActivityLog) return;

        // Find logs for this instance with "Unknown" or "UNKNOWN" or empty userName
        const logsToFix = await prisma.embyActivityLog.findMany({
            where: {
                instanceId,
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
            console.log(`[Tracker] Fixed ${fixedCount} "Unknown" logs for instance ${instanceId} using user map.`);
        }
    } catch (e: any) {
        console.error(`[Tracker] Error fixing unknown users in DB: ${e.message}`);
    }
}

async function refreshInstances() {
  try {
    const prisma = getPrisma();
    const instances = await (prisma as any).instance.findMany();
    const activeIds = new Set(instances.map((i: any) => i.id));

    // Refresh user cache for all active instances
    for (const inst of instances) {
        try {
            const emby = new EmbyService(inst.embyUrl, inst.embyApiKey);
            const users = await emby.getUsers();
            if (users && Array.isArray(users)) {
                const userMap = new Map<string, string>();
                users.forEach((u: any) => {
                    userMap.set(u.Id, u.Name);
                });
                instanceUsers.set(inst.id, userMap);
                console.log(`[Tracker] Cached ${userMap.size} users for instance [${inst.name}]`);
                
                // Attempt to fix existing "Unknown" or "UNKNOWN" logs in DB for this instance
                await fixUnknownUsersInDB(inst.id, userMap);
            }
        } catch (e: any) {
            console.error(`[Tracker] Failed to refresh users for instance [${inst.name}]: ${e.message}`);
        }
    }

    // Close connections for removed or updated instances
    for (const [id, conn] of instanceConnections.entries()) {
      const inst = instances.find((i: any) => i.id === id);
      const isRemoved = !activeIds.has(id);
      const isUpdated = inst && (inst.embyUrl !== conn.embyUrl || inst.embyApiKey !== conn.embyApiKey);

      if (isRemoved || isUpdated) {
        console.log(`Closing connection for instance ${id} (${isRemoved ? 'removed' : 'updated'} in DB)`);
        if (conn.ws) conn.ws.close();
        if (conn.keepAlive) clearInterval(conn.keepAlive);
        if (conn.pollingInterval) clearInterval(conn.pollingInterval);
        instanceConnections.delete(id);
      }
    }

    // Connect to new or updated instances
    for (const inst of instances) {
      if (!instanceConnections.has(inst.id)) {
        connectToInstance(inst);
      }
    }
  } catch (err: any) {
    console.error(`Error refreshing instances: ${err.message}`);
  }
}

function connectToInstance(inst: any) {
  const baseUrl = inst.embyUrl.endsWith('/') ? inst.embyUrl.slice(0, -1) : inst.embyUrl;
  const wsUrl = baseUrl.replace(/^http/, 'ws') + `/embywebsocket?api_key=${inst.embyApiKey}&deviceId=NextAppTracker&deviceName=NextAppTracker&format=json`;
  
  console.log(`Connecting to instance [${inst.name}] at ${inst.embyUrl}`);
  
  const ws = new WebSocket(wsUrl);
  let keepAlive: NodeJS.Timeout;
  let hasWSError = false;

  ws.on('open', () => {
    console.log(`[${inst.name}] WebSocket Connected`);
    ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,1500' }));
    
    keepAlive = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ MessageType: 'KeepAlive' }));
      }
    }, 30000);

    // If it was polling, stop it
    const existing = instanceConnections.get(inst.id);
    if (existing?.pollingInterval) clearInterval(existing.pollingInterval);

    instanceConnections.set(inst.id, { ws, keepAlive, embyUrl: inst.embyUrl, embyApiKey: inst.embyApiKey });
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.MessageType === 'Sessions') {
        await processSessions(inst.id, inst.name, msg.Data);
      } else if (msg.MessageType === 'ForceKeepAlive') {
        ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,1500' }));
      }
    } catch (err: any) {
      console.error(`[${inst.name}] Error processing message: ${err.message}`);
    }
  });

  ws.on('close', (code, reason) => {
    if (keepAlive) clearInterval(keepAlive);
    console.log(`[${inst.name}] WebSocket Disconnected (Code: ${code}). Reason: ${reason || 'None'}`);
    
    // Only try to reconnect if we haven't switched to polling
    const conn = instanceConnections.get(inst.id);
    if (!conn?.pollingInterval) {
        console.log(`[${inst.name}] Reconnecting in 5s...`);
        instanceConnections.delete(inst.id);
        setTimeout(() => {
            (getPrisma() as any).instance.findUnique({ where: { id: inst.id } }).then((exists: any) => {
                if (exists) connectToInstance(inst);
            }).catch((e: any) => console.error(`[${inst.name}] Reconnect failed: ${e.message}`));
        }, 5000);
    }
  });

  ws.on('error', (err: any) => {
    hasWSError = true;
    console.error(`[${inst.name}] WebSocket error: ${err.message}`);
    
    // Fallback to polling on any error if not already polling
    if (!instanceConnections.get(inst.id)?.pollingInterval) {
        console.warn(`[${inst.name}] Switching to HTTP Polling fallback due to WebSocket error.`);
        startPollingFallback(inst);
    }
    
    ws.close();
  });
}

function startPollingFallback(inst: any) {
    // Stop any existing WS/KeepAlive for this instance
    const existing = instanceConnections.get(inst.id);
    if (existing?.keepAlive) clearInterval(existing.keepAlive);
    if (existing?.pollingInterval) clearInterval(existing.pollingInterval);

    console.log(`[${inst.name}] Starting HTTP Polling (every 2s)`);
    
    const pollingInterval = setInterval(async () => {
        try {
            const emby = new EmbyService(inst.embyUrl, inst.embyApiKey);
            const sessions = await emby.getSessions();
            if (sessions) {
                await processSessions(inst.id, inst.name, sessions);
            }
        } catch (e: any) {
            console.error(`[${inst.name}] Polling error:`, e.message);
        }
    }, 2000);

    instanceConnections.set(inst.id, { ws: null, pollingInterval, embyUrl: inst.embyUrl, embyApiKey: inst.embyApiKey });
}

async function processSessions(instanceId: number, instanceName: string, sessions: any[]) {
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

      for (const s of sessions) {
    if (!s.NowPlayingItem) continue;
    
    // Filter out junk data like theme songs or unknown items
    const itemName = s.NowPlayingItem.Name || '';
    if (itemName.includes('Not Known') || itemName.toLowerCase().includes('theme')) {
        continue;
    }
    
    const sessionId = s.Id;
    const sessionKey = `${instanceId}-${sessionId}`;
    currentSessionIds.add(sessionKey);
    
    // Robust pause detection: check IsPaused flag OR if the playback status is explicitly "Paused"
    // Also consider it paused if there is no PlayState (shouldn't happen for active playback)
    const isPaused = s.PlayState?.IsPaused || s.PlayState?.Status === 'Paused' || !s.PlayState;
    
    const currentPositionTicks = s.PlayState?.PositionTicks ? BigInt(s.PlayState.PositionTicks) : null;
    
    let sessionState = activeSessions.get(sessionKey);

    if (!sessionState) {
      console.log(`[${instanceName}] New Session: ${s.UserName} playing ${s.NowPlayingItem.Name}`);
      
      const cachedUserName = instanceUsers.get(instanceId)?.get(s.UserId);
      const userName = s.UserName || cachedUserName || 'Unknown';
      
      sessionState = {
        instanceId,
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
            seasonName: s.NowPlayingItem.SeasonName,
            episodeTitle: s.NowPlayingItem.Name,
            seriesName: s.NowPlayingItem.SeriesName,
            seriesId: s.NowPlayingItem.SeriesId,
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
          const cachedUserName = instanceUsers.get(instanceId)?.get(s.UserId);
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
    // We use a grace period of 1 second to handle temporary API drops
    const GRACE_PERIOD = 1000;
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
            // We can call /Sessions on Emby API to get current state
            // and feed it to processSessions to ensure consistency
            try {
                const response = await fetch(`${inst.embyUrl}/Sessions?api_key=${inst.embyApiKey}`);
                if (response.ok) {
                    const data = await response.json();
                    await processSessions(inst.id, inst.name, data);
                }
            } catch (e) { }
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
