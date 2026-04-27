import axios from 'axios';
import https from 'https';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

interface PlexAccount {
  id?: string | number
  name?: string
  title?: string
  username?: string
  email?: string
  thumb?: string
}

interface PlexUser {
  id?: string | number
  name?: string
  title?: string
  email?: string
  thumb?: string
}

interface PlexSession {
  User?: { id?: string | number; title?: string }
  Player?: { product?: string; title?: string; device?: string; machineIdentifier?: string; version?: string; state?: string }
  viewOffset?: number
  duration?: number
  sessionKey?: string | number
  ratingKey?: string | number
  accountID?: string | number
  title?: string
  type?: string
  grandparentTitle?: string
  parentTitle?: string
  grandparentRatingKey?: string | number
  index?: number
  parentIndex?: number
}


export class PlexService {
  private httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  constructor(private baseUrl: string, private token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getClient(timeout = 10000) {
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
      error(`[PlexService] getSessions failed at ${this.baseUrl}:`, e.message);
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
      warn(`[PlexService] getHistory failed (might be expected):`, e.message);
      return [];
    }
  }

  async getItemDetails(ratingKey: string) {
    try {
      const client = await this.getClient();
      const response = await client.get(`/library/metadata/${ratingKey}`);
      return response.data.MediaContainer?.Metadata?.[0] || null;
    } catch (e: any) {
      error(`[PlexService] getItemDetails failed for ${ratingKey}:`, e.message);
      return null;
    }
  }

  async getUsers() {
    let allUsers: Array<{ Id: string; Name: string; Email?: string; Thumb?: string }> = [];
    let lastError: Error | null = null;

    // 1. Try /accounts (often contains friends/managed users)
    try {
      const client = await this.getClient(15000);
      log(`[PlexService] Fetching users from ${this.baseUrl}/accounts...`);
      const response = await client.get('/accounts');
      const accounts = response.data.MediaContainer?.Account || [];
      log(`[PlexService] Found ${accounts.length} users via /accounts`);
      
      if (Array.isArray(accounts)) {
        log(`[PlexService] Processing ${accounts.length} accounts...`);
        const validAccounts = accounts.filter((acc: PlexAccount) => {
            const isValid = acc.id && acc.id !== '0' && acc.id !== 0 && (acc.name || acc.title || acc.username);
            if (!isValid) {
                log(`[PlexService] Skipping account: ID=${acc.id}, Name=${acc.name}, Title=${acc.title}`);
            }
            return isValid;
        });
        
        log(`[PlexService] Found ${validAccounts.length} valid accounts.`);

        allUsers = [...allUsers, ...validAccounts.map((acc: PlexAccount) => ({
          Id: String(acc.id),
          Name: acc.name || acc.title || acc.username || `Plex User ${acc.id}`,
          Email: acc.email,
          Thumb: acc.thumb
        }))];
      }
    } catch (e: any) {
      warn(`[PlexService] getUsers (/accounts) failed:`, e.message);
      lastError = e;
    }

    // 2. Try /users (active sessions or connected users sometimes)
    if (allUsers.length === 0) {
      try {
        const client = await this.getClient(15000);
        log(`[PlexService] Fetching users from ${this.baseUrl}/users...`);
        const response = await client.get('/users');
        const users = response.data.MediaContainer?.User || [];
        log(`[PlexService] Found ${users.length} users via /users`);
        
        if (Array.isArray(users)) {
          allUsers = [...allUsers, ...users.map((u: PlexUser) => ({
            Id: String(u.id),
            Name: u.name || u.title || '',
            Email: u.email,
            Thumb: u.thumb
          }))];
        }
      } catch (e: any) {
        warn(`[PlexService] getUsers (/users) failed:`, e.message);
        lastError = e;
      }
    }

    // If we found no users and had an error, re-throw it so sync knows it failed
    if (allUsers.length === 0 && lastError) {
      throw lastError;
    }

    const uniqueUsers = Array.from(new Map(allUsers.map(item => [item.Id, item])).values());
    
    return uniqueUsers;
  }
  
  getItemImageUrl(itemId: string) {
    // For user thumbs, if it's a URL (like from Plex.tv), return it as is
    if (itemId.startsWith('http')) return itemId;
    // Otherwise, it's a transcode request
    return `${this.baseUrl}/photo/:/transcode?width=400&height=400&minSize=1&url=${encodeURIComponent(itemId)}&X-Plex-Token=${this.token}`
  }

  async authenticate(username: string, pw: string) {
    log(`[PlexService] Authenticating user '${username}' against ${this.baseUrl}`)
    
    // Note: Plex usually requires OAuth or plex.tv auth. 
    // Direct authentication against a local PMS server is possible if "List of IP addresses and networks that are allowed without auth" is configured or via specific headers, 
    // but typically we authenticate against plex.tv to get a token, then use that token to talk to the server.
    // However, if the user provides a local username/password, we might be trying to auth against plex.tv.
    
    // For this implementation, we will try to authenticate against plex.tv to get a token.
    try {
        const response = await axios.post('https://plex.tv/users/sign_in.json', {
            user: {
                login: username,
                password: pw
            }
        }, {
            headers: {
                'X-Plex-Client-Identifier': 'mediahub-client-' + Math.random().toString(36).substring(7),
                'X-Plex-Product': 'MediaHub',
                'X-Plex-Version': '1.0.0'
            },
            httpsAgent: this.httpsAgent,
            timeout: 15000 // 15s timeout
        });
        
        const user = response.data.user;
        log(`[PlexService] Plex.tv auth success for ${username}`);
        
        // Return a structure similar to what we use for Emby/Jellyfin to normalize usage in auth.ts
        return {
            User: {
                Id: String(user.id),
                Name: user.username,
                Email: user.email,
                PrimaryImageTag: user.thumb, // Plex returns a URL for thumb
                AccessToken: user.authToken // Critical: this is the token for the server
            },
            AccessToken: user.authToken
        };

    } catch (e: any) {
        error(`[PlexService] Plex.tv auth failed:`, e.message);
        throw new Error('Plex authentication failed');
    }
  }

  async validateToken(token: string) {
    try {
        const response = await axios.get('https://plex.tv/api/v2/user', {
            headers: {
                'X-Plex-Token': token,
                'X-Plex-Product': 'MediaHub',
                'X-Plex-Client-Identifier': 'mediahub-client-generic',
                'Accept': 'application/json'
            },
            httpsAgent: this.httpsAgent,
            timeout: 10000
        });

        const user = response.data;
        // log(`[PlexService] Token validation success for ${user.username}`);
        
        return {
            User: {
                Id: String(user.id),
                Name: user.username,
                Email: user.email,
                PrimaryImageTag: user.thumb,
                AccessToken: token
            },
            AccessToken: token
        };
    } catch (e: any) {
        error(`[PlexService] Token validation failed:`, e.message);
        throw new Error('Invalid Plex token');
    }
  }

  // Removed duplicate getItemImageUrl


  static normalizeSession(session: PlexSession) {
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
