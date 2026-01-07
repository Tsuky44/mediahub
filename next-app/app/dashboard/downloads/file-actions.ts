'use server'

import { smbService, FileInfo } from '@/lib/services/smb';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import https from 'https';
import { JellystatService } from '@/lib/services/jellystat';

export async function getRemoteFiles(remotePath: string = ''): Promise<FileInfo[]> {
    try {
        return await smbService.listFiles(remotePath);
    } catch (e) {
        console.error('Failed to list SMB files', e);
        throw new Error('Impossible de lister les fichiers SMB');
    }
}

export async function createPublicShare(filePath: string, expiresDays?: number) {
    try {
        const token = uuidv4();
        const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;
        
        const share = await prisma.fileShare.create({
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
        await smbService.testConnection(config);
        return { success: true };
    } catch (e) {
        console.error('SMB connection test failed:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Échec de la connexion' };
    }
}

export async function testJellystatConnection(url: string, apiKey: string) {
    try {
        const cleanUrl = url.replace(/\/$/, '');
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        
        // Simple ping HTTP
        const response = await axios.get(cleanUrl, {
            timeout: 5000,
            httpsAgent: cleanUrl.startsWith('https') ? httpsAgent : undefined,
            validateStatus: () => true // On accepte n'importe quel code de réponse (200, 401, 404, etc.) tant que le serveur répond
        });

        return { success: true };
    } catch (e: any) {
        console.error('Jellystat ping failed:', e.message);
        return { success: false, error: 'Service injoignable' };
    }
}

export async function testEmbyConnection(url: string, apiKey: string) {
    try {
        // On extrait l'URL de base sans le chemin Emby
        const cleanUrl = url.split('/web/')[0].replace(/\/$/, '');
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        // Simple ping HTTP
        const response = await axios.get(cleanUrl, {
            timeout: 5000,
            httpsAgent: cleanUrl.startsWith('https') ? httpsAgent : undefined,
            validateStatus: () => true
        });

        return { success: true };
    } catch (e: any) {
        console.error('Emby ping failed:', e.message);
        return { success: false, error: 'Service injoignable' };
    }
}
