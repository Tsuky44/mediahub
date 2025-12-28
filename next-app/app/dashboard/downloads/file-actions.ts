'use server'

import { smbService, FileInfo } from '@/lib/services/smb';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

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
