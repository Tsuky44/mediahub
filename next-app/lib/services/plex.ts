import axios from 'axios';
import https from 'https';

export class PlexService {
  private baseUrl: string;
  private token: string;
  private httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async getClient(timeout: number = 10000) {
    return axios.create({
      baseURL: this.baseUrl,
      params: {
        'X-Plex-Token': this.token
      },
      timeout,
      httpsAgent: this.httpsAgent,
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  async getSessions() {
    try {
      const client = await this.getClient();
      const response = await client.get('/status/sessions');
      // Plex structure: MediaContainer -> Metadata[]
      return response.data.MediaContainer?.Metadata || [];
    } catch (e: any) {
      console.error(`[PlexService] getSessions failed at ${this.baseUrl}:`, e.message);
      return [];
    }
  }

  async getHistory(limit: number = 50, offset: number = 0, sort: string = 'viewedAt:desc') {
    try {
      const client = await this.getClient();
      const response = await client.get('/status/sessions/history/all', {
        params: {
          sort,
          limit,
          'X-Plex-Container-Start': offset,
          'X-Plex-Container-Size': limit
        }
      });
      return response.data.MediaContainer?.Metadata || [];
    } catch (e: any) {
      // History might not be available or permission denied
      console.warn(`[PlexService] getHistory failed (might be expected):`, e.message);
      return [];
    }
  }

  async getItemDetails(ratingKey: string) {
    try {
      const client = await this.getClient();
      const response = await client.get(`/library/metadata/${ratingKey}`);
      return response.data.MediaContainer?.Metadata?.[0] || null;
    } catch (e: any) {
      console.error(`[PlexService] getItemDetails failed for ${ratingKey}:`, e.message);
      return null;
    }
  }

  async getUsers() {
    try {
      const client = await this.getClient();
      // Try /accounts which is common for local users on many Plex versions
      const response = await client.get('/accounts');
      const accounts = response.data.MediaContainer?.Account || [];
      return accounts.map((acc: any) => ({
        Id: String(acc.id),
        Name: acc.name || acc.title
      }));
    } catch (e: any) {
      console.warn(`[PlexService] getUsers (/accounts) failed:`, e.message);
      try {
        // Fallback to /users
        const client = await this.getClient();
        const response = await client.get('/users');
        const users = response.data.MediaContainer?.User || [];
        return users.map((u: any) => ({
          Id: String(u.id),
          Name: u.name || u.title
        }));
      } catch (e2: any) {
        console.warn(`[PlexService] getUsers (/users) failed:`, e2.message);
        return [];
      }
    }
  }
  
  // Helper to normalize Plex session to Emby-like structure for the tracker
  static normalizeSession(session: any) {
    const user = session.User || {};
    const player = session.Player || {};
    
    // Calculate position ticks (Plex uses ms, Emby uses ticks = 10000 * ms)
    const positionTicks = session.viewOffset ? BigInt(session.viewOffset) * BigInt(10000) : BigInt(0);
    const runTimeTicks = session.duration ? BigInt(session.duration) * BigInt(10000) : null;
    
    return {
        Id: session.sessionKey || session.ratingKey, // Use sessionKey for live uniqueness
        UserId: user.id || session.accountID,
        UserName: user.title || 'Plex User',
        Client: player.product || 'Plex',
        DeviceName: player.title || player.device || 'Plex Device',
        DeviceId: player.machineIdentifier,
        ApplicationVersion: player.version,
        PlayState: {
            PositionTicks: Number(positionTicks), // JS Number might lose precision for BigInt, but for tracker logic...
            IsPaused: player.state === 'paused',
            Status: player.state === 'paused' ? 'Paused' : 'Playing'
        },
        NowPlayingItem: {
            Id: session.ratingKey,
            Name: session.title,
            Type: session.type === 'episode' ? 'Episode' : (session.type === 'movie' ? 'Movie' : 'Unknown'),
            RunTimeTicks: Number(runTimeTicks),
            SeriesName: session.grandparentTitle, // Show name
            SeasonName: session.parentTitle, // Season X
            SeriesId: session.grandparentRatingKey,
            IndexNumber: session.index,
            ParentIndexNumber: session.parentIndex,
            ProviderIds: {
                // Plex provider IDs are in Guid array usually, e.g., "com.plexapp.agents.imdb://..."
                // Parsing this is complex, leaving empty for now or implementing later
            }
        }
    };
  }
}
