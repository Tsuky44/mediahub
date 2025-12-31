import axios from 'axios'
import { getSetting } from '@/lib/settings'

export class SonarrService {
  private baseUrl: string | null = null
  private apiKey: string | null = null

  private async init() {
    if (!this.baseUrl) {
      this.baseUrl = await getSetting('sonarr_url')
      if (this.baseUrl) {
        this.baseUrl = this.baseUrl.replace(/\/$/, '')
      }
    }
    if (!this.apiKey) {
      this.apiKey = await getSetting('sonarr_api_key')
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

  async deleteSeries(sonarrId: number, deleteFiles: boolean = false) {
    const client = await this.getClient()
    if (!client) return { success: false, message: 'Sonarr non configuré' }

    try {
        console.log(`[Sonarr] Deleting series ${sonarrId} (deleteFiles: ${deleteFiles})`);
        await client.delete(`/series/${sonarrId}`, {
            params: {
                deleteFiles: deleteFiles,
                addImportExclusion: false
            }
        });
        return { success: true };
    } catch (e: any) {
        const errorMsg = e.response?.data?.message || e.message;
        console.error(`[Sonarr] Failed to delete series ${sonarrId}:`, errorMsg);
        return { success: false, message: errorMsg };
    }
  }
}

export const sonarrService = new SonarrService()
