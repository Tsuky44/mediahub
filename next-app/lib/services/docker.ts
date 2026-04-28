import Docker from 'dockerode';
import { prisma } from '@/lib/prisma';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
// Always log errors, regardless of dev mode
const error = (...args: unknown[]) => { console.error(...args); };
const warn = (...args: unknown[]) => { console.warn(...args); };


export class DockerService {
    private static instance: Docker | null = null;

    private static async init() {
        // Always re-check settings to ensure we use the latest host
        let options: Record<string, unknown> = {};
        try {
            const dockerHostSetting = await prisma.setting.findFirst({
                where: { key: 'docker_host' },
                select: { value: true }
            });
    
            const dockerHost = dockerHostSetting?.value || process.env.DOCKER_HOST;
            log(`[DockerService] Init - Env DOCKER_HOST: ${process.env.DOCKER_HOST}, DB Setting: ${dockerHostSetting?.value}`);
    
            if (dockerHost) {
                if (dockerHost.startsWith('tcp://')) {
                    const url = new URL(dockerHost.replace('tcp://', 'http://'));
                    options.host = url.hostname;
                    options.port = url.port;
                    log(`[DockerService] Initialized with TCP: ${options.host}:${options.port}`);
                } else {
                    options.socketPath = dockerHost;
                    log(`[DockerService] Initialized with socket: ${options.socketPath}`);
                }
            } else {
                options.socketPath = '/var/run/docker.sock';
                log(`[DockerService] Initialized with default socket: ${options.socketPath}`);
            }
    
            this.instance = new Docker(options);
            return this.instance;
        } catch (e) {
            error('[DockerService] Failed to initialize Docker client:', e);
            throw new Error(`Failed to initialize Docker client: ${(e as Error).message}`);
        }
    }

    static async containerAction(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<{ success: boolean; error?: string }> {
        try {
            const id = String(containerId).trim();
            const docker = await this.init();
            const container = docker.getContainer(id);
            
            log(`[DockerService] Performing ${action} on container "${id}"`);
            
            if (action === 'start') {
                try {
                    await container.start();
                } catch (err) {
                    // If 304, it means already started. We still want to verify.
                    if ((err as { statusCode?: number }).statusCode !== 304) {
                        error(`[DockerService] Start failed for ${id}:`, err);
                        throw err;
                    }
                    log(`[DockerService] Container ${id} already started (304), verifying state...`);
                }

                // Wait a moment to ensure it stays up (catch immediate crash loops)
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Verify it's actually running
                try {
                    const info = await container.inspect();
                    if (!info.State.Running) {
                        const errorMsg = info.State.Error || `ExitCode: ${info.State.ExitCode}, Status: ${info.State.Status}`;
                        throw new Error(`Container started but immediately exited (${errorMsg}). Check container logs.`);
                    }
                } catch (inspectErr) {
                    error(`[DockerService] Failed to inspect container ${id} after start:`, inspectErr);
                    throw new Error(`Container started but failed to verify status: ${(inspectErr as Error).message}`);
                }
            } else if (action === 'stop') {
                try {
                    await container.stop();
                } catch (err) {
                    // If container is already stopped, Docker returns 304 Not Modified
                    if ((err as { statusCode?: number }).statusCode !== 304) throw err;
                }
            } else if (action === 'restart') {
                try {
                    await container.restart();
                    
                    // Wait a moment to ensure it stays up
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Verify it's actually running
                    const info = await container.inspect();
                    if (!info.State.Running) {
                        throw new Error(`Container restarted but immediately exited (ExitCode: ${info.State.ExitCode})`);
                    }
                } catch (err) {
                    // Sometimes restart fails if container is paused or in weird state
                    // Try force stop then start
                    warn(`[DockerService] Restart failed, trying stop-then-start: ${(err as Error).message}`);
                    try {
                        await container.stop();
                    } catch (e) { 
                        const dockerErr = e as { statusCode?: number; message?: string }
                        if (dockerErr.statusCode !== 304 && dockerErr.statusCode !== 404) warn('Stop failed during restart fallback:', dockerErr.message); 
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await container.start();
                    
                    // Wait a moment to ensure it stays up
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Verify it's actually running after fallback
                    const info = await container.inspect();
                    if (!info.State.Running) {
                        throw new Error(`Container started (fallback) but immediately exited (ExitCode: ${info.State.ExitCode})`);
                    }
                }
            }
            
            return { success: true };
        } catch (err) {
            const dockerErr = err as Error & { statusCode?: number }
            error(`[DockerService] Error performing ${action} on ${containerId}:`, dockerErr.message);
            
            // Retry with leading slash if it was missing and error is 404
            if (dockerErr.statusCode === 404 && !containerId.startsWith('/')) {
                log(`[DockerService] Retrying ${action} with leading slash for ${containerId}`);
                return this.containerAction('/' + containerId, action);
            }
            
            return { success: false, error: dockerErr.message || `Failed to ${action} container` };
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
                Object.values(stats.networks).forEach((net: { rx_bytes?: number; tx_bytes?: number }) => {
                    rxBytes += net.rx_bytes || 0;
                    txBytes += net.tx_bytes || 0;
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
        } catch (err) {
            error(`[DockerService] Error getting stats for ${containerId}:`, (err as Error).message);
            return null;
        }
    }

    static async getContainerDetails(containerId: string) {
        try {
            if (!containerId) {
                throw new Error('Container ID is required');
            }
            const id = String(containerId).trim();
            log(`[DockerService] Fetching details for containerId: "${id}"`);
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
                volumes: (info.Mounts || []).map((m: { Source?: string; Destination?: string; Mode?: string; RW?: boolean }) => ({
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
        } catch (err) {
            const dockerErr = error as { statusCode?: number; json?: { message?: string }; message?: string }
            const statusCode = dockerErr.statusCode || 500;
            const msg = dockerErr.json?.message || dockerErr.message;
            
            // Detailed logging for proxy troubleshooting
            if (statusCode === 403) {
                error(`[DockerService] ACCESS FORBIDDEN (403): The Docker proxy is blocking the inspection of container "${containerId}". Please ensure "CONTAINERS=1" (or "AUTH=1") is set in your proxy configuration.`);
            } else if (statusCode === 404) {
                error(`[DockerService] NOT FOUND (404): Container "${containerId}" was not found. If using a proxy, ensure it has permission to see this container.`);
            } else {
                error(`[DockerService] Error ${statusCode} getting details for "${containerId}":`, msg);
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
        } catch (err) {
            error('[DockerService] Error listing containers:', (err as Error).message);
            return null;
        }
    }
}
