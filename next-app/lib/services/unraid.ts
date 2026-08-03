import axios from 'axios'

export interface UnraidStorageInfo {
  total: string
  used: string
  free: string
  percent: number
}

export interface UnraidContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports?: string
  autoStart: boolean
  icon?: string
}

export interface UnraidContainerStats {
  cpu: number
  memory: {
    used: number
    limit: number
    percent: number
  }
  network: {
    rx: number
    tx: number
  }
  pids: number
}

interface GraphQLData {
  array?: { capacity?: { kilobytes?: { total?: string; used?: string; free?: string }; bytes?: { total?: string; used?: string; free?: string } } }
  storage?: { array?: { size?: string; used?: string; free?: string } }
}

interface DockerPort {
  publicPort?: number
  privatePort?: number
  type?: string
}

interface DockerContainerRaw {
  id: string
  names?: string | string[]
  image: string
  state: string
  status: string
  ports?: DockerPort[]
  autoStart: boolean
  labels?: Record<string, string | null | undefined>
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

  async containerAction(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<boolean> {
      // Handle restart as stop then start
      if (action === 'restart') {
          const stopSuccess = await this.containerAction(containerId, 'stop')
          if (!stopSuccess) return false
          
          // Wait a brief moment for the container to fully stop
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          return this.containerAction(containerId, 'start')
      }

      const endpoints = [
          this.url.endsWith('/graphql') ? this.url : `${this.url}/graphql`,
          this.url
      ]
      const uniqueEndpoints = [...new Set(endpoints)]
      
      const mutation = `
        mutation {
          docker {
            ${action}Container(id: "${containerId}")
          }
        }
      `

      for (const endpoint of uniqueEndpoints) {
          try {
              const response = await this.executeQuery(mutation, endpoint)
              if (response.data?.errors) {
                  console.error(`[UnraidService] Failed to ${action} container:`, JSON.stringify(response.data.errors))
                  continue
              }
              // If successful, the field usually returns true or null without errors
              return true
          } catch (error: unknown) {
              if (axios.isAxiosError(error)) {
                console.error(`[UnraidService] Error executing ${action} on ${endpoint}:`, error.message)
              }
          }
      }
      return false
  }

  async getContainerStats(containerId: string): Promise<UnraidContainerStats | null> {
    const endpoints = [
        this.url.endsWith('/graphql') ? this.url : `${this.url}/graphql`,
        this.url
    ]
    const uniqueEndpoints = [...new Set(endpoints)]

    // Try to get stats from Unraid API
    // Note: Unraid API may not expose detailed stats via GraphQL
    // This is a placeholder that returns null to fall back to Docker socket
    return null
  }

  async getContainerLogs(containerId: string, tail: number = 100): Promise<string | null> {
    const endpoints = [
        this.url.endsWith('/graphql') ? this.url : `${this.url}/graphql`,
        this.url
    ]
    const uniqueEndpoints = [...new Set(endpoints)]

    // Try to get logs from Unraid API
    // Note: Unraid API may not expose logs via GraphQL
    // This is a placeholder that returns null to fall back to Docker socket
    return null
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

  async getDockerContainers(): Promise<UnraidContainer[]> {
    const endpoints = [
        this.url.endsWith('/graphql') ? this.url : `${this.url}/graphql`,
        this.url
    ]
    const uniqueEndpoints = [...new Set(endpoints)]

    // Based on introspection: type DockerContainer
    const query = `
      query {
        docker {
          containers {
            id
            names
            image
            state
            status
            labels
            ports {
                ip
                privatePort
                publicPort
                type
            }
            autoStart
          }
        }
      }
    `

    for (const endpoint of uniqueEndpoints) {
        try {
            const response = await this.executeQuery(query, endpoint)
            
            if (response.data?.errors) {
                console.warn('[UnraidService] Docker query errors:', JSON.stringify(response.data.errors))
                continue
            }

            const containers = response.data?.data?.docker?.containers
            if (Array.isArray(containers)) {
                return (containers as DockerContainerRaw[]).map((c) => {
                    // Format ports
                    let ports = ''
                    if (Array.isArray(c.ports) && c.ports.length > 0) {
                        ports = c.ports
                            .filter((p: DockerPort) => p.publicPort)
                            .map((p: DockerPort) => `${p.publicPort}:${p.privatePort}/${p.type === 'TCP' ? 'tcp' : 'udp'}`)
                            .join(', ')
                    }

                    // Format name (remove leading slash)
                    let name: string | undefined = Array.isArray(c.names) ? c.names[0] : c.names
                    if (typeof name === 'string' && name.startsWith('/')) {
                        name = name.substring(1)
                    }
                    if (!name) name = c.id || 'unknown'

                    // Extract Icon
                    let icon: string | undefined = undefined
                    if (c.labels) {
                        icon = c.labels['net.unraid.docker.icon'] || c.labels['icon'] || undefined
                    }

                    return {
                        id: c.id,
                        name: name, 
                        image: c.image,
                        state: c.state,
                        status: c.status,
                        ports: ports,
                        autoStart: c.autoStart,
                        icon: icon
                    }
                })
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                // console.error(`[UnraidService] Error fetching docker containers from ${endpoint}:`, error.message)
            }
        }
    }
    
    return []
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
