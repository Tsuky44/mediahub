import Docker from 'dockerode';
import os from 'os';
import fs from 'fs';
import { logger } from '@/lib/logger';
import { VersionService, ChangelogVersion } from './version';
import { createUpdateNotification, clearUpdateNotifications } from '@/lib/notifications/internal';

const isDev = process.env.NODE_ENV === 'development';

// Use global cache to persist across hot reloads in dev
const globalForCache = global as unknown as { systemUpdateCache: SystemUpdateStatus | null };

// Initialize Docker
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export interface ContainerUpdateStatus {
    name: string;
    currentVersion: string; // Semantic version tag (e.g. "v0.1.0" or "latest")
    latestVersion: string;  // Latest available tag (e.g. "v0.2.0")
    updateAvailable: boolean;
    imageName: string;
    availableTags: string[]; // List of tags from GHCR for version switching!
    error?: string;
}

export interface SystemUpdateStatus {
    app: ContainerUpdateStatus;
    tracker: ContainerUpdateStatus | null;
    checkedAt: Date;
    changelog: ChangelogVersion[];
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
            const appContainer = containers.find(c => {
                const names = c.Names || [];
                const image = c.Image || '';
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
            try {
                const status = await this.checkUpdate(true);
                await this.handleUpdateNotification(status);
            } catch (e) {
                logger.error('[SystemUpdate] Background check failed:', e);
            }
        }, this.cacheExpiry);
    }

    private static lastNotifiedVersion: string | null = null;
    private static hasClearedUpdateNotif = false;

    private static async handleUpdateNotification(status: SystemUpdateStatus) {
        if (!status) return;

        const appUpdate = status.app.updateAvailable;
        const trackerUpdate = status.tracker && status.tracker.updateAvailable;

        if (!appUpdate && !trackerUpdate) {
            // Update installed — clear the notification if present
            if (!this.hasClearedUpdateNotif) {
                this.hasClearedUpdateNotif = true;
                try {
                    await clearUpdateNotifications();
                    logger.info('[SystemUpdate] Cleared update notification after install.');
                } catch (e) {
                    logger.error('[SystemUpdate] Failed to clear update notification:', e);
                }
            }
            return;
        }

        // Reset clear flag when a new update appears
        this.hasClearedUpdateNotif = false;

        const version = status.app.latestVersion;

        // Deduplicate: only notify once per version
        if (this.lastNotifiedVersion === version) {
            return;
        }
        this.lastNotifiedVersion = version;

        let title = '';
        let message = '';

        if (appUpdate && trackerUpdate) {
            title = 'Mise à jour disponible: Système';
            message = `Une nouvelle version de l'Application et du Tracker (${version}) est disponible.`;
        } else if (appUpdate) {
            title = 'Mise à jour disponible: Application';
            message = `Une nouvelle version (${version}) de l'application est disponible.`;
        } else if (trackerUpdate) {
            title = 'Mise à jour disponible: Tracker';
            message = `Une nouvelle version du Tracker (${status.tracker?.latestVersion}) est disponible.`;
        }

        logger.info(`[SystemUpdate] Update available: ${title} - ${message}`);

        try {
            await createUpdateNotification(version);
        } catch (e) {
            logger.error('[SystemUpdate] Failed to create internal update notification:', e);
        }
    }

    /**
     * Checks for updates and returns the current status using semantic versions.
     */
    static async checkUpdate(force: boolean = false): Promise<SystemUpdateStatus> {
        // Return cache if valid and not forced
        if (!force && this.cache && (new Date().getTime() - this.cache.checkedAt.getTime() < this.cacheExpiry)) {
            return this.cache;
        }

        // Prevent concurrent checks
        if (this.isChecking && this.cache) {
            return this.cache;
        }

        this.isChecking = true;

        try {
            // 1. Get package.json version
            const currentPkgVersion = VersionService.getCurrentVersion();
            const currentTag = `v${currentPkgVersion}`;

            // 2. Fetch changelog
            const changelog = await VersionService.getChangelog(force);

            if (isDev) {
                this.cache = {
                    app: {
                        name: 'Application',
                        currentVersion: currentTag,
                        latestVersion: 'v0.2.0',
                        updateAvailable: true,
                        imageName: 'ghcr.io/tsuky44/mediahub-app:latest',
                        availableTags: ['v0.2.0', 'v0.1.0', 'latest']
                    },
                    tracker: {
                        name: 'Tracker',
                        currentVersion: currentTag,
                        latestVersion: 'v0.2.0',
                        updateAvailable: true,
                        imageName: 'ghcr.io/tsuky44/mediahub-tracker:latest',
                        availableTags: ['v0.2.0', 'v0.1.0', 'latest']
                    },
                    checkedAt: new Date(),
                    changelog
                };
                return this.cache;
            }

            // 3. Get tags from GHCR
            const availableTags = await VersionService.getAvailableDockerTags();
            
            // Determine latest semantic version tag
            const latestSemanticTag = availableTags.find(tag => /^v\d+\.\d+\.\d+$/.test(tag)) || 'latest';
            
            // Compare semantic versions: returns 1 if a > b, -1 if a < b, 0 if equal
            const compareSemVer = (a: string, b: string): number => {
                const partsA = a.replace(/^v/, '').split('.').map(Number);
                const partsB = b.replace(/^v/, '').split('.').map(Number);
                for (let i = 0; i < 3; i++) {
                    const diff = (partsA[i] || 0) - (partsB[i] || 0);
                    if (diff !== 0) return diff > 0 ? 1 : -1;
                }
                return 0;
            };

            // Check if latest semantic version is strictly newer than current version
            let updateAvailable = false;
            let effectiveLatestTag = latestSemanticTag;
            if (latestSemanticTag !== 'latest') {
                const cmp = compareSemVer(latestSemanticTag, currentPkgVersion);
                if (cmp > 0) {
                    updateAvailable = true;
                } else {
                    // Current version is same or newer than latest published tag
                    // Use current version as the displayed "latest" to avoid confusion
                    effectiveLatestTag = currentTag;
                }
            }

            // 4. Inspect current Docker App container
            let appImageName = 'ghcr.io/tsuky44/mediahub-app:latest';
            try {
                const appContainerId = await this.getCurrentContainerId();
                const appContainer = docker.getContainer(appContainerId);
                const appInfo = await appContainer.inspect();
                appImageName = appInfo.Config.Image;
            } catch (e) {
                logger.warn('[SystemUpdate] Failed to inspect current App container image name', e);
            }

            // 5. Inspect current Docker Tracker container
            let trackerImageName = '-';
            let trackerContainerId: string | null = null;
            try {
                const containers = await docker.listContainers({ all: true });
                const trackerContainer = containers.find(c => 
                    c.Names.some(n => n.includes('mediahub-tracker') || n.includes('tracker'))
                );
                if (trackerContainer) {
                    trackerContainerId = trackerContainer.Id;
                    trackerImageName = trackerContainer.Image;
                }
            } catch (e) {
                logger.warn('[SystemUpdate] Failed to search tracker container', e);
            }

            const appStatus: ContainerUpdateStatus = {
                name: 'Application',
                currentVersion: currentTag,
                latestVersion: effectiveLatestTag,
                updateAvailable,
                imageName: appImageName,
                availableTags
            };

            let trackerStatus: ContainerUpdateStatus | null = null;
            if (trackerContainerId) {
                trackerStatus = {
                    name: 'Tracker',
                    currentVersion: currentTag,
                    latestVersion: effectiveLatestTag,
                    updateAvailable,
                    imageName: trackerImageName,
                    availableTags
                };
            }

            this.cache = {
                app: appStatus,
                tracker: trackerStatus,
                checkedAt: new Date(),
                changelog
            };

            return this.cache;
        } catch (error) {
            logger.error('[SystemUpdate] Check failed:', error);
            // Fallback in case of failure
            return {
                app: {
                    name: 'Application',
                    currentVersion: 'v' + VersionService.getCurrentVersion(),
                    latestVersion: 'error',
                    updateAvailable: false,
                    imageName: 'error',
                    availableTags: []
                },
                tracker: null,
                checkedAt: new Date(),
                changelog: []
            };
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * Triggers an update or version switch using a companion container.
     */
    static async performUpdate(targetTag?: string): Promise<void> {
        const LOG_FILE = '/data/db/update.log';
        
        const writeUpdateLog = (message: string) => {
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const formatted = `[${timestamp}] [SYSTEM] ${message}\n`;
            console.log(`[SystemUpdate] ${message}`);
            try {
                fs.appendFileSync(LOG_FILE, formatted);
            } catch (e: any) {
                console.error('[SystemUpdate] Failed to write to update.log:', e.message);
            }
        };

        const writeStep = (step: string) => {
            writeUpdateLog(`[STEP] ${step}`);
        };

        logger.info(`[SystemUpdate] Triggering update to tag: ${targetTag || 'latest'}`);
        
        try {
            // Ensure the directory exists
            if (!fs.existsSync('/data/db')) {
                fs.mkdirSync('/data/db', { recursive: true });
            }
            // Initialize fresh log file
            fs.writeFileSync(LOG_FILE, `=== Initialisation de la mise à jour: ${new Date().toLocaleString()} ===\n`);
        } catch (e: any) {
            console.error('[SystemUpdate] Failed to init log file:', e.message);
        }

        writeUpdateLog(`Lancement du processus de mise à jour vers : ${targetTag || 'la dernière version'}`);

        if (isDev) {
            writeUpdateLog('Mode DEV détecté : Simulation de mise à jour réussie.');
            return;
        }

        try {
            // 1. Determine target tag
            let tag = targetTag;
            writeStep('determining_tag');
            writeUpdateLog('Détermination du tag cible...');
            if (!tag) {
                const tags = await VersionService.getAvailableDockerTags();
                const latestSemantic = tags.find(t => /^v\d+\.\d+\.\d+$/.test(t));
                tag = latestSemantic || 'latest';
            }

            // Ensure proper v-prefix formatting
            if (tag !== 'latest' && !tag.startsWith('v')) {
                tag = `v${tag}`;
            }
            writeUpdateLog(`Tag cible validé : ${tag}`);

            // 2. Identify current containers and details
            writeStep('identifying_container');
            writeUpdateLog('Identification du conteneur App actuel...');
            const appContainerId = await this.getCurrentContainerId();
            writeUpdateLog(`Conteneur App actuel identifié : ${appContainerId.substring(0, 12)}`);
            
            const appContainer = docker.getContainer(appContainerId);
            const appInfo = await appContainer.inspect();
            const appImageName = appInfo.Config.Image; // e.g. "ghcr.io/tsuky44/mediahub-app:v0.1.0"
            writeUpdateLog(`Image actuelle : ${appImageName}`);
            
            // Extract github user from image name (defaults to 'tsuky44')
            let githubUser = 'tsuky44';
            const matchUser = appImageName.match(/ghcr\.io\/([^/]+)\/mediahub/);
            if (matchUser) {
                githubUser = matchUser[1];
            }

            const appTargetImage = `ghcr.io/${githubUser}/mediahub-app:${tag}`;
            const trackerTargetImage = `ghcr.io/${githubUser}/mediahub-tracker:${tag}`;
            writeUpdateLog(`Image cible pour l'application : ${appTargetImage}`);

            // 3. Detect tracker and prepare parallel pulls
            writeUpdateLog("Vérification de la présence d'un conteneur Tracker...");
            const containers = await docker.listContainers({ all: true });
            const trackerContainer = containers.find(c => 
                c.Names.some(n => n.includes('mediahub-tracker') || n.includes('tracker'))
            );
            let trackerContainerId = 'null';
            if (trackerContainer) {
                trackerContainerId = trackerContainer.Id;
                writeUpdateLog(`Tracker détecté (ID: ${trackerContainerId.substring(0, 12)})`);
            } else {
                writeUpdateLog("Aucun conteneur Tracker n'est configuré ou détecté.");
            }

            // 4. Pull images in parallel with live progress
            writeStep('download_app');
            writeUpdateLog(`[Étape 1/3] Téléchargement de l'image de l'application : ${appTargetImage}...`);
            const appPullPromise = this.pullImageWithProgress(appTargetImage, writeUpdateLog, 'app');
            const trackerPullPromise = trackerContainerId !== 'null'
                ? this.pullImageWithProgress(trackerTargetImage, writeUpdateLog, 'tracker')
                : Promise.resolve();

            await appPullPromise;
            if (trackerContainerId !== 'null') {
                writeStep('download_tracker');
                await trackerPullPromise;
            }

            // 4. Create and run companion container using the newly pulled app image
            writeStep('creating_companion');
            writeUpdateLog(`[Étape 2/3] Création du conteneur compagnon de récréation...`);
            
            // To ensure the companion container can write to the persistent log file,
            // we copy the volume binds of the original app container!
            // Let's verify and map the binds of the current app container so the companion
            // container mounts the same `/data/db` volume.
            const originalBinds = appInfo.HostConfig.Binds ? [...appInfo.HostConfig.Binds] : [];
            const binds = Array.from(new Set(originalBinds));
            
            // We must ensure the docker socket is bound, checking by container-side target mount point
            const isDockerSocketMounted = binds.some(b => {
                const parts = b.split(':');
                return parts[1] === '/var/run/docker.sock';
            });

            if (!isDockerSocketMounted) {
                binds.push('/var/run/docker.sock:/var/run/docker.sock');
            }

            const companion = await docker.createContainer({
                Image: appTargetImage,
                Cmd: ['node', 'scripts/recreate-containers.js', appContainerId, trackerContainerId, tag, githubUser],
                User: 'root', // Need root to access Docker socket and write logs
                HostConfig: {
                    Binds: binds,
                    AutoRemove: true
                }
            });
            
            writeUpdateLog(`Conteneur compagnon créé (ID: ${companion.id.substring(0, 12)})`);
            writeStep('companion_running');
            writeUpdateLog(`[Étape 3/3] Lancement du conteneur compagnon. Passage de témoin...`);

            await companion.start();
            writeUpdateLog(`Le compagnon a démarré avec succès. Ce conteneur principal va s'arrêter pour laisser place à la nouvelle version.`);

        } catch (error: any) {
            writeUpdateLog(`❌ ÉCHEC DE LA MISE À JOUR : ${error.message}`);
            logger.error('[SystemUpdate] Update failed:', error);
            throw new Error(`Failed to perform update: ${error.message}`);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static async pullImageWithProgress(
        imageName: string,
        writeLog: (msg: string) => void,
        label = 'app'
    ): Promise<void> {
        // Optimization: skip pull if image already exists locally
        try {
            const img = docker.getImage(imageName);
            await img.inspect();
            writeLog(`Image ${imageName} déjà présente localement. Pas de téléchargement nécessaire.`);
            return;
        } catch {
            // Image not present locally, proceed with pull
        }

        writeLog(`Début du téléchargement de ${imageName}...`);

        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: unknown, stream: unknown) => {
                if (err) {
                    writeLog(`❌ Échec d'amorçage du pull pour ${imageName}: ${(err as Error).message}`);
                    return reject(err);
                }

                const layerProgress = new Map<string, { current: number; total: number }>();
                let lastLoggedPercent = -1;

                docker.modem.followProgress(
                    stream as NodeJS.ReadableStream,
                    (err: unknown) => {
                        if (err) {
                            writeLog(`❌ Échec du téléchargement de ${imageName}: ${(err as Error).message}`);
                            return reject(err);
                        }
                        writeLog(`Image ${imageName} téléchargée avec succès.`);
                        resolve(true);
                    },
                    (event: unknown) => {
                        const evt = event as { id?: string; status?: string; progressDetail?: { current?: number; total?: number } };
                        if (!evt || !evt.id) return;

                        if (evt.status === 'Already exists' || evt.status === 'Pull complete') {
                            layerProgress.set(evt.id, { current: 1, total: 1 });
                        } else if (evt.progressDetail && typeof evt.progressDetail.current === 'number' && typeof evt.progressDetail.total === 'number') {
                            layerProgress.set(evt.id, {
                                current: evt.progressDetail.current,
                                total: evt.progressDetail.total
                            });
                        }

                        let totalCurrent = 0;
                        let totalOverall = 0;
                        for (const layer of layerProgress.values()) {
                            totalCurrent += layer.current;
                            totalOverall += layer.total;
                        }

                        if (totalOverall > 0) {
                            const percent = Math.min(100, Math.round((totalCurrent / totalOverall) * 100));
                            if (percent !== lastLoggedPercent && percent % 5 === 0) {
                                lastLoggedPercent = percent;
                                const currentMB = (totalCurrent / (1024 * 1024)).toFixed(0);
                                const totalMB = (totalOverall / (1024 * 1024)).toFixed(0);
                                writeLog(`[PROGRESS] ${label} ${percent}% (${currentMB}MB/${totalMB}MB)`);
                            }
                        }
                    }
                );
            });
        });
    }
}
