import axios, { AxiosInstance } from 'axios'

// IGDB API uses Twitch authentication
const CLIENT_ID = '55h5wb0k3qfkt28n30vxsq0dgc4igf'
const CLIENT_SECRET = '45xkt2e05qlfn2mp7mt7ujwswfdvjn'

export interface IGDBGame {
  id: number
  name: string
  summary?: string
  storyline?: string
  rating?: number
  rating_count?: number
  aggregated_rating?: number
  first_release_date?: number
  cover?: {
    id: number
    url: string
  }
  artworks?: Array<{
    id: number
    url: string
  }>
  screenshots?: Array<{
    id: number
    url: string
  }>
  genres?: Array<{
    id: number
    name: string
  }>
  platforms?: Array<{
    id: number
    name: string
  }>
  involved_companies?: Array<{
    id: number
    company: {
      id: number
      name: string
    }
    developer: boolean
    publisher: boolean
  }>
  websites?: Array<{
    id: number
    url: string
    category: number
  }>
  game_modes?: Array<{
    id: number
    name: string
  }>
  player_perspectives?: Array<{
    id: number
    name: string
  }>
  themes?: Array<{
    id: number
    name: string
  }>
  franchises?: Array<{
    id: number
    name: string
  }>
  game_engines?: Array<{
    id: number
    name: string
  }>
  videos?: Array<{
    id: number
    video_id: string
  }>
}

class IGDBService {
  private client: AxiosInstance | null = null
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  private async authenticate() {
    try {
      // Check if token is still valid (with 1 hour buffer)
      if (this.accessToken && Date.now() < this.tokenExpiry - 3600000) {
        return
      }

      const response = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`
      )

      this.accessToken = response.data.access_token
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000)

      this.client = axios.create({
        baseURL: 'https://api.igdb.com/v4',
        headers: {
          'Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      })
    } catch (error) {
      console.error('[IGDB] Authentication failed:', error)
      throw new Error('Failed to authenticate with IGDB')
    }
  }

  async searchGames(query: string, limit: number = 5): Promise<IGDBGame[]> {
    await this.authenticate()
    if (!this.client) return []

    try {
      const response = await this.client.post(
        '/games',
        `fields id, name, summary, storyline, rating, rating_count, aggregated_rating, first_release_date, 
         cover.url, artworks.url, screenshots.url, genres.name, platforms.name, 
         involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
         websites.url, websites.category, game_modes.name, player_perspectives.name, themes.name,
         franchises.name, game_engines.name, videos.video_id;
         search "${query}";
         limit ${limit};`
      )
      return response.data
    } catch (error) {
      console.error('[IGDB] Search failed:', error)
      return []
    }
  }

  async getGameById(id: number): Promise<IGDBGame | null> {
    await this.authenticate()
    if (!this.client) return null

    try {
      const response = await this.client.post(
        '/games',
        `fields id, name, summary, storyline, rating, rating_count, aggregated_rating, first_release_date, 
         cover.url, artworks.url, screenshots.url, genres.name, platforms.name, 
         involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
         websites.url, websites.category, game_modes.name, player_perspectives.name, themes.name,
         franchises.name, game_engines.name, videos.video_id;
         where id = ${id};`
      )
      return response.data[0] || null
    } catch (error) {
      console.error('[IGDB] Get game by ID failed:', error)
      return null
    }
  }

  async getGameByName(name: string): Promise<IGDBGame | null> {
    const games = await this.searchGames(name, 1)
    return games[0] || null
  }

  // Helper to get the best cover image URL
  getCoverUrl(cover?: { url: string }, size: 'small' | 'big' = 'big'): string | null {
    if (!cover) return null
    // IGDB images need to be resized by replacing the URL
    const baseUrl = cover.url.replace('t_thumb', size === 'small' ? 't_cover_small' : 't_cover_big')
    return baseUrl.startsWith('http') ? baseUrl : `https:${baseUrl}`
  }

  // Helper to get artwork/screenshot URL
  getImageUrl(image?: { url: string }, size: '1080p' | '720p' | 'micro' = '1080p'): string | null {
    if (!image) return null
    const sizeMap = {
      '1080p': 't_1080p',
      '720p': 't_720p',
      'micro': 't_micro'
    }
    const baseUrl = image.url.replace('t_thumb', sizeMap[size])
    return baseUrl.startsWith('http') ? baseUrl : `https:${baseUrl}`
  }

  // Helper to format release date
  formatReleaseDate(timestamp?: number): string | null {
    if (!timestamp) return null
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  // Helper to get the official website
  getOfficialWebsite(websites?: Array<{ url: string; category: number }>): string | null {
    if (!websites) return null
    // Category 1 = Official website
    const official = websites.find(w => w.category === 1)
    return official?.url || websites[0]?.url || null
  }

  // Helper to get developers
  getDevelopers(involvedCompanies?: Array<{ company: { name: string }; developer: boolean }>): string[] {
    if (!involvedCompanies) return []
    return involvedCompanies
      .filter(ic => ic.developer)
      .map(ic => ic.company.name)
  }

  // Helper to get publishers
  getPublishers(involvedCompanies?: Array<{ company: { name: string }; publisher: boolean }>): string[] {
    if (!involvedCompanies) return []
    return involvedCompanies
      .filter(ic => ic.publisher)
      .map(ic => ic.company.name)
  }
}

// Singleton instance
let igdbService: IGDBService | null = null

export function getIGDBService(): IGDBService {
  if (!igdbService) {
    igdbService = new IGDBService()
  }
  return igdbService
}

export { IGDBService }
