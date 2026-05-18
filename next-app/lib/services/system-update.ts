import Docker from 'dockerode';
import os from 'os';
import fs from 'fs';
import { NotificationService } from './notification-service';
import { logger } from '@/lib/logger';

const isDev = process.env.NODE_ENV === 'development';

// Use global cache to persist across hot reloads in dev
const globalForCache = global as unknown as { systemUpdateCache: SystemUpdateStatus | null };

// Initialize Docker
// We use the socket mounted in the container
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export interface ContainerUpdateStatus {
    name: string;
    currentVersion: string; // Short Image ID
    latestVersion: string;  // Short Image ID
    updateAvailable: boolean;
    imageName: string;
    error?: string;
}

export interface SystemUpdateStatus {
    app: ContainerUpdateStatus;
    tracker: ContainerUpdateStatus | null;
    checkedAt: Date;
}

export class SystemUpdateService {
    
    private static async getCurrentContainerId(): Promise<string> {
        const hostname = os.hostname();

        // Strategy 1: Check /proc/self/cgroup (Standard Docker ID location)
        try {
            if (fs.existsSync('/proc/self/cgroup')) {
                const content = fs.readFileSync('/proc/self/cgroup', 'utf8');
                const match = content.match(/[0-9a-f]{64}/);
                if (match) {
                    const id = match[0];
                    // Verify if this ID exists in Docker
                    try {
                        const container = docker.getContainer(id);
                        await container.inspect();
                        return id;
                    } catch (e) {
                         logger.warn(`[SystemUpdate] ID found in cgroup (${id}) but not found in Docker.`, e);
                    }
                }
            }
        } catch (e) {
            logger.warn('[SystemUpdate] Failed to read container ID from /proc/self/cgroup', e);
        }
        
        // Strategy 2: Check by hostname as ID or Name
        try {
            const container = docker.getContainer(hostname);
            await container.inspect();
            return hostname;
        } catch (e) {
            // Ignore
        }

        // Strategy 3: Check by ID prefix (Short ID)
        try {
            const containers = await docker.listContainers();
            const match = containers.find(c => c.Id.startsWith(hostname));
            if (match) {
                return match.Id;
            }

            // Strategy 4: Search by Image Name (Heuristic)
            // If we can't find ourselves by ID/Hostname, look for a container running "mediahub-app" image
            const appContainer = containers.find(c => {
                const names = c.Names || [];
                const image = c.Image || '';
                // Check if name contains 'mediahub' or 'app' AND is NOT tracker
                // Or if Image contains 'mediahub' and 'app' (or 'mediahub' and not 'tracker')
                const isTracker = names.some(n => n.includes('tracker')) || image.includes('tracker');
                if (isTracker) return false;

                const isApp = names.some(n => n.includes('mediahub') || n.includes('app')) || 
                              image.includes('mediahub');
                
                return isApp;
            });

            if (appContainer) {
                logger.info(`[SystemUpdate] Found App container by heuristic: ${appContainer.Id} (${appContainer.Names.join(',')})`);
                return appContainer.Id;
            }

        } catch (e) {
             logger.warn('[SystemUpdate] Failed to list/search containers', e);
        }

        return hostname;
    }

    private static async checkContainerUpdate(containerNameOrId: string, label: string): Promise<ContainerUpdateStatus> {
        try {
            let container;
            try {
                container = docker.getContainer(containerNameOrId);
                await container.inspect(); // Check if exists
            } catch (e) {
                // If by ID fails or not found, try by name if it's not the current hostname
                // But for simplicity, we assume the provided ID/Name is correct.
                // If it fails, we return error status.
                return {
                    name: label,
                    currentVersion: 'unknown',
                    latestVersion: 'unknown',
                    updateAvailable: false,
                    imageName: 'unknown',
                    error: 'Container not found'
                };
            }

            const containerInfo = await container.inspect();
            const imageId = containerInfo.Image; // Long ID (sha256:...)
            const imageName = containerInfo.Config.Image; // e.g., "myrepo/myimage:latest"

            // Pull the latest image
            logger.info(`[SystemUpdate] Pulling latest image for ${label} (${imageName})...`);
            await new Promise((resolve, reject) => {
                docker.pull(imageName, (err: unknown, stream: unknown) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream as NodeJS.ReadableStream, (err: unknown) => err ? reject(err) : resolve(true));
                });
            });

            // Inspect the pulled image
            const image = docker.getImage(imageName);
            const imageInfo = await image.inspect();
            const latestImageId = imageInfo.Id;

            const updateAvailable = imageId !== latestImageId;

            return {
                name: label,
                currentVersion: imageId.substring(7, 19),
                latestVersion: latestImageId.substring(7, 19),
                updateAvailable,
                imageName
            };

        } catch (error) {
            logger.error(`[SystemUpdate] Check failed for ${label}:`, error);
            return {
                name: label,
                currentVersion: 'error',
                latestVersion: 'error',
                updateAvailable: false,
                imageName: 'error',
                error: (error as Error).message
            };
        }
    }

    // Use global cache
    private static get cache(): SystemUpdateStatus | null {
        return globalForCache.systemUpdateCache || null;
    }

    private static set cache(value: SystemUpdateStatus | null) {
        globalForCache.systemUpdateCache = value;
    }

    private static cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
    private static isChecking: boolean = false;
    private static interval: NodeJS.Timeout | null = null;

    /**
     * Initializes the background update checker.
     * Should be called once on server startup.
     */
    static initBackgroundCheck() {
        if (this.interval) return;
        
        logger.info('[SystemUpdate] Initializing background update checker (every 5m)...');
        // Run immediately if no cache
        if (!this.cache) {
            this.checkUpdate().then(status => this.handleUpdateNotification(status)).catch(e => logger.error('[SystemUpdate] Initial check failed:', e));
        }

        this.interval = setInterval(async () => {
            // Force update in background to ensure we refresh the cache
            try {
                const status = await this.checkUpdate(true);
                await this.handleUpdateNotification(status);
            } catch (e) {
                logger.error('[SystemUpdate] Background check failed:', e);
            }
        }, this.cacheExpiry);
    }

    private static async handleUpdateNotification(status: SystemUpdateStatus) {
        if (!status) return;

        const appUpdate = status.app.updateAvailable;
        const trackerUpdate = status.tracker && status.tracker.updateAvailable;

        // If no updates, clear notifications
        if (!appUpdate && !trackerUpdate) {
            await NotificationService.clearSystemUpdateNotifications();
            return;
        }

        let version = '';
        let container = '';
        let title = '';
        let message = '';

        if (appUpdate && trackerUpdate) {
            version = `${status.app.latestVersion}+${status.tracker?.latestVersion}`;
            container = 'all';
            title = 'Mise à jour disponible: Système';
            message = `Une nouvelle version de l'Application (${status.app.latestVersion}) et du Tracker (${status.tracker?.latestVersion}) est disponible.`;
        } else if (appUpdate) {
            version = status.app.latestVersion;
            container = 'app';
            title = 'Mise à jour disponible: Application';
            message = `Une nouvelle version (${status.app.latestVersion}) de l'application est disponible.`;
        } else if (trackerUpdate) {
            version = status.tracker?.latestVersion || '';
            container = 'tracker';
            title = 'Mise à jour disponible: Tracker';
            message = `Une nouvelle version (${status.tracker?.latestVersion}) du Tracker est disponible.`;
        }

        // Clear other system update notifications to ensure only one active notification
        await NotificationService.clearSystemUpdateNotifications({ mediaId: version, mediaType: container });

        await NotificationService.notifyAdmins(
            title,
            message,
            'system_update',
            { version, container }
        );

        try {
            const { ExternalNotificationService } = await import('./external-notification-service')
            await ExternalNotificationService.send('system_update', {
                title: title,
                message: message,
                data: { version, container }
            })
        } catch (e) {
            logger.error('[SystemUpdate] Failed to send external notification:', e)
        }
    }

    /**
     * Checks if Docker image updates are available for App and Tracker.
     * Uses caching to prevent excessive API calls.
     * @param force - If true, ignores cache and forces a fresh check.
     */
    static async checkUpdate(force: boolean = false): Promise<SystemUpdateStatus> {
        // Return cache if valid and not forced
        if (!force && this.cache && (new Date().getTime() - this.cache.checkedAt.getTime() < this.cacheExpiry)) {
            return this.cache;
        }

        // Prevent concurrent checks
        if (this.isChecking && this.cache) {
            return this.cache; // Return old cache while new one is loading
        }

        this.isChecking = true;

        try {
            if (isDev) {
                this.cache = {
                    app: {
                        name: 'Application',
                        currentVersion: 'dev-hash-123',
                        latestVersion: 'dev-hash-456',
                        updateAvailable: true,
                        imageName: 'mediahub:dev'
                    },
                    tracker: {
                        name: 'Tracker',
                        currentVersion: 'dev-hash-789',
                        latestVersion: 'dev-hash-012',
                        updateAvailable: true,
                        imageName: 'mediahub-tracker:dev'
                    },
                    checkedAt: new Date()
                };
                return this.cache;
            }

            // Parallelize checks
            const [appStatus, trackerStatus] = await Promise.all([
                // 1. Check App
                (async () => {
                    const appContainerId = await this.getCurrentContainerId();
                    return this.checkContainerUpdate(appContainerId, 'Application');
                })(),
                
                // 2. Check Tracker
                (async () => {
                    try {
                        // List all containers to find tracker
                        const containers = await docker.listContainers({ all: true });
                        const trackerContainer = containers.find(c => 
                            c.Names.some(n => n.includes('mediahub-tracker') || n.includes('tracker'))
                        );

                        if (trackerContainer) {
                            return this.checkContainerUpdate(trackerContainer.Id, 'Tracker');
                        } else {
                            return {
                                name: 'Tracker',
                                currentVersion: '-',
                                latestVersion: '-',
                                updateAvailable: false,
                                imageName: '-',
                                error: 'Container Tracker introuvable'
                            } as ContainerUpdateStatus;
                        }
                    } catch (error) {
                        return {
                            name: 'Tracker',
                            currentVersion: '-',
                            latestVersion: '-',
                            updateAvailable: false,
                            imageName: '-',
                            error: 'Erreur recherche Tracker'
                        } as ContainerUpdateStatus;
                    }
                })()
            ]);

            this.cache = {
                app: appStatus,
                tracker: trackerStatus,
                checkedAt: new Date()
            };

            return this.cache;
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Triggers an update using Watchtower for BOTH containers.
     */
    static async performUpdate(): Promise<void> {
        // Clear notifications first
        await NotificationService.clearSystemUpdateNotifications();

        if (isDev) {
            logger.info('[SystemUpdate] Dev mode: Update simulated.');
            return;
        }

        try {
            // Identify containers to update
            const containersToUpdate: string[] = [];
            
            // App
            const appContainerId = await this.getCurrentContainerId();
            const appContainer = docker.getContainer(appContainerId);
            const appInfo = await appContainer.inspect();
            const appName = appInfo.Name.startsWith('/') ? appInfo.Name.substring(1) : appInfo.Name;
            containersToUpdate.push(appName);

            // Tracker
            const containers = await docker.listContainers({ all: true });
            const trackerContainer = containers.find(c => 
                c.Names.some(n => n.includes('mediahub-tracker') || n.includes('tracker'))
            );
            
            if (trackerContainer) {
                const trackerName = trackerContainer.Names[0].startsWith('/') ? trackerContainer.Names[0].substring(1) : trackerContainer.Names[0];
                containersToUpdate.push(trackerName);
            }

            logger.info(`[SystemUpdate] Spawning Watchtower to update: ${containersToUpdate.join(', ')}...`);

            // Pull Watchtower
            const watchtowerImage = 'containrrr/watchtower:latest';
            await new Promise((resolve, reject) => {
                docker.pull(watchtowerImage, (err: unknown, stream: unknown) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream as NodeJS.ReadableStream, (err: unknown) => err ? reject(err) : resolve(true));
                });
            });

            // Run Watchtower
            // Command: --run-once --cleanup --include-restarting container1 container2
            const cmd = ['--run-once', '--cleanup', '--include-restarting', ...containersToUpdate];

            const watchtower = await docker.createContainer({
                Image: watchtowerImage,
                Cmd: cmd,
                HostConfig: {
                    Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
                    AutoRemove: true
                }
            });

            await watchtower.start();
            logger.info('[SystemUpdate] Watchtower started.');

        } catch (error) {
            logger.error('[SystemUpdate] Update failed:', error);
            throw new Error(`Failed to start update process: ${(error as Error).message}`);
        }
    }
}
