'use server'

import { FileInfo, SmbService } from '@/lib/services/smb';
import { UnraidService } from '@/lib/services/unraid';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import https from 'https';
import { getSmbServiceForUser, authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { checkAccess } from './actions';

export async function getRemoteFiles(remotePath: string = ''): Promise<FileInfo[]> {
    try {
        await checkAccess('downloads.read_explorer');
        const smbService = await getSmbServiceForUser();
        if (!smbService) return [];
        const files = await smbService.listFiles(remotePath);
        return Array.isArray(files) ? files : [];
    } catch (e) {
        console.error('Failed to list SMB files', e);
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
        const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;
        
        const share = await (prisma as any).fileShare.create({
            data: {
                filePath,
                token,
                expiresAt
            }
        });
        
        return { success: true, token: share.token };
    } catch (e) {
        console.error('Failed to create public share', e);
        return { success: false, error: 'Erreur lors de la création du lien de partage' };
    }
}

export async function testSmbConnection(config: { host: string, user: string, pass: string, share: string }) {
    try {
        const smbService = new SmbService(config.host, config.share, config.user, config.pass);
        await smbService.testConnection(config);
        return { success: true };
    } catch (e) {
        console.error('SMB connection test failed:', e);
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
    } catch (e: any) {
        console.error('Emby ping failed:', e.message);
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
    } catch (e: any) {
        console.error('Plex ping failed:', e.message);
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
    } catch (e: any) {
        console.error('Jellyfin ping failed:', e.message);
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
    } catch (e: any) {
        console.error('Unraid connection test failed:', e.message);
        return { success: false, error: 'Serveur Unraid injoignable ou clé API invalide' };
    }
}
