import { io, Socket } from 'socket.io-client';

const TRACKER_URL = process.env.TRACKER_WS_URL || 'http://127.0.0.1:3005';

class TrackerService {
  private static instance: TrackerService;
  private socket: Socket | null = null;
  private isConnected = false;

  private constructor() {
    this.connect();
  }

  public static getInstance(): TrackerService {
    if (!TrackerService.instance) {
      TrackerService.instance = new TrackerService();
    }
    return TrackerService.instance;
  }

  private connect() {
    if (this.socket?.connected) return;

    console.log(`[TrackerService] Connecting to tracker at ${TRACKER_URL}`);
    
    this.socket = io(TRACKER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { isServer: true },
    });

    this.socket.on('connect', () => {
      console.log('[TrackerService] Connected to tracker');
      this.isConnected = true;
      // Identify as server
      this.socket?.emit('identify_server');
    });

    this.socket.on('disconnect', () => {
      console.log('[TrackerService] Disconnected from tracker');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
        // Suppress verbose logs in dev
        if (process.env.NODE_ENV !== 'development') {
            console.error('[TrackerService] Connection error:', err.message);
        }
    });
  }

  public emit(event: string, data: unknown) {
    if (!this.socket?.connected) {
      this.connect();
    }
    this.socket?.emit(event, data);
  }

  public broadcastNotification(userIds: number[], notification: unknown) {
    this.emit('server_broadcast_notification', {
      userIds,
      notification
    });
  }
}

export const trackerService = TrackerService.getInstance();
