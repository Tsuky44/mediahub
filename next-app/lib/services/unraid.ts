import axios from 'axios'

export interface UnraidStorageInfo {
  total: string
  used: string
  free: string
  percent: number
}

interface GraphQLData {
  array?: { capacity?: { kilobytes?: { total?: string; used?: string; free?: string }; bytes?: { total?: string; used?: string; free?: string } } }
  storage?: { array?: { size?: string; used?: string; free?: string } }
}

export class UnraidService {
  private url: string
  private apiKey: string

  constructor(url: string, apiKey: string) {
    this.url = url.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  private async executeQuery(query: string, endpointUrl: string) {
      return axios.post(
        endpointUrl,
        { query },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 10000,
        }
      )
  }

  async getStorageStats(): Promise<UnraidStorageInfo | null> {
    // Prioritize /graphql endpoint if the user didn't specify it, but also try the raw URL
    const endpoints = [
        this.url.endsWith('/graphql') ? this.url : `${this.url}/graphql`,
        this.url
    ]
    
    const uniqueEndpoints = [...new Set(endpoints)]

    const queries = [
        {
            name: 'kilobytes (7.2+)',
            query: `query { array { capacity { kilobytes { total used free } } } }`,
            parser: (data: GraphQLData) => {
                const k = data?.array?.capacity?.kilobytes
                if (!k) return null
                return {
                    size: parseInt(k.total || '0') * 1024,
                    used: parseInt(k.used || '0') * 1024,
                    free: parseInt(k.free || '0') * 1024
                }
            }
        },
        {
            name: 'bytes (7.0+)',
            query: `query { array { capacity { bytes { total used free } } } }`,
            parser: (data: GraphQLData) => {
                const b = data?.array?.capacity?.bytes
                if (!b) return null
                return {
                    size: parseInt(b.total || '0'),
                    used: parseInt(b.used || '0'),
                    free: parseInt(b.free || '0')
                }
            }
        },
        {
            name: 'legacy',
            query: `query { storage { array { size used free } } }`,
            parser: (data: GraphQLData) => {
                const a = data?.storage?.array
                if (!a) return null
                return {
                    size: parseInt(a.size || '0'),
                    used: parseInt(a.used || '0'),
                    free: parseInt(a.free || '0')
                }
            }
        }
    ]

    for (const endpoint of uniqueEndpoints) {
        for (const q of queries) {
            try {
                const response = await this.executeQuery(q.query, endpoint)
                
                if (response.data?.errors) {
                    continue
                }
                
                const result = q.parser(response.data?.data)
                if (result) {
                    return this.formatResult(result)
                }
            } catch (error: unknown) {
                if (axios.isAxiosError(error)) {
                    const status = error.response?.status
                    if (status !== 404 && status !== 400) {
                         console.error(`[UnraidService] Error probing ${endpoint} with ${q.name}:`, error.message)
                    }
                }
            }
        }
    }

    console.warn('[UnraidService] Failed to retrieve storage stats with all known query strategies.')
    return null
  }

  private formatResult(info: { size: number, used: number, free: number }) {
        const { size, used, free } = info
        const formatBytes = (bytes: number) => {
          if (isNaN(bytes)) return '0 B'
          const k = 1024
          const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          if (i < 0) return bytes + ' B'
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
        }

        return {
          total: formatBytes(size),
          used: formatBytes(used),
          free: formatBytes(free),
          percent: size > 0 ? Math.round((used / size) * 100) : 0
        }
  }
}
