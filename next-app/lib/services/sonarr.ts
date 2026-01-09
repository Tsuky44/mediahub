import axios from 'axios'

export class SonarrService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private getClient() {
    return axios.create({
      baseURL: `${this.baseUrl}/api/v3`,
      headers: {
        'X-Api-Key': this.apiKey
      },
      timeout: 10000
    })
  }

  async deleteSeries(sonarrId: number, deleteFiles: boolean = false) {
    const client = this.getClient()

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
