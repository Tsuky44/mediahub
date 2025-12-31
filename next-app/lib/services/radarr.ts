import axios from 'axios'
import { getSetting } from '@/lib/settings'

export class RadarrService {
  private baseUrl: string | null = null
  private apiKey: string | null = null

  private async init() {
    if (!this.baseUrl) {
      this.baseUrl = await getSetting('radarr_url')
      if (this.baseUrl) {
        this.baseUrl = this.baseUrl.replace(/\/$/, '')
      }
    }
    if (!this.apiKey) {
      this.apiKey = await getSetting('radarr_api_key')
    }
    
    return !!(this.baseUrl && this.apiKey)
  }

  private async getClient() {
    const configured = await this.init()
    if (!configured) return null

    return axios.create({
      baseURL: `${this.baseUrl}/api/v3`,
      headers: {
        'X-Api-Key': this.apiKey
      },
      timeout: 10000
    })
  }

  async deleteMovie(radarrId: number, deleteFiles: boolean = false) {
    const client = await this.getClient()
    if (!client) return { success: false, message: 'Radarr non configuré' }

    try {
        console.log(`[Radarr] Deleting movie ${radarrId} (deleteFiles: ${deleteFiles})`);
        await client.delete(`/movie/${radarrId}`, {
            params: {
                deleteFiles: deleteFiles,
                addImportExclusion: false
            }
        });
        return { success: true };
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message;
        console.error(`[Radarr] Failed to delete movie ${radarrId}:`, errorMsg);
        return { success: false, message: errorMsg };
    }
  }
}

export const radarrService = new RadarrService()
