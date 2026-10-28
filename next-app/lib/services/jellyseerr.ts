import axios from 'axios';
import { insecureHttpsAgent, keepAliveHttpAgent } from '../http-agents'

export class JellyseerrService {
  private baseUrl: string;
  private apiKey: string;
  private httpsAgent = insecureHttpsAgent

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async getClient(timeout: number = 10000) {
    return axios.create({
      baseURL: this.baseUrl + '/api/v1',
      headers: {
        'X-Api-Key': this.apiKey,
        'Accept': 'application/json'
      },
      timeout,
      httpAgent: keepAliveHttpAgent,
      httpsAgent: this.httpsAgent
    });
  }

  async testConnection() {
    try {
      const client = await this.getClient(5000);
      const response = await client.get('/status');
      return response.data.version !== undefined;
    } catch (e: any) {
      console.error(`[JellyseerrService] testConnection failed at ${this.baseUrl}:`, e.message);
      return false;
    }
  }

  async getRequests(take: number = 100, skip: number = 0) {
    try {
      const client = await this.getClient();
      const response = await client.get('/request', {
        params: {
          take,
          skip,
          sort: 'added',
          filter: 'all'
        }
      });
      return response.data;
    } catch (e: any) {
      console.error(`[JellyseerrService] getRequests failed:`, e.message);
      throw e;
    }
  }

  async getAllRequests() {
    let allRequests: any[] = [];
    let skip = 0;
    const take = 100;
    
    while (true) {
      const data = await this.getRequests(take, skip);
      if (!data.results || data.results.length === 0) break;
      
      allRequests = allRequests.concat(data.results);
      if (allRequests.length >= data.pageInfo.results) break;
      
      skip += take;
    }
    
    return allRequests;
  }
}
