import axios from 'axios'

export class RadarrService {
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

  async deleteMovie(radarrId: number, deleteFiles: boolean = false) {
    const client = this.getClient()

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
