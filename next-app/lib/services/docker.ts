import Docker from 'dockerode';
import { prisma } from '@/lib/prisma';

export class DockerService {
    private static instance: Docker | null = null;

    private static async init() {
        // Always re-check settings to ensure we use the latest host
        let options: any = {};
        const dockerHostSetting = await prisma.setting.findFirst({
            where: { key: 'docker_host' }
        });

        const dockerHost = dockerHostSetting?.value || process.env.DOCKER_HOST;

        if (dockerHost) {
            if (dockerHost.startsWith('tcp://')) {
                const url = new URL(dockerHost.replace('tcp://', 'http://'));
                options.host = url.hostname;
                options.port = url.port;
                console.log(`[DockerService] Initialized with TCP: ${options.host}:${options.port}`);
            } else {
                options.socketPath = dockerHost;
                console.log(`[DockerService] Initialized with socket: ${options.socketPath}`);
            }
        } else {
            options.socketPath = '/var/run/docker.sock';
            console.log(`[DockerService] Initialized with default socket: ${options.socketPath}`);
        }

        this.instance = new Docker(options);
        return this.instance;
    }

    static async containerAction(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<boolean> {
        try {
            const id = String(containerId).trim();
            const docker = await this.init();
            const container = docker.getContainer(id);
            
            console.log(`[DockerService] Performing ${action} on container "${id}"`);
            
            if (action === 'start') {
                try {
                    await container.start();
                } catch (err: any) {
                    if (err.statusCode !== 304) throw err;
                }
            } else if (action === 'stop') {
                try {
                    await container.stop();
                } catch (err: any) {
                    // If container is already stopped, Docker returns 304 Not Modified
                    if (err.statusCode !== 304) throw err;
                }
            } else if (action === 'restart') {
                await container.restart();
            }
            
            return true;
        } catch (error: any) {
            console.error(`[DockerService] Error performing ${action} on ${containerId}:`, error.message);
            
            // Retry with leading slash if it was missing and error is 404
            if (error.statusCode === 404 && !containerId.startsWith('/')) {
                console.log(`[DockerService] Retrying ${action} with leading slash for ${containerId}`);
                return this.containerAction('/' + containerId, action);
            }
            
            return false;
        }
    }

    static async getContainerStats(containerId: string) {
        try {
            const docker = await this.init();
            const container = docker.getContainer(containerId);
            const stats = await container.stats({ stream: false });
            
            // Parse stats to get simpler values
            // CPU
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const numberCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
            const cpuPercent = (cpuDelta / systemCpuDelta) * numberCpus * 100.0;

            // Memory
            const usedMemory = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
            const availableMemory = stats.memory_stats.limit;
            const memoryPercent = (usedMemory / availableMemory) * 100.0;

            // Network (sum of all networks)
            let rxBytes = 0;
            let txBytes = 0;
            if (stats.networks) {
                Object.values(stats.networks).forEach((net: any) => {
                    rxBytes += net.rx_bytes;
                    txBytes += net.tx_bytes;
                });
            }

            return {
                cpu: isNaN(cpuPercent) ? 0 : cpuPercent,
                memory: {
                    used: usedMemory,
                    limit: availableMemory,
                    percent: isNaN(memoryPercent) ? 0 : memoryPercent
                },
                network: {
                    rx: rxBytes,
                    tx: txBytes
                },
                pids: stats.pids_stats?.current || 0
            };
        } catch (error: any) {
            console.error(`[DockerService] Error getting stats for ${containerId}:`, error.message);
            return null;
        }
    }

    static async getContainerDetails(containerId: string) {
        try {
            if (!containerId) {
                throw new Error('Container ID is required');
            }
            const id = String(containerId).trim();
            console.log(`[DockerService] Fetching details for containerId: "${id}"`);
            const docker = await this.init();
            const container = docker.getContainer(id);
            
            // This calls GET /containers/{id}/json
            const info = await container.inspect();
            
            return {
                id: info.Id,
                name: info.Name.startsWith('/') ? info.Name.substring(1) : info.Name,
                image: info.Config.Image,
                cmd: info.Config.Cmd ? info.Config.Cmd.join(' ') : '',
                env: info.Config.Env || [],
                volumes: (info.Mounts || []).map((m: any) => ({
                    source: m.Source,
                    destination: m.Destination,
                    mode: m.Mode,
                    rw: m.RW
                })),
                ports: Object.keys(info.NetworkSettings?.Ports || {}).map(p => {
                    const mappings = info.NetworkSettings.Ports[p];
                    return {
                        container: p,
                        host: mappings && mappings.length > 0 ? mappings[0].HostPort : null
                    };
                }),
                labels: info.Config.Labels || {},
                networkMode: info.HostConfig?.NetworkMode || 'unknown',
                restartPolicy: info.HostConfig?.RestartPolicy?.Name || 'no',
                created: info.Created,
                platform: info.Platform
            };
        } catch (error: any) {
            const statusCode = error.statusCode || 500;
            const msg = error.json?.message || error.message;
            
            // Detailed logging for proxy troubleshooting
            if (statusCode === 403) {
                console.error(`[DockerService] ACCESS FORBIDDEN (403): The Docker proxy is blocking the inspection of container "${containerId}". Please ensure "CONTAINERS=1" (or "AUTH=1") is set in your proxy configuration.`);
            } else if (statusCode === 404) {
                console.error(`[DockerService] NOT FOUND (404): Container "${containerId}" was not found. If using a proxy, ensure it has permission to see this container.`);
            } else {
                console.error(`[DockerService] Error ${statusCode} getting details for "${containerId}":`, msg);
            }
            
            throw error;
        }
    }

    static async listContainers() {
        try {
            const docker = await this.init();
            const containers = await docker.listContainers({ all: true });
            
            return containers.map(c => {
                // Name cleaning
                let name = c.Names[0] || 'Unknown';
                if (name.startsWith('/')) name = name.substring(1);

                // Ports formatting
                const ports = c.Ports
                    .filter(p => p.PublicPort)
                    .map(p => `${p.PublicPort}:${p.PrivatePort}/${p.Type === 'tcp' ? 'tcp' : 'udp'}`)
                    .join(', ');

                // Icon from labels
                const icon = c.Labels['net.unraid.docker.icon'] || c.Labels['icon'] || null;

                return {
                    id: c.Id,
                    name: name,
                    image: c.Image,
                    state: c.State.toUpperCase(), // 'running' -> 'RUNNING' to match Unraid style
                    status: c.Status,
                    ports: ports,
                    autoStart: false, // Not available in simple list
                    icon: icon
                };
            });
        } catch (error: any) {
            console.error('[DockerService] Error listing containers:', error.message);
            return null;
        }
    }
}
