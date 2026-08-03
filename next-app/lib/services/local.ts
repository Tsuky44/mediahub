import { getSetting } from '../settings';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';
import { logger } from '../logger';

export interface FileInfo {
    name: string;
    size: number;
    mtime: Date;
    type: 'f' | 'd';
    fullPath: string;
}

export async function getLocalService() {
    const rootPath = await getSetting('storage_root_path');

    if (!rootPath) return null;

    logger.info('[getLocalService] Creating Local service:', { rootPath });
    return new LocalService(rootPath);
}

export class LocalService {
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    private resolve(remotePath: string): string {
        const resolved = path.resolve(this.rootPath, remotePath);
        if (!resolved.startsWith(path.resolve(this.rootPath))) {
            throw new Error('Accès en dehors du dossier racine interdit');
        }
        return resolved;
    }

    async testConnection(_config?: { rootPath?: string }): Promise<boolean> {
        const targetPath = _config?.rootPath || this.rootPath;

        if (!targetPath) {
            throw new Error('Chemin local manquant');
        }

        try {
            const stats = fs.statSync(targetPath);
            if (!stats.isDirectory()) {
                throw new Error('Le chemin spécifié n\'est pas un dossier');
            }
            fs.accessSync(targetPath, fs.constants.R_OK);
            return true;
        } catch (e) {
            const err = e as Error;
            let errorMessage = err.message || 'Échec de l\'accès au dossier local';
            if (err.message.includes('ENOENT')) errorMessage = 'Dossier introuvable - vérifiez le chemin';
            if (err.message.includes('EACCES')) errorMessage = 'Permissions insuffisantes pour accéder au dossier';
            throw new Error(errorMessage);
        }
    }

    async listFiles(remotePath: string = ''): Promise<FileInfo[]> {
        const targetPath = this.resolve(remotePath);

        try {
            const entries = fs.readdirSync(targetPath, { withFileTypes: true });

            const result: FileInfo[] = entries
                .filter((entry) => {
                    const name = entry.name.toLowerCase();
                    return !name.startsWith('.') &&
                           name !== 'system volume information' &&
                           name !== '$recycle.bin';
                })
                .map((entry) => {
                    const fullPath = path.join(targetPath, entry.name);
                    const stat = fs.statSync(fullPath);
                    return {
                        name: entry.name,
                        size: stat.size || 0,
                        mtime: stat.mtime || new Date(),
                        type: entry.isDirectory() ? 'd' : 'f',
                        fullPath: remotePath ? `${remotePath}/${entry.name}` : entry.name,
                    };
                });

            result.sort((a, b) => {
                if (a.type === 'd' && b.type !== 'd') return -1;
                if (a.type !== 'd' && b.type === 'd') return 1;
                return a.name.localeCompare(b.name);
            });

            return result;
        } catch (e) {
            logger.error('[Local] listFiles error:', e);
            throw e;
        }
    }

    async getStat(remotePath: string): Promise<{ isDirectory: boolean; size: number }> {
        const targetPath = this.resolve(remotePath);
        const stat = fs.statSync(targetPath);
        return {
            isDirectory: stat.isDirectory(),
            size: stat.size || 0,
        };
    }

    async getFileStream(remotePath: string): Promise<Readable> {
        const targetPath = this.resolve(remotePath);
        return fs.createReadStream(targetPath);
    }

    async getFolderZipStream(remotePath: string): Promise<Readable> {
        const targetPath = this.resolve(remotePath);
        const archive = archiver('zip', { zlib: { level: 6 } });

        const addFolderToArchive = (folderPath: string, archivePath: string) => {
            const entries = fs.readdirSync(folderPath, { withFileTypes: true });
            for (const entry of entries) {
                const entryFullPath = path.join(folderPath, entry.name);
                const entryArchivePath = archivePath ? `${archivePath}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    addFolderToArchive(entryFullPath, entryArchivePath);
                } else {
                    archive.file(entryFullPath, { name: entryArchivePath });
                }
            }
        };

        try {
            addFolderToArchive(targetPath, path.basename(remotePath));
            archive.finalize();
        } catch (err) {
            logger.error('[Local] ZIP creation error:', err);
            archive.destroy();
        }

        return archive;
    }

    async delete(remotePath: string): Promise<void> {
        const targetPath = this.resolve(remotePath);
        const stat = fs.statSync(targetPath);

        if (stat.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true });
        } else {
            fs.unlinkSync(targetPath);
        }
    }
}
