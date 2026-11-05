import axios from 'axios';
import { insecureHttpsAgent, keepAliveHttpAgent } from '../http-agents'
// Imports relatifs, comme les autres services
import { createMemoCache } from '../cache'

/** Film ou série d'une bibliothèque Plex */
export interface PlexLibraryItem {
  ratingKey: string
  type: 'movie' | 'tv'
  title: string
  year?: number
  summary?: string
  /** Date d'ajout (secondes Unix) */
  addedAt: number
  tmdbId: number | null
  /** Séries : nombre d'épisodes */
  leafCount?: number
}

// Bibliothèque complète (sans données de visionnage) par serveur : relue au plus toutes les 2 min
const plexLibraries = createMemoCache({ max: 10, ttl: 2 * 60_000 })
// Identifiant du serveur (machineIdentifier), stable
const plexMachineIds = createMemoCache({ max: 10, ttl: 60 * 60_000 })

/**
 * Identifiant TMDB d'un élément Plex : agents récents (Guid[] « tmdb://603 », avec includeGuids=1),
 * sinon ancien agent (guid « com.plexapp.agents.themoviedb://603?lang=fr »).
 */
export function plexTmdbId(item: { guid?: string; Guid?: Array<{ id?: string }> }): number | null {
  const ids = [...(item.Guid ?? []).map((g) => g.id ?? ''), item.guid ?? '']
  for (const id of ids) {
    const match = id.match(/^(?:tmdb|com\.plexapp\.agents\.themoviedb):\/\/(\d+)/)
    if (match) return Number(match[1])
  }
  return null
}

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
  private httpsAgent = insecureHttpsAgent

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
      httpAgent: keepAliveHttpAgent,
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

  /**
   * Lien vers la page d'un média dans l'app Plex (web) : recherche par titre sur le serveur, puis
   * app.plex.tv/desktop#!/server/<machineIdentifier>/details?key=/library/metadata/<ratingKey>.
   * null si le serveur ne répond pas ou ne trouve rien.
   */
  async findWebLink(titles: string[], year: number | undefined, type: 'movie' | 'show'): Promise<string | null> {
    const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    try {
      const client = await this.getClient(6000);
      const identity = await client.get('/identity');
      const machineId: string | undefined = identity.data?.MediaContainer?.machineIdentifier;
      if (!machineId) return null;
      for (const title of [...new Set(titles.filter(Boolean))]) {
        const search = await client.get('/hubs/search', { params: { query: title, limit: 10 } });
        const hubs: Array<{ type?: string; Metadata?: Array<{ title?: string; year?: number; ratingKey?: string | number }> }> =
          search.data?.MediaContainer?.Hub ?? [];
        const items = hubs.filter((h) => h.type === type).flatMap((h) => h.Metadata ?? []);
        const sameYear = (y?: number) => !year || !y || Math.abs(y - year) <= 1;
        const match =
          items.find((m) => m.title && norm(m.title) === norm(title) && sameYear(m.year)) ??
          items.find((m) => sameYear(m.year));
        if (match?.ratingKey != null) {
          return `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=${encodeURIComponent(`/library/metadata/${match.ratingKey}`)}`;
        }
      }
      return null;
    } catch (e: any) {
      error('[PlexService] findWebLink failed:', e.message);
      return null;
    }
  }

  /** Identifiant du serveur, pour les liens vers l'app Plex */
  async getMachineId(): Promise<string | null> {
    return plexMachineIds.get(this.baseUrl, async () => {
      const client = await this.getClient(6000);
      const identity = await client.get('/identity');
      return (identity.data?.MediaContainer?.machineIdentifier as string | undefined) ?? null;
    }, { cacheIf: (id) => Boolean(id) });
  }

  /** Page d'un élément dans l'app Plex (web) */
  async webLinkFor(ratingKey: string): Promise<string | null> {
    const machineId = await this.getMachineId().catch(() => null);
    return machineId
      ? `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=${encodeURIComponent(`/library/metadata/${ratingKey}`)}`
      : null;
  }

  /**
   * Films et séries de toutes les bibliothèques « movie » et « show » du serveur, avec leur
   * identifiant TMDB. Lus avec le jeton du serveur : pas de données de visionnage par compte.
   * Une erreur (serveur injoignable, jeton refusé) remonte à l'appelant.
   */
  async listLibrary(): Promise<PlexLibraryItem[]> {
    // Par serveur et par jeton : un autre jeton peut voir d'autres bibliothèques
    return plexLibraries.get(`${this.baseUrl}|${this.token}`, async () => {
      const client = await this.getClient(20000);
      const sections: Array<{ key?: string | number; type?: string }> =
        (await client.get('/library/sections')).data?.MediaContainer?.Directory ?? [];
      const lists = await Promise.all(
        sections
          .filter((s) => (s.type === 'movie' || s.type === 'show') && s.key != null)
          .map(async (s) => {
            const res = await client.get(`/library/sections/${s.key}/all`, { params: { includeGuids: 1 } });
            const metadata: Array<Record<string, any>> = res.data?.MediaContainer?.Metadata ?? [];
            return metadata.map((m): PlexLibraryItem => ({
              ratingKey: String(m.ratingKey),
              type: s.type === 'movie' ? 'movie' : 'tv',
              title: String(m.title ?? ''),
              year: typeof m.year === 'number' ? m.year : undefined,
              summary: typeof m.summary === 'string' ? m.summary : undefined,
              addedAt: typeof m.addedAt === 'number' ? m.addedAt : 0,
              tmdbId: plexTmdbId(m),
              leafCount: typeof m.leafCount === 'number' ? m.leafCount : undefined,
            }));
          })
      );
      return lists.flat().sort((a, b) => b.addedAt - a.addedAt);
    }, { cacheIf: (items) => items.length > 0 });
  }

  /** Élément de la bibliothèque correspondant à un identifiant TMDB, ou null */
  async findByTmdbId(tmdbId: number, type: 'movie' | 'tv'): Promise<PlexLibraryItem | null> {
    const items = await this.listLibrary();
    return items.find((i) => i.tmdbId === tmdbId && i.type === type) ?? null;
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
            httpAgent: keepAliveHttpAgent,
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
            httpAgent: keepAliveHttpAgent,
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
