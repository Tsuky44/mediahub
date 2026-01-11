import WebSocket from 'ws';
import dotenv from 'dotenv';
import { EmbyService } from '../lib/services/emby';
import { getPrisma } from '../lib/prisma';

// Load environment variables
dotenv.config();

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
  accumulatedDuration: number; // in seconds
  isPaused: boolean;
  lastPositionTicks: bigint | null;
  client: string;
  device: string;
  deviceId: string;
  mediaInfo: any;
}

// Global state tracking
const activeSessions = new Map<string, SessionState>();
const instanceConnections = new Map<number, { ws: WebSocket | null, keepAlive?: NodeJS.Timeout, pollingInterval?: NodeJS.Timeout }>();

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

  // 5. Sync from plugins (Statistics or Playback Reporting) - DISABLED as requested
  // setInterval(() => syncFromPlugins(2), 15 * 60 * 1000);
  // Initial deep sync on start (1000 days = ~3 years)
  // syncFromPlugins(1000);
}

async function syncFromPlugins(days: number = 2) {
  console.log(`--- Syncing from Emby Plugins (Last ${days} days) ---`);
  try {
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

        let syncedCount = 0;
        for (const s of stats) {
          // Map plugin fields to our model
          const startTime = new Date(s.DateCreated || s.ActivityDateInserted);
          const playDuration = Math.round(s.PlayDuration || 0);
          
          if (playDuration < 10) continue; 

          const embyUserId = s.UserId;
          const itemId = s.ItemId || s.NowPlayingItemId;

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
                userName: s.UserName || s.User || 'Unknown',
                itemId,
                itemName: s.ItemName || s.Name || 'Unknown',
                itemType: s.ItemType || s.Type || 'Unknown',
                startTime,
                endTime: new Date(startTime.getTime() + playDuration * 1000),
                playDuration,
                client: s.ClientName || s.Client || 'Unknown',
                device: s.DeviceName || s.Device || 'Unknown',
                mediaInfo: JSON.stringify({
                  playbackMethod: s.PlaybackMethod || s.PlayMethod,
                  pluginSynced: true,
                  pluginSource: pluginName
                })
              }
            });
            syncedCount++;
          }
        }
        if (syncedCount > 0) {
          console.log(`[${inst.name}] Synced ${syncedCount} new logs from ${pluginName} plugin`);
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

async function refreshInstances() {
  try {
    const prisma = getPrisma();
    const instances = await (prisma as any).instance.findMany();
    const activeIds = new Set(instances.map((i: any) => i.id));

    // Close connections for removed instances
    for (const [id, conn] of instanceConnections.entries()) {
      if (!activeIds.has(id)) {
        console.log(`Closing connection for instance ${id} (removed from DB)`);
        if (conn.ws) conn.ws.close();
        if (conn.keepAlive) clearInterval(conn.keepAlive);
        if (conn.pollingInterval) clearInterval(conn.pollingInterval);
        instanceConnections.delete(id);
      }
    }

    // Connect to new instances
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
  const wsUrl = inst.embyUrl.replace(/^http/, 'ws') + `/embywebsocket?api_key=${inst.embyApiKey}&deviceId=NextAppTracker&deviceName=NextAppTracker&format=json`;
  
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

    instanceConnections.set(inst.id, { ws, keepAlive });
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

  ws.on('close', (code) => {
    if (keepAlive) clearInterval(keepAlive);
    
    // If we haven't already marked this as a permanent WS error, try to reconnect
    if (!hasWSError) {
        console.log(`[${inst.name}] WebSocket Disconnected (Code: ${code}). Reconnecting in 30s...`);
        instanceConnections.delete(inst.id);
        setTimeout(() => {
            (getPrisma() as any).instance.findUnique({ where: { id: inst.id } }).then((exists: any) => {
                if (exists) connectToInstance(inst);
            }).catch((e: any) => console.error(`[${inst.name}] Reconnect failed: ${e.message}`));
        }, 30000);
    }
  });

  ws.on('error', (err: any) => {
    // If WS returns 404, it means the endpoint is not supported by the proxy/server
    // Switch to polling fallback permanently for this session
    if (err.message.includes('404')) {
        console.warn(`[${inst.name}] WebSocket endpoint not found (404). Switching to HTTP Polling fallback.`);
        hasWSError = true;
        startPollingFallback(inst);
    } else {
        console.error(`[${inst.name}] WebSocket error: ${err.message}`);
    }
    
    ws.close();
  });
}

function startPollingFallback(inst: any) {
    // Stop any existing WS/KeepAlive for this instance
    const existing = instanceConnections.get(inst.id);
    if (existing?.keepAlive) clearInterval(existing.keepAlive);
    if (existing?.pollingInterval) clearInterval(existing.pollingInterval);

    console.log(`[${inst.name}] Starting HTTP Polling (every 20s)`);
    
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
    }, 20000);

    instanceConnections.set(inst.id, { ws: null, pollingInterval });
}

async function processSessions(instanceId: number, instanceName: string, sessions: any[]) {
  const now = Date.now();
  const currentSessionIds = new Set<string>();
  const prisma = getPrisma();

  for (const s of sessions) {
    if (!s.NowPlayingItem) continue;
    
    const sessionId = s.Id;
    currentSessionIds.add(sessionId);
    const isPaused = s.PlayState.IsPaused;
    
    let sessionState = activeSessions.get(sessionId);

    if (!sessionState) {
      console.log(`[${instanceName}] New Session: ${s.UserName} playing ${s.NowPlayingItem.Name}`);
      
      sessionState = {
        instanceId,
        sessionId,
        userId: s.UserId,
        userName: s.UserName,
        itemId: s.NowPlayingItem.Id,
        itemName: s.NowPlayingItem.Name,
        itemType: s.NowPlayingItem.Type,
        runTimeTicks: s.NowPlayingItem.RunTimeTicks ? BigInt(s.NowPlayingItem.RunTimeTicks) : null,
        startedAt: new Date(),
        lastUpdate: now,
        accumulatedDuration: 0,
        isPaused: isPaused,
        lastPositionTicks: s.PlayState.PositionTicks ? BigInt(s.PlayState.PositionTicks) : null,
        client: s.Client,
        device: s.DeviceName,
        deviceId: s.DeviceId,
        mediaInfo: {
            seasonName: s.NowPlayingItem.SeasonName,
            episodeTitle: s.NowPlayingItem.Name,
            seriesName: s.NowPlayingItem.SeriesName,
            episodeIndex: s.NowPlayingItem.IndexNumber,
            seasonIndex: s.NowPlayingItem.ParentIndexNumber
        }
      };
      
      activeSessions.set(sessionId, sessionState);

      try {
        const p = prisma as any;
        if (p.embyLiveSession) {
            await p.embyLiveSession.upsert({
                where: { sessionId },
                create: mapToLiveSession(sessionState, s),
                update: mapToLiveSession(sessionState, s)
            });
        } else {
            const models = Object.keys(p).filter(k => !k.startsWith('$') && !k.startsWith('_'));
            console.error(`[${instanceName}] Prisma model embyLiveSession not found! Available models: ${models.join(', ')}`);
        }
      } catch (e: any) { console.error(`[${instanceName}] DB Error (Live Session Upsert): ${e.message}`); }

    } else {
      // Update accumulated time
      const currentPositionTicks = s.PlayState.PositionTicks ? BigInt(s.PlayState.PositionTicks) : null;
      
      if (!sessionState.isPaused && currentPositionTicks !== null && sessionState.lastPositionTicks !== null) {
        const deltaTicks = currentPositionTicks - sessionState.lastPositionTicks;
        const deltaSeconds = Number(deltaTicks) / 10000000;
        
        // If delta is reasonable (0 to 600s), use it. 
        if (deltaSeconds > 0 && deltaSeconds < 600) {
          sessionState.accumulatedDuration += deltaSeconds;
        } else {
          // Fallback to wall-clock if ticks jump (seek) or are missing
          const wallDelta = (now - sessionState.lastUpdate) / 1000;
          if (wallDelta > 0 && wallDelta < 300) {
            sessionState.accumulatedDuration += wallDelta;
          }
        }
      } else if (!sessionState.isPaused) {
        // Fallback if ticks are missing
        const wallDelta = (now - sessionState.lastUpdate) / 1000;
        if (wallDelta > 0 && wallDelta < 300) {
          sessionState.accumulatedDuration += wallDelta;
        }
      }

      sessionState.lastPositionTicks = currentPositionTicks;
      sessionState.isPaused = isPaused;
      sessionState.lastUpdate = now;
      
      // Item change in same session
      if (sessionState.itemId !== s.NowPlayingItem.Id) {
          console.log(`[${instanceName}] Session ${sessionId} changed item. Flushing old, starting new.`);
          await flushSession(sessionState);
          
          sessionState.itemId = s.NowPlayingItem.Id;
          sessionState.itemName = s.NowPlayingItem.Name;
          sessionState.itemType = s.NowPlayingItem.Type;
          sessionState.runTimeTicks = s.NowPlayingItem.RunTimeTicks ? BigInt(s.NowPlayingItem.RunTimeTicks) : null;
          sessionState.accumulatedDuration = 0;
          sessionState.lastPositionTicks = currentPositionTicks;
          sessionState.startedAt = new Date();
          sessionState.mediaInfo = {
            seasonName: s.NowPlayingItem.SeasonName,
            episodeTitle: s.NowPlayingItem.Name,
            seriesName: s.NowPlayingItem.SeriesName,
            episodeIndex: s.NowPlayingItem.IndexNumber,
            seasonIndex: s.NowPlayingItem.ParentIndexNumber
          };
      }

      activeSessions.set(sessionId, sessionState);

      try {
        const p = prisma as any;
        if (p.embyLiveSession) {
            await p.embyLiveSession.update({
                where: { sessionId },
                data: {
                    isPaused,
                    lastActivity: new Date(),
                    playbackPosition: BigInt(s.PlayState.PositionTicks || 0),
                    itemId: sessionState.itemId,
                    itemName: sessionState.itemName,
                    itemType: sessionState.itemType
                }
            });
        }
      } catch (e) { /* ignore update errors */ }
    }
  }

  // Ended sessions detection
  for (const [sid, state] of activeSessions) {
    // Only check sessions for THIS instance
    if (state.instanceId === instanceId && !currentSessionIds.has(sid)) {
      if (!state.isPaused) {
         const delta = (now - state.lastUpdate) / 1000;
         if (delta > 0 && delta < 60) {
             state.accumulatedDuration += delta;
         }
      }

      if (state.accumulatedDuration > 1) {
          console.log(`[${instanceName}] Session Ended: ${state.userName} - ${state.itemName} (${state.accumulatedDuration.toFixed(1)}s)`);
          await flushSession(state);
      } else {
          // If session was extremely short, just silent delete from live sessions
          // console.debug(`[${instanceName}] Session Discarded (too short): ${state.userName} - ${state.itemName} (${state.accumulatedDuration.toFixed(1)}s)`);
      }
      
      activeSessions.delete(sid);
      
      try {
        const p = prisma as any;
        if (p.embyLiveSession) {
            await p.embyLiveSession.delete({ where: { sessionId: sid } });
        }
      } catch (e) { }
    }
  }
}

async function flushSession(state: SessionState) {
    if (state.accumulatedDuration < 10) return; // Minimum 10s to log

    try {
        const prisma = getPrisma();
        const p = prisma as any;
        if (!p.embyActivityLog) {
            const models = Object.keys(p).filter(k => !k.startsWith('$') && !k.startsWith('_'));
            console.error(`[Tracker] Cannot save activity log: embyActivityLog model not found! Available models: ${models.join(', ')}`);
            return;
        }

        await p.embyActivityLog.create({
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
        playbackPosition: BigInt(raw.PlayState.PositionTicks || 0)
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
            console.log(`Cleaning up orphaned session: ${s.sessionId}`);
            await p.embyLiveSession.delete({ where: { sessionId: s.sessionId } });
            activeSessions.delete(s.sessionId);
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
