import dotenv from 'dotenv';
// Load environment variables before other imports
dotenv.config();

import WebSocket from 'ws';
import { EmbyService } from '../lib/services/emby';
import { PlexService } from '../lib/services/plex';
import { getPrisma } from '../lib/prisma';
import { Server } from 'socket.io';
import http from 'http';
import Docker from 'dockerode';
import { Writable, Readable, Duplex } from 'stream';
import { decode, getToken } from 'next-auth/jwt';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { console.error(...args); };
const warn = (...args: unknown[]) => { console.warn(...args); };

function usesSecureSessionCookie(): boolean {
  if (process.env.NEXTAUTH_URL?.startsWith('https://')) return true;
  return process.env.NODE_ENV === 'production';
}

function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

/** Réassemble les cookies NextAuth chunkés (session-token.0, .1, …). */
function getSessionTokenFromCookies(cookies: Record<string, string>): string | null {
  const cookieName = usesSecureSessionCookie()
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  if (cookies[cookieName]) return cookies[cookieName];

  const chunks: string[] = [];
  let i = 0;
  while (cookies[`${cookieName}.${i}`]) {
    chunks.push(cookies[`${cookieName}.${i}`]);
    i++;
  }
  return chunks.length > 0 ? chunks.join('') : null;
}

async function authenticateSocket(socket: any) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    warn('[Tracker] NEXTAUTH_SECRET manquant — auth socket impossible');
    return null;
  }

  const secureCookie = usesSecureSessionCookie();

  // 1. getToken (gère les cookies chunkés si headers présents)
  const fromGetToken = await getToken({
    req: socket.request,
    secret,
    secureCookie,
  });
  if (fromGetToken?.sub) return fromGetToken;

  // 2. Fallback : parse manuel du header Cookie (certains proxies le transmettent ainsi)
  const cookieHeader = socket.request?.headers?.cookie as string | undefined;
  const rawToken = getSessionTokenFromCookies(parseCookieHeader(cookieHeader));
  if (!rawToken) return null;

  return decode({ token: rawToken, secret });
}


const dockerOptions: Record<string, string> = {};
let docker: Docker;

function initDocker(host?: string) {
  const options: Record<string, string> = {};
  const dockerHost = host || process.env.DOCKER_HOST;

  if (dockerHost) {
    if (dockerHost.startsWith('tcp://')) {
      const url = new URL(dockerHost.replace('tcp://', 'http://'));
      options.host = url.hostname;
      options.port = url.port;
      log(`[Tracker] Dockerode initialized with TCP: ${options.host}:${options.port}`);
    } else {
      options.socketPath = dockerHost;
      log(`[Tracker] Dockerode initialized with socket: ${options.socketPath}`);
    }
  } else {
    options.socketPath = '/var/run/docker.sock';
    log(`[Tracker] Dockerode initialized with default socket: ${options.socketPath}`);
  }
  docker = new Docker(options);
}

// Initial placeholder init
initDocker();

// Patch 14: Pas de prototype patch ici — les valeurs BigInt sont converties en Number
// explicitement avant tout emit Socket.io ou stockage dans l'interface SessionState.

// Socket.io Server Setup
const isFullSync = process.argv.includes('--full-sync');
const server = http.createServer();

// Restreindre l'origine CORS au domaine de l'app si disponible.
// Utilisation de '*' par défaut pour une compatibilité totale dans le conteneur unifié.
const CORS_ORIGIN = '*';

// Auth socket : optionnelle à la connexion, obligatoire uniquement pour les actions sensibles
// (terminal Docker, logs). Les sessions en direct sont en lecture seule.
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

async function attachSessionIfPresent(socket: any): Promise<void> {
  const clientAddress = socket.handshake.address as string;

  if (LOOPBACK_ADDRESSES.has(clientAddress) && socket.handshake.auth?.isServer) {
    socket.data.isServer = true;
    log('[Tracker] Internal server socket connected');
    return;
  }

  const decoded = await authenticateSocket(socket);
  if (decoded?.sub) {
    socket.data.userId = decoded.sub;
    socket.data.email = decoded.email;
    log(`[Tracker] Session attachée pour ${decoded.email}`);
  }
}

function requireAuthenticatedSocket(socket: any): boolean {
  if (socket.data.userId) return true;
  return false;
}

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const WS_PORT = process.env.TRACKER_WS_PORT || 3005;

// User Socket Mapping
const userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

if (!isFullSync) {
    server.listen(WS_PORT, () => {
      log(`[Tracker] WebSocket broadcast server listening on port ${WS_PORT}`);
    });
}

io.on('connection', async (socket) => {
  await attachSessionIfPresent(socket);

  const userId = socket.data.userId as string;
  const email = socket.data.email as string;
  
  if (userId) {
      if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
      }
      userSockets.get(userId)?.add(socket.id);
      log(`[Tracker] User ${email} (${userId}) connected on socket ${socket.id}`);
  } else {
      log(`[Tracker] Client connected without userId: ${socket.id}`);
  }

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
  activeSessions.forEach(sessionState => {
      log(`[Tracker] Sending history_init for ${sessionState.userName}: ${sessionState.accumulatedDuration}s`);
      socket.emit('history_update', {
          log: {
              id: `live-${sessionState.sessionId}`,
              sessionId: sessionState.sessionId,
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

  // Server Broadcast Handler (interne uniquement)
  socket.on('server_broadcast_notification', (data: { userIds: (string|number)[], notification: Record<string, unknown> }) => {
    if (!socket.data.isServer) {
      warn(`[Tracker] server_broadcast_notification refusé (non-interne): ${socket.id}`);
      return;
    }
    log(`[Tracker] Broadcasting notification to users: ${data.userIds.join(', ')}`);
    data.userIds.forEach(uid => {
        const uidStr = String(uid);
        const userSocketSet = userSockets.get(uidStr);
        if (userSocketSet) {
            userSocketSet.forEach(sid => {
                io.to(sid).emit('notification', data.notification);
            });
        }
    });
  });

  // Docker Logs Handling
  let logStream: unknown = null;
  let logWritable: Writable | null = null;
  // Docker Terminal Handling
  let terminalStream: unknown = null;
  let terminalExec: unknown = null;

  socket.on('start_terminal_session', async (rawContainerId: unknown) => {
    if (!requireAuthenticatedSocket(socket)) {
      socket.emit('terminal_error', 'Non autorisé');
      return;
    }
    try {
      const containerId = String(rawContainerId).trim();
      log(`[Tracker] Client ${socket.id} requested terminal for container: "${containerId}"`);

      // Cleanup existing session if any
      if (terminalStream) {
        (terminalStream as { end: () => void }).end();
        (terminalStream as { destroy: () => void }).destroy();
        terminalStream = null;
      }

      // Re-initialize docker (reuse logic from logs)
      const prisma = getPrisma();
      if (!process.env.DOCKER_HOST) {
          // Check Settings model
          if (prisma.setting) {
              const dockerHostSetting = await prisma.setting.findUnique({
                where: { key: 'docker_host' }
              });
              if (dockerHostSetting?.value) {
                initDocker(dockerHostSetting.value);
              }
          }
      }

      const container = docker.getContainer(containerId);
      
      // FIX: Ensure container exists and is running before exec
      const containerInfo = await container.inspect();
      if (!containerInfo.State.Running) {
          throw new Error('Le conteneur doit être en cours d\'exécution pour accéder à la console');
      }

      // Create exec instance
      // Try bash first, fallback to sh
      const exec = await container.exec({
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: ['/bin/sh', '-c', 'if [ -x /bin/bash ]; then exec /bin/bash; else exec /bin/sh; fi'],
        Env: ['TERM=xterm-256color']
      });

      terminalExec = exec;

      // Start exec instance
      const stream = await exec.start({
        hijack: true,
        stdin: true,
        // Detach: false,
        // Tty: true
      });

      terminalStream = stream;

      // Handle output from container -> frontend
      // Dockerode stream is a duplex stream
      stream.on('data', (chunk: Buffer) => {
        socket.emit('terminal_output', chunk.toString('utf-8'));
      });

      stream.on('end', () => {
        socket.emit('terminal_exit');
        terminalStream = null;
      });

      stream.on('error', (err: Error) => {
        error(`[Tracker] Terminal stream error: ${(err as Error).message}`);
        socket.emit('terminal_error', (err as Error).message);
      });

      log(`[Tracker] Terminal session started for ${containerId}`);

    } catch (err) {
      error(`[Tracker] Error starting terminal: ${(err as Error).message}`);
      socket.emit('terminal_error', (err as Error).message);
    }
  });

  socket.on('terminal_input', (data: string) => {
    if (terminalStream) {
      (terminalStream as { write: (data: string) => void }).write(data);
    }
  });

  socket.on('terminal_resize', (size: { cols: number, rows: number }) => {
    if (terminalExec) {
      (terminalExec as { resize: (opts: { h: number; w: number }) => void }).resize({ h: size.rows, w: size.cols });
    }
  });

  socket.on('subscribe_docker_logs', async (rawContainerId: unknown) => {
    if (!requireAuthenticatedSocket(socket)) {
      socket.emit('docker_log_error', 'Non autorisé');
      return;
    }
    try {
      const containerId = String(rawContainerId).trim();
      log(`[Tracker] Client ${socket.id} subscribed to logs for container: "${containerId}"`);

      if (logStream) {
        (logStream as { destroy: () => void }).destroy();
        logStream = null;
      }
      
      // Re-initialize docker before using it to ensure we have the latest host
      const prisma = getPrisma();
      if (!process.env.DOCKER_HOST) {
        // Check Settings model
        if (prisma.setting) {
            const dockerHostSetting = await prisma.setting.findUnique({
              where: { key: 'docker_host' }
            });
            if (dockerHostSetting?.value) {
              initDocker(dockerHostSetting.value);
            }
        }
      }

      // Create a writable stream that emits to socket
      logWritable = new Writable({
        write(chunk, encoding, callback) {
          socket.emit('docker_log_chunk', chunk.toString('utf-8'));
          callback();
        }
      });

      const container = docker.getContainer(containerId);
      log(`[Tracker] Getting logs for container object: ${container.id || containerId}`);
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100
      });
      
      logStream = stream;
      
      // Demultiplex stream to remove header bytes and separate stdout/stderr
      container.modem.demuxStream(stream, logWritable, logWritable);

      stream.on('end', () => {
        socket.emit('docker_log_end');
      });

      stream.on('error', (err: Error) => {
        error(`[Tracker] Log stream error: ${(err as Error).message}`);
        socket.emit('docker_log_error', (err as Error).message);
      });

    } catch (err) {
      error(`[Tracker] Error streaming logs: ${(err as Error).message}`);
      socket.emit('docker_log_error', (err as Error).message);
    }
  });

  socket.on('unsubscribe_docker_logs', () => {
    log(`[Tracker] Client ${socket.id} unsubscribed from logs`);
    if (logStream) {
      (logStream as { destroy: () => void }).destroy();
      logStream = null;
    }
    if (logWritable) {
        logWritable.end();
        logWritable = null;
    }
  });

  socket.on('disconnect', () => {
    if (userId) {
        const userSet = userSockets.get(userId);
        if (userSet) {
            userSet.delete(socket.id);
            if (userSet.size === 0) {
                userSockets.delete(userId);
            }
        }
    }

    if (logStream) {
      (logStream as { destroy: () => void }).destroy();
    }
    log(`[Tracker] Frontend client disconnected: ${socket.id}`);
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
  source: string; // emby, jellyfin, plex
  sessionId: string;
  userId: string;
  userName: string;
  itemId: string;
  itemName: string;
  itemType: string;
  runTimeTicks: number | null;
  startedAt: Date;
  lastUpdate: number; // timestamp in ms
  lastHistoryEmit?: number; // timestamp in ms
  lastSeen: number;
  accumulatedDuration: number; // in seconds
  lastAuthAccumulated: number; // The confirmed accumulated duration from the last Emby update
  isPaused: boolean;
  lastPositionTicks: number | null;
  lastAuthTicks: number | null; // The position ticks from the last Emby update
  lastAuthTime: number; // Timestamp of the last Emby update
  markedForCleanup: number | null; // Timestamp when session was first marked as missing
  client: string;
  device: string;
  deviceId: string;
  mediaInfo: Record<string, unknown>;
  seriesName?: string;
  seasonName?: string;
  episodeIndex?: number;
  seasonIndex?: number;
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

// We now only support ONE active connection per service type (or even just one total)
// But for compatibility with existing code structure, we can keep a simple map or object.
let currentServiceConnection: ServiceConnection | null = null;
let currentServiceType: 'emby' | 'jellyfin' | 'plex' = 'emby';

async function startTracker() {
  log('--- Emby Mono-Instance Tracker Starting ---');
  
  const p = getPrisma();
  
  // Try to find a Docker Host in settings if not in ENV
  if (!process.env.DOCKER_HOST) {
    let dockerHostFound = false;
    
    // First check the Settings model
    if (p.setting) {
      const dockerHostSetting = await p.setting.findUnique({
        where: { key: 'docker_host' }
      });
      if (dockerHostSetting?.value) {
        log(`[Tracker] Initializing Dockerode from Setting model: ${dockerHostSetting.value}`);
        initDocker(dockerHostSetting.value);
        dockerHostFound = true;
      }
    }

    if (!dockerHostFound) {
      log(`[Tracker] No docker_host found in DB (Settings model).`);
    }
  }

  // 1. Initial connection
  await refreshConnection();

  // 2. Periodically refresh connection (every 5 minutes) to pick up setting changes
  setInterval(refreshConnection, 5 * 60 * 1000);

  // 3. Periodically cleanup orphaned live sessions (every 1 minute)
  setInterval(cleanupOrphanedSessions, 60 * 1000);

  // 4. Periodic polling sync (fallback if WS misses messages)
  setInterval(pollService, 5 * 60 * 1000);
  
  // Load existing live sessions from DB to memory to persist accumulatedDuration across tracker restarts
  const loadExistingSessions = async () => {
    try {
        const p = getPrisma();

        if ((p as unknown as Record<string, unknown>).embyLiveSession) {
            // DISABLED: embyLiveSession model removed
            /*
            const existing = await p.embyLiveSession.findMany();
            log(`[Tracker] Loading ${existing.length} existing live sessions from DB...`);
            for (const s of existing) {
                // Use sessionId as key (unique now)
                const sessionKey = s.sessionId;
                activeSessions.set(sessionKey, {
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
            */
        }
    } catch (e) { error(`[Tracker] Error loading existing sessions: ${e}`); }
  };
  await loadExistingSessions();


  // 6. Real-time broadcast and interpolation (every 1 second)
  setInterval(async () => {
    const now = Date.now();
    let hasChanges = false;
    
    // Use Array.from(entries) to safely delete while iterating if needed, 
    // although we mostly update map in place.
    for (const [key, session] of activeSessions.entries()) {
      // Interpolate time only if playing and not paused
      if (!session.isPaused) {
        // Calculate projected duration based on last authoritative update + time elapsed
        // This prevents double counting errors from incremental addition
        const timeSinceLastAuth = (now - session.lastAuthTime) / 1000;
        session.accumulatedDuration = session.lastAuthAccumulated + timeSinceLastAuth;
        
        // Add 1 second (in ticks) to position for display purposes
        // 1 second = 10,000,000 ticks
        if (session.lastPositionTicks !== null) {
          session.lastPositionTicks = session.lastPositionTicks + 10000000;
        }
        
        hasChanges = true;
      }
      
      // Check if we should emit a history update (every 10s or if duration changed significantly)
      // We'll just emit every 10s for active playing sessions
      const timeSinceLastEmit = now - (session.lastHistoryEmit || 0);
      if (timeSinceLastEmit > 10000 && !session.isPaused) {
         session.lastHistoryEmit = now;
         io.emit('history_update', {
             log: {
                id: `live-${session.sessionId}`,
                sessionId: session.sessionId,
                embyUserId: session.userId,
                userName: session.userName,
                itemId: session.itemId,
                itemName: session.itemName,
                itemType: session.itemType,
                startTime: session.startedAt,
                endTime: new Date(),
                playDuration: Math.round(session.accumulatedDuration),
                totalDuration: session.runTimeTicks ? Number(session.runTimeTicks) : null,
                client: session.client,
                device: session.device,
                deviceId: session.deviceId,
                mediaInfo: session.mediaInfo,
                source: session.source,
                isLive: true,
                tmdbId: ((session.mediaInfo?.ProviderIds as Record<string, unknown> | undefined)?.Tmdb) ? String((session.mediaInfo?.ProviderIds as Record<string, unknown>)?.Tmdb) : null,
                seasonIndex: session.seasonIndex,
                episodeIndex: session.episodeIndex
             }
         });
      }
    }
    
    if (hasChanges) {
      broadcastSessions();
    }
  }, 1000);
}

async function getSetting(key: string): Promise<string | null> {
    const p = getPrisma();
    // 1. Env
    const envKey = key.toUpperCase();
    if (process.env[envKey]) return process.env[envKey]!;
    
    // 2. DB
    if (p.setting) {
        const s = await p.setting.findUnique({ where: { key } });
        if (s?.value) return s.value;
    }
    return null;
}

async function refreshConnection() {
    try {
        const embyUrl = await getSetting('emby_url');
        const embyKey = await getSetting('emby_api_key');
        
        if (!embyUrl || !embyKey) {
            log('[Tracker] Missing Emby configuration (URL or API Key). Waiting...');
            return;
        }

        // Check if config changed
        if (currentServiceConnection && 
            currentServiceConnection.url === embyUrl && 
            currentServiceConnection.key === embyKey) {
            // No change
            return;
        }

        log(`[Tracker] Configuration updated. Connecting to ${embyUrl}...`);
        
        // Cleanup old connection
        if (currentServiceConnection) {
            if (currentServiceConnection.ws) {
                currentServiceConnection.ws.close();
            }
            if (currentServiceConnection.keepAlive) clearInterval(currentServiceConnection.keepAlive);
            if (currentServiceConnection.pollingInterval) clearInterval(currentServiceConnection.pollingInterval);
        }

        // Setup new connection
        const wsUrl = `${embyUrl.replace(/^http/, 'ws')}/embywebsocket?api_key=${embyKey}&deviceId=MediaHubTracker`;
        
        const ws = new WebSocket(wsUrl);
        
        currentServiceConnection = {
            ws,
            url: embyUrl,
            key: embyKey,
            type: 'emby'
        };

        ws.on('open', () => {
            log(`[Tracker] Connected to Emby WebSocket: ${embyUrl}`);
            // Start Identity
            ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,1000' }));
            
            // Keep Alive every 30s
            currentServiceConnection!.keepAlive = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ MessageType: 'KeepAlive' }));
                }
            }, 30000);
        });

        ws.on('message', async (data: string) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.MessageType === 'Sessions') {
                    handleSessionsUpdate(msg.Data);
                } else if (msg.MessageType === 'SessionEnded') {
                    handleSessionEnded(msg.Data);
                }
            } catch (e) {
                error('[Tracker] Error parsing WS message:', e);
            }
        });

        ws.on('error', (e) => {
            error(`[Tracker] WebSocket error: ${e.message}`);
        });
        
        ws.on('close', () => {
            log(`[Tracker] WebSocket disconnected. Will retry on next refresh cycle.`);
            if (currentServiceConnection) {
                 if (currentServiceConnection.keepAlive) clearInterval(currentServiceConnection.keepAlive);
                 currentServiceConnection.ws = null;
            }
        });

    } catch (e) {
        error('[Tracker] Error in refreshConnection:', e);
    }
}

interface EmbyNowPlayingItem {
  Id?: string | number
  Name?: string
  SeriesName?: string
  SeasonName?: string
  IndexNumber?: number
  ParentIndexNumber?: number
  Type?: string
  RunTimeTicks?: number
  ProviderIds?: Record<string, unknown>
  MediaSources?: Array<Record<string, unknown>>
  MediaStreams?: Array<Record<string, unknown>>
  Path?: string
  [key: string]: unknown
}

interface EmbySessionItem {
  Id?: string | number
  IsPaused?: boolean
  PositionTicks?: number
  DeviceName?: string
  DeviceId?: string
  Client?: string
  UserId?: string | number
  UserName?: string
  PlayState?: { IsPaused?: boolean; PositionTicks?: number }
  NowPlayingItem?: EmbyNowPlayingItem
}

interface SessionEndedData {
  Id?: string | number
  SessionId?: string | number
}

async function handleSessionsUpdate(sessions: EmbySessionItem[]) {
    const now = Date.now();
    const activeIds = new Set<string>();

    for (const s of sessions) {
        // Filter out irrelevant sessions
        if (!s.NowPlayingItem) continue;

        const sessionKey = String(s.Id);
        activeIds.add(sessionKey);

        const existing = activeSessions.get(sessionKey);
        
        const isPaused = s.PlayState?.IsPaused || false;
        const currentTicks = s.PlayState?.PositionTicks ? Number(s.PlayState.PositionTicks) : 0;
        
        if (existing) {
            // Check if item changed (e.g. playlist, or manual switch)
            if (existing.itemId !== s.NowPlayingItem.Id) {
                log(`[Tracker] Item changed for session ${sessionKey}: ${existing.itemName} -> ${s.NowPlayingItem.Name}`);
                
                // Save stats for previous item
                await saveWatchEvent(existing);
                
                // Reset session for new item
                existing.itemId = s.NowPlayingItem.Id;
                existing.itemName = s.NowPlayingItem.Name;
                existing.mediaInfo = s.NowPlayingItem; // Update mediaInfo!
                existing.accumulatedDuration = 0;
                existing.lastAuthAccumulated = 0;
                existing.startedAt = new Date();
                existing.runTimeTicks = s.NowPlayingItem.RunTimeTicks ? Number(s.NowPlayingItem.RunTimeTicks) : null;
            }

            // Update existing session
            existing.lastSeen = now;
            existing.markedForCleanup = null; // Clear cleanup flag
            
            // Update Play State
            const wasPaused = existing.isPaused;
            existing.isPaused = isPaused;
            
            // Sync Position/Duration Logic
            // If the position reported by Emby is significantly different from our interpolated position, snap to Emby
            // Or if we just got an update after a while
            
            // Calculate time drift since last update
            const timeDiff = (now - existing.lastAuthTime) / 1000; // seconds
            
            // Calculate expected position based on last known position + time elapsed (if playing)
            // But Emby sends the *current* position, so we should trust it.
            
            const currentTicksNum = Number(currentTicks);
            const lastAuthTicksNum = Number(existing.lastAuthTicks);
            
            // Ticks difference between this update and last update
            const ticksDiff = currentTicksNum - lastAuthTicksNum;
            const secondsDiff = ticksDiff / 10000000;
            
            // If we are playing, and the position advanced, we add to accumulated duration.
            // But we must be careful about seeking (jumping forward/backward).
            // If secondsDiff is roughly equal to timeDiff (within margin), it's normal playback.
            // If secondsDiff is huge (jump) or negative (rewind), we don't add that jump to accumulated duration.
            // We only add the *actual wall-clock time* passed if it was playing.
            
            if (!wasPaused && !isPaused) {
                // Was playing, still playing.
                // Check if it looks like normal playback (speed ~ 1.0)
                // We allow some variance for network latency, transcoding, etc.
                // If secondsDiff is between 0 and timeDiff * 2 (generous), we count timeDiff as watched.
                // If user seeked, secondsDiff might be 1000s while timeDiff is 10s. We only count 10s.
                // If user paused on client but we didn't get event immediately, secondsDiff might be 0 while timeDiff is 10s. 
                // In that case, we shouldn't count 10s.
                
                if (secondsDiff > 0 && secondsDiff < (timeDiff * 5)) {
                    // Looks like playback. We add the smaller of (ticksDiff converted) or (wall clock time)
                    // Actually, for "duration watched", we should count wall clock time as long as playback advanced.
                    // But if playback advanced 1s in 10s of wall time (buffering?), we should maybe only count 1s?
                    // Let's be safe: add the minimum of wall-time and content-time-advanced.
                    
                    const contentSeconds = secondsDiff;
                    const wallSeconds = timeDiff;
                    
                    // We add the wall time, capped by content time + buffer?
                    // Actually, simpler: if position advanced, we assume user watched during that interval.
                    // We add the timeDiff (wall clock) to accumulated.
                    
                    // CORRECTION: The user wants precise duration.
                    // If I watch 10s of video, accumulated should +10s.
                    // If I seek, accumulated should NOT change.
                    // If I buffer for 10s, accumulated should NOT change.
                    
                    // If position advanced by X seconds, and wall time was Y seconds.
                    // If X ~= Y, then watched Y.
                    // If X << Y (buffering), then watched X.
                    // If X >> Y (seeking), then watched Y (or maybe 0 if it was an instant seek?).
                    
                    // Let's go with: accumulated += min(contentSeconds, wallSeconds)
                    // But if seek happened, contentSeconds is huge. We don't want to add huge time.
                    // So we clamp contentSeconds to wallSeconds * 1.5 (allow 1.5x playback speed).
                    
                    const validContentSeconds = Math.min(contentSeconds, wallSeconds * 1.5);
                    
                    // But if validContentSeconds is still close to wallSeconds, we use wallSeconds?
                    // Let's just use validContentSeconds. It handles buffering (content < wall) and normal play.
                    // It also handles seeking (content clamped to wall).
                    // Wait, if I seek forward 1 hour in 1 second. content=3600, wall=1.
                    // valid = 1.5. I get 1.5s added. Correct.
                    
                    // What if I seek backward? content < 0. valid < 0.
                    // We shouldn't reduce accumulated duration.
                    
                    if (validContentSeconds > 0) {
                        existing.lastAuthAccumulated += validContentSeconds;
                    }
                    // Sync accumulatedDuration to the authoritative accumulated value
                    // This corrects any drift or incorrect speculative additions from the interval loop
                    existing.accumulatedDuration = existing.lastAuthAccumulated;
                }
            } else if (wasPaused && !isPaused) {
                 // Just resumed. No duration to add from the paused period.
            }
            
            // Reset interpolation base
            existing.lastAuthTime = now;
            existing.lastAuthTicks = currentTicks;
            existing.lastPositionTicks = currentTicks;
            existing.isPaused = isPaused;
            
            // Sync accumulated duration to lastAuthAccumulated to prevent drift from bad interpolation
            // existing.accumulatedDuration = Math.max(existing.accumulatedDuration, existing.lastAuthAccumulated);
            // actually we just updated accumulatedDuration above, so we are good.
            
            // Update metadata just in case
            existing.itemType = s.NowPlayingItem.Type;
            existing.itemName = s.NowPlayingItem.Name;
            existing.seriesName = s.NowPlayingItem.SeriesName;
            existing.seasonName = s.NowPlayingItem.SeasonName;
            existing.episodeIndex = s.NowPlayingItem.IndexNumber;
            existing.seasonIndex = s.NowPlayingItem.ParentIndexNumber;
            
        } else {
            // New Session
            log(`[Tracker] New session detected: ${s.UserName} playing ${s.NowPlayingItem.Name}`);
            
            const newSession: SessionState = {
                source: 'emby',
                sessionId: s.Id,
                userId: s.UserId,
                userName: s.UserName,
                itemId: s.NowPlayingItem.Id,
                itemName: s.NowPlayingItem.Name,
                seriesName: s.NowPlayingItem.SeriesName,
                seasonName: s.NowPlayingItem.SeasonName,
                episodeIndex: s.NowPlayingItem.IndexNumber,
                seasonIndex: s.NowPlayingItem.ParentIndexNumber,
                itemType: s.NowPlayingItem.Type,
                runTimeTicks: s.NowPlayingItem.RunTimeTicks ? Number(s.NowPlayingItem.RunTimeTicks) : null,
                startedAt: new Date(),
                lastUpdate: now,
                lastHistoryEmit: now,
                lastSeen: now,
                accumulatedDuration: 0,
                lastAuthAccumulated: 0,
                isPaused: isPaused,
                lastPositionTicks: currentTicks,
                lastAuthTicks: currentTicks,
                lastAuthTime: now,
                markedForCleanup: null,
                client: s.Client,
                device: s.DeviceName,
                deviceId: s.DeviceId,
                mediaInfo: s.NowPlayingItem
            };
            
            activeSessions.set(sessionKey, newSession);
            
            // Create in DB
            try {
                // DISABLED: embyLiveSession model removed
                /*
                const p = getPrisma();
                await p.embyLiveSession.upsert({
                    where: { sessionId: s.Id },
                    create: {
                        sessionId: s.Id,
                        source: 'emby',
                        userId: s.UserId,
                        userName: s.UserName,
                        client: s.Client,
                        device: s.DeviceName,
                        deviceId: s.DeviceId,
                        applicationVersion: s.ApplicationVersion,
                        itemId: s.NowPlayingItem.Id,
                        itemName: s.NowPlayingItem.Name,
                        itemType: s.NowPlayingItem.Type,
                        runTimeTicks: s.NowPlayingItem.RunTimeTicks ? BigInt(s.NowPlayingItem.RunTimeTicks) : null,
                        isPaused: isPaused,
                        playbackPosition: currentTicks,
                        accumulatedDuration: 0
                    },
                    update: {
                        itemId: s.NowPlayingItem.Id,
                        itemName: s.NowPlayingItem.Name,
                        itemType: s.NowPlayingItem.Type,
                        isPaused: isPaused,
                        playbackPosition: currentTicks,
                        lastActivity: new Date()
                    }
                });
                */
            } catch (e) { error('[Tracker] Error creating live session in DB:', e); }
        }
    }

    // Mark missing sessions for cleanup (if they weren't in this update but were active)
    // NOTE: Emby sends ALL sessions in each update usually.
    for (const [key, session] of activeSessions.entries()) {
        if (!activeIds.has(key)) {
            if (!session.markedForCleanup) {
                session.markedForCleanup = now;
            }
        }
    }
    
    broadcastSessions();
}

async function handleSessionEnded(data: SessionEndedData) {
    // Emby sends SessionEnded with some data, but we might have already marked it for cleanup
    // We can force cleanup here
    const sessionId = data.Id ? String(data.Id) : data.SessionId ? String(data.SessionId) : null;
    if (sessionId && activeSessions.has(sessionId)) {
        await finalizeSession(sessionId);
    }
}

async function cleanupOrphanedSessions() {
    const now = Date.now();
    for (const [key, session] of activeSessions.entries()) {
        if (session.markedForCleanup && (now - session.markedForCleanup > 10000)) {
            // Session has been missing for 10 seconds, finalize it
            await finalizeSession(key);
        }
    }
}

async function saveWatchEvent(session: SessionState) {
    if (session.accumulatedDuration <= 10) return null; // Only save if played > 10s

    try {
        const p = getPrisma();

        // Find internal user to link
        const user = await p.user.findUnique({
            where: { embyUserId: session.userId }
        });

        // Extract TmdbId from mediaInfo if available
        let tmdbId = (session.mediaInfo?.ProviderIds as Record<string, unknown> | undefined)?.Tmdb || null;
        if (tmdbId) tmdbId = String(tmdbId);

        const event = await (p as any).watchEvent.create({
            data: {
                embyUserId: session.userId,
                userId: user ? user.id : null,
                userName: session.userName,
                itemId: session.itemId,
                itemName: session.itemName,
                itemType: session.itemType,
                seriesName: session.seriesName,
                seasonName: session.seasonName,
                seasonNumber: session.seasonIndex,
                episodeNumber: session.episodeIndex,
                durationMinutes: Math.round(session.accumulatedDuration / 60),
                playedAt: new Date(),
                client: session.client,
                device: session.device,
                sessionId: session.sessionId,
                plays: 1,
                tmdbId: tmdbId
            }
        });
        
        log(`[Tracker] Saved WatchEvent for ${session.userName}: ${session.itemName} (Duration: ${Math.round(session.accumulatedDuration)}s)`);
        return event;

    } catch (e) {
        error('[Tracker] Error saving WatchEvent:', e);
        return null;
    }
}

async function finalizeSession(sessionId: string) {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    log(`[Tracker] Finalizing session: ${session.userName} - ${session.itemName} (${session.accumulatedDuration}s)`);

    // 1. Save to History (WatchEvent)
    const savedEvent = await saveWatchEvent(session);

    if (savedEvent) {
        // Emit final history update to frontend
        io.emit('history_update', {
            log: {
                id: savedEvent.id,
                sessionId: sessionId,
                embyUserId: savedEvent.embyUserId,
                userName: savedEvent.userName,
                itemId: savedEvent.itemId,
                itemName: savedEvent.itemName,
                itemType: savedEvent.itemType,
                startTime: savedEvent.playedAt,
                endTime: new Date(),
                playDuration: savedEvent.durationMinutes * 60, // Convert back to seconds for consistency
                accumulatedDuration: savedEvent.durationMinutes * 60,
                totalDuration: session.runTimeTicks ? Number(session.runTimeTicks) : null,
                client: savedEvent.client,
                device: savedEvent.device,
                mediaInfo: session.mediaInfo,
                source: 'emby',
                isLive: false,
                tmdbId: savedEvent.tmdbId,
                seasonIndex: savedEvent.seasonNumber,
                episodeIndex: savedEvent.episodeNumber,
                seriesName: savedEvent.seriesName
            }
        });
    }

    // 2. Remove from LiveSession DB
    try {
        // DISABLED: embyLiveSession model removed
        /*
        const p = getPrisma();
        await p.embyLiveSession.delete({
            where: { sessionId: sessionId }
        });
        */
    } catch (e) { 
        // Ignore if already deleted
    }

    // 3. Remove from memory
    activeSessions.delete(sessionId);
    
    broadcastSessions();
}

async function pollService() {
    // Fallback polling if WebSocket is down or missed something
    if (!currentServiceConnection || !currentServiceConnection.url || !currentServiceConnection.key) return;
    
    try {
        const emby = new EmbyService(currentServiceConnection.url, currentServiceConnection.key);
        const sessions = await emby.getSessions();
        handleSessionsUpdate(sessions);
    } catch (e) {
        error('[Tracker] Poll error:', e);
    }
}

startTracker().catch(error);
