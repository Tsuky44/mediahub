'use server'

import { FileInfo, SmbService } from '@/lib/services/smb';
import { FtpService } from '@/lib/services/ftp';
import { UnraidService } from '@/lib/services/unraid';
import { db } from '@/lib/db/drizzle';
import { fileShares } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import https from 'https';
import { getStorageServiceForUser, authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { checkAccess } from './actions';
import { logger } from '@/lib/logger';

export async function getRemoteFiles(remotePath: string = ''): Promise<FileInfo[]> {
    try {
        await checkAccess('downloads.read_explorer');
        logger.info('[getRemoteFiles] Fetching files for path:', remotePath);
        const storageService = await getStorageServiceForUser();
        logger.info('[getRemoteFiles] Got storage service:', storageService?.constructor?.name || 'null');
        if (!storageService) return [];
        const files = await storageService.listFiles(remotePath);
        logger.info('[getRemoteFiles] Returned', files?.length || 0, 'files');
        return Array.isArray(files) ? files : [];
    } catch (e) {
        logger.error('[getRemoteFiles] Failed to list storage files:', e);
        return [];
    }
}

export async function createPublicShare(filePath: string, expiresDays?: number) {
    try {
        await checkAccess('downloads.share_files');
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: 'Non autorisé' };
        }
        
        const token = uuidv4();
        const expiresAt = expiresDays ? new Date(Date.now() + Number(expiresDays) * 24 * 60 * 60 * 1000) : null;
        
        const inserted = await db.insert(fileShares).values({
            filePath,
            token,
            expiresAt,
            createdAt: new Date()
        }).returning();
        const share = inserted[0];
        
        return { success: true, token: share.token };
    } catch (e) {
        logger.error('Failed to create public share', e);
        return { success: false, error: 'Erreur lors de la création du lien de partage' };
    }
}

export async function testSmbConnection(config: { host: string, user: string, pass: string, share: string }) {
    try {
        const smbService = new SmbService(config.host, config.share, config.user, config.pass);
        await smbService.testConnection(config);
        return { success: true };
    } catch (e) {
        logger.error('SMB connection test failed:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Échec de la connexion' };
    }
}

export async function testStorageConnection(config: { 
    protocol: 'smb' | 'ftp',
    host: string, 
    port?: string,
    user: string, 
    pass: string, 
    share: string,
    rootPath?: string,
    secure?: boolean
}) {
    try {
        if (config.protocol === 'ftp') {
            const ftpService = new FtpService(
                config.host, 
                config.port ? parseInt(config.port) : 21, 
                config.user, 
                config.pass,
                config.rootPath || '',
                config.secure || false
            );
            await ftpService.testConnection({
                host: config.host,
                port: config.port ? parseInt(config.port) : 21,
                user: config.user,
                pass: config.pass,
                rootPath: config.rootPath,
                secure: config.secure || false
            });
        } else {
            const smbService = new SmbService(config.host, config.share, config.user, config.pass, config.rootPath);
            await smbService.testConnection({
                host: config.host,
                share: config.share,
                user: config.user,
                pass: config.pass
            });
        }
        return { success: true };
    } catch (e) {
        logger.error('Storage connection test failed:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Échec de la connexion' };
    }
}

export async function testEmbyConnection(url: string, apiKey: string) {
    try {
        // On extrait l'URL de base sans le chemin Emby
        const cleanUrl = url.split('/web/')[0].replace(/\/$/, '');
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        // Simple ping HTTP
        const response = await axios.get(`${cleanUrl}/System/Info/Public`, {
            timeout: 5000,
            httpsAgent: cleanUrl.startsWith('https') ? httpsAgent : undefined,
            validateStatus: (status) => status === 200
        });

        return { success: true };
    } catch (e) {
        logger.error('Emby ping failed:', axios.isAxiosError(e) ? e.message : String(e));
        return { success: false, error: 'Serveur Emby injoignable ou invalide' };
    }
}

export async function testPlexConnection(url: string, token: string) {
    try {
        const cleanUrl = url.replace(/\/$/, '');
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        // Plex /identity endpoint doesn't require token but confirms it's a Plex server
        const response = await axios.get(`${cleanUrl}/identity`, {
            timeout: 5000,
            httpsAgent: cleanUrl.startsWith('https') ? httpsAgent : undefined,
            headers: { 'Accept': 'application/json' },
            validateStatus: (status) => status === 200
        });

        return { success: true };
    } catch (e) {
        logger.error('Plex ping failed:', axios.isAxiosError(e) ? e.message : String(e));
        return { success: false, error: 'Serveur Plex injoignable ou invalide' };
    }
}

export async function testJellyfinConnection(url: string, apiKey: string) {
    try {
        const cleanUrl = url.replace(/\/$/, '');
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        // Jellyfin also has /system/info/public
        const response = await axios.get(`${cleanUrl}/System/Info/Public`, {
            timeout: 5000,
            httpsAgent: cleanUrl.startsWith('https') ? httpsAgent : undefined,
            validateStatus: (status) => status === 200
        });

        return { success: true };
    } catch (e) {
        logger.error('Jellyfin ping failed:', axios.isAxiosError(e) ? e.message : String(e));
        return { success: false, error: 'Serveur Jellyfin injoignable ou invalide' };
    }
}

export async function testUnraidConnection(url: string, apiKey: string) {
    try {
        const unraidService = new UnraidService(url, apiKey);
        const stats = await unraidService.getStorageStats();
        if (stats) {
            return { success: true };
        }
        return { success: false, error: 'Impossible de récupérer les statistiques Unraid' };
    } catch (e) {
        logger.error('Unraid connection test failed:', axios.isAxiosError(e) ? e.message : String(e));
        return { success: false, error: 'Serveur Unraid injoignable ou clé API invalide' };
    }
}
