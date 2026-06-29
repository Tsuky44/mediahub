import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { logger } from '@/lib/logger';

export interface ChangelogCategory {
    added?: string[];
    fixed?: string[];
    changed?: string[];
    security?: string[];
}

export interface ChangelogVersion {
    version: string;
    date: string;
    changes: ChangelogCategory;
}

export class VersionService {
    private static changelogCache: ChangelogVersion[] | null = null;
    private static cacheTime: number = 0;
    private static CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

    /**
     * Get the current running version of the app from package.json
     */
    static getCurrentVersion(): string {
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                return packageJson.version || '0.1.0';
            }
        } catch (e) {
            logger.error('[VersionService] Failed to read package.json version', e);
        }
        return '0.1.0';
    }

    /**
     * Parses CHANGELOG.md content into structured data
     */
    static parseChangelog(content: string): ChangelogVersion[] {
        const versions: ChangelogVersion[] = [];
        const lines = content.split('\n');
        
        let currentVersion: ChangelogVersion | null = null;
        let currentCategory: keyof ChangelogCategory | null = null;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Match ## [0.2.0] - 2026-06-02 or ## [v0.2.0] - 2026-06-02
            const versionMatch = line.match(/^##\s*\[v?(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/i);
            if (versionMatch) {
                if (currentVersion) {
                    versions.push(currentVersion);
                }
                currentVersion = {
                    version: versionMatch[1],
                    date: versionMatch[2],
                    changes: {}
                };
                currentCategory = null;
                continue;
            }

            if (!currentVersion) continue;

            // Match category: ### Added, ### Fixed, ### Changed, etc.
            const categoryMatch = line.match(/^###\s*(Added|Fixed|Changed|Security|Mises à jour|Corrections|Changements)/i);
            if (categoryMatch) {
                const categoryRaw = categoryMatch[1].toLowerCase();
                if (categoryRaw === 'added' || categoryRaw === 'mises à jour') {
                    currentCategory = 'added';
                } else if (categoryRaw === 'fixed' || categoryRaw === 'corrections') {
                    currentCategory = 'fixed';
                } else if (categoryRaw === 'changed' || categoryRaw === 'changements') {
                    currentCategory = 'changed';
                } else if (categoryRaw === 'security') {
                    currentCategory = 'security';
                } else {
                    currentCategory = null;
                }
                if (currentCategory && !currentVersion.changes[currentCategory]) {
                    currentVersion.changes[currentCategory] = [];
                }
                continue;
            }

            // Match bullet point
            if (line.startsWith('-') || line.startsWith('*')) {
                if (currentCategory && currentVersion.changes[currentCategory]) {
                    const item = line.substring(1).trim();
                    if (item) {
                        currentVersion.changes[currentCategory]!.push(item);
                    }
                }
            }
        }

        if (currentVersion) {
            versions.push(currentVersion);
        }

        return versions;
    }

    /**
     * Get changelogs either locally or from remote GitHub repository
     */
    static async getChangelog(forceRefresh: boolean = false): Promise<ChangelogVersion[]> {
        const now = Date.now();
        if (!forceRefresh && this.changelogCache && (now - this.cacheTime < this.CACHE_DURATION)) {
            return this.changelogCache;
        }

        let changelogContent = '';

        // 1. Try to fetch from remote GitHub repo to get newest version logs
        try {
            logger.info('[VersionService] Fetching remote CHANGELOG.md from GitHub...');
            const response = await axios.get(
                'https://raw.githubusercontent.com/tsuky44/mediahub/main/next-app/CHANGELOG.md',
                { timeout: 4000 }
            );
            if (response.status === 200 && typeof response.data === 'string') {
                changelogContent = response.data;
            }
        } catch (e: any) {
            logger.warn('[VersionService] Failed to fetch remote CHANGELOG.md, using local. Error:', e.message);
        }

        // 2. Fallback to local CHANGELOG.md
        if (!changelogContent) {
            try {
                const localChangelogPath = path.join(process.cwd(), 'CHANGELOG.md');
                if (fs.existsSync(localChangelogPath)) {
                    changelogContent = fs.readFileSync(localChangelogPath, 'utf8');
                }
            } catch (e) {
                logger.error('[VersionService] Failed to read local CHANGELOG.md', e);
            }
        }

        if (changelogContent) {
            this.changelogCache = this.parseChangelog(changelogContent);
            this.cacheTime = now;
            return this.changelogCache;
        }

        return [];
    }

    /**
     * Fetch available tags from GitHub Container Registry (ghcr.io) for mediahub-app
     */
    static async getAvailableDockerTags(): Promise<string[]> {
        try {
            logger.info('[VersionService] Fetching tags list from ghcr.io...');
            // Step 1: Get anonymous token
            const tokenRes = await axios.get(
                'https://ghcr.io/token?scope=repository:tsuky44/mediahub-app:pull&service=ghcr.io',
                { timeout: 5000 }
            );
            const token = tokenRes.data?.token;
            if (!token) throw new Error('No token returned from ghcr.io/token');

            // Step 2: Get tags list
            const tagsRes = await axios.get(
                'https://ghcr.io/v2/tsuky44/mediahub-app/tags/list',
                {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                }
            );

            const tags: string[] = tagsRes.data?.tags || [];
            
            // Filter out non-semantic version tags (keep only vX.Y.Z, or vX.Y, latest)
            // Sorting tags: Put semantic versions first, descending order, 'latest' at the end
            const semanticTags = tags
                .filter(tag => /^v?\d+\.\d+\.\d+$/.test(tag))
                .sort((a, b) => {
                    const cleanA = a.replace(/^v/, '').split('.').map(Number);
                    const cleanB = b.replace(/^v/, '').split('.').map(Number);
                    
                    for (let i = 0; i < 3; i++) {
                        if ((cleanA[i] || 0) > (cleanB[i] || 0)) return -1;
                        if ((cleanA[i] || 0) < (cleanB[i] || 0)) return 1;
                    }
                    return 0;
                });

            // Also include major/minor tags like v1.0 and latest at the end or top
            const otherTags = tags.filter(tag => tag === 'latest' || /^v?\d+\.\d+$/.test(tag));
            
            return [...semanticTags, ...otherTags];
        } catch (error: any) {
            logger.error('[VersionService] Failed to fetch tags from ghcr.io:', error.message);
            // Fallback: if offline, return local versions from package.json/changelog
            const current = this.getCurrentVersion();
            return [`v${current}`, 'latest'];
        }
    }
}
