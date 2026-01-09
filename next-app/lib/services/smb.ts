import { getSetting } from '../settings';
import SMB2 from '@marsaud/smb2';
import path from 'path';
import archiver from 'archiver';

export interface FileInfo {
    name: string;
    size: number;
    mtime: Date;
    type: 'f' | 'd';
    fullPath: string;
}

export class SmbService {
    private client: any = null;
    private host: string;
    private username?: string;
    private password?: string;
    private share: string;
    private rootSubPath: string;

    constructor(host: string, share: string, username?: string, password?: string, rootSubPath: string = '') {
        this.host = host;
        this.share = share;
        this.username = username;
        this.password = password;
        this.rootSubPath = rootSubPath;
    }

    private async connect() {
        if (this.client) {
            return this.client;
        }

        if (!this.host || !this.share) {
            throw new Error('SMB settings are not configured');
        }

        this.client = new SMB2({
            share: `\\\\${this.host}\\${this.share}`,
            domain: '',
            username: this.username || '',
            password: this.password || '',
            autoCloseTimeout: 0,
            packetConcurrency: 8
        });

        return this.client;
    }

    private async isConnected() {
        if (!this.client) return false;
        try {
            // @marsaud/smb2 doesn't have a simple ping, so readdir('') is a decent check
            // Add a timeout to prevent hanging if the connection is dead
            await Promise.race([
                new Promise<void>((resolve, reject) => {
                    this.client.readdir('', (err: any) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Connection check timeout')), 5000))
            ]);
            return true;
        } catch (e) {
            console.warn('[SMB] Connection check failed:', e instanceof Error ? e.message : e);
            return false;
        }
    }

    private async withRetry<T>(operation: (client: any) => Promise<T>, retries = 3): Promise<T> {
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                // Proactively check and reconnect if needed
                // If isConnected hangs, it will now timeout thanks to the update above
                const connected = await this.isConnected();
                if (i > 0 || !connected) {
                    if (i > 0) console.log(`[SMB] Retrying connection (attempt ${i + 1}/${retries})...`);
                    await this.disconnect();
                }
                
                const client = await this.connect();
                
                // Add a global timeout for the operation itself
                return await Promise.race([
                    operation(client),
                    new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error('Operation timeout')), 30000)
                    )
                ]);
            } catch (err: any) {
                lastError = err;
                console.error(`[SMB] Operation failed (attempt ${i + 1}/${retries}):`, err.message || err);
                
                // If it's a connection error, disconnect to force a fresh connection on next attempt
                if (err.code === 'STATUS_CONNECTION_DISCONNECTED' || 
                    err.code === 'STATUS_FILE_CLOSED' ||
                    err.message?.includes('socket') ||
                    err.message?.includes('connection')) {
                    await this.disconnect();
                }
                
                if (i < retries - 1) {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }

    private async disconnect() {
        if (this.client) {
            try {
                this.client.disconnect();
            } catch (e) {
                console.error('Error disconnecting SMB:', e);
            }
            this.client = null;
        }
    }

    async testConnection(config?: { host: string, user: string, pass: string, share: string }) {
        const host = config?.host || this.host;
        const username = config?.user || this.username;
        const password = config?.pass || this.password;
        const share = config?.share || this.share;

        if (!host || !share) {
            throw new Error('Paramètres SMB manquants');
        }

        const testClient = new SMB2({
            share: `\\\\${host}\\${share}`,
            domain: '',
            username: username || '',
            password: password || '',
            autoCloseTimeout: 0
        });

        try {
            await new Promise<void>((resolve, reject) => {
                testClient.readdir('', (err: any) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            testClient.disconnect();
            return true;
        } catch (err) {
            console.error('SMB Test Connection Error:', err);
            try { testClient.disconnect(); } catch (e) {}
            throw err;
        }
    }

    async listFiles(remotePath: string = ''): Promise<FileInfo[]> {
        console.log(`[SMB] Listing files for path: "${remotePath}"`);
        return this.withRetry(async (client) => {
            let targetPath = path.join(this.rootSubPath, remotePath).replace(/\//g, '\\');
            if (targetPath === '.' || targetPath === '/' || targetPath === '\\') {
                targetPath = '';
            }

            console.log(`[SMB] Target share path: "${targetPath}"`);

            const files = await new Promise<any[]>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('readdir timeout'));
                }, 25000);

                client.readdir(targetPath, { stats: true }, (err: any, data: any) => {
                    clearTimeout(timeout);
                    if (err) {
                        console.error(`[SMB] readdir error for "${targetPath}":`, err);
                        reject(err);
                    }
                    else resolve(data || []);
                });
            });

            if (!files || files.length === 0) {
                return [];
            }

            const result: FileInfo[] = files
                .filter((file: any) => {
                    const name = file.name.toLowerCase();
                    return !name.startsWith('.trash-') && 
                           name !== 'system volume information' && 
                           name !== '$recycle.bin';
                })
                .map((file: any) => ({
                    name: file.name,
                    size: file.size || 0,
                    mtime: new Date(file.mtime || Date.now()),
                    type: file.isDirectory && file.isDirectory() ? 'd' : 'f',
                    fullPath: remotePath ? `${remotePath}/${file.name}` : file.name
                }));

            result.sort((a, b) => {
                if (a.type === 'd' && b.type !== 'd') return -1;
                if (a.type !== 'd' && b.type === 'd') return 1;
                return a.name.localeCompare(b.name);
            });

            return result;
        });
    }

    async getStat(remotePath: string) {
        return this.withRetry(async (client) => {
            const targetPath = path.join(this.rootSubPath, remotePath).replace(/\//g, '\\');

            const stats = await new Promise<any>((resolve, reject) => {
                client.stat(targetPath, (err: any, data: any) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            return {
                isDirectory: stats.isDirectory(),
                size: stats.size || 0
            };
        });
    }

    async getFileStream(remotePath: string) {
        return this.withRetry(async (client) => {
            const targetPath = path.join(this.rootSubPath, remotePath).replace(/\//g, '\\');

            // @marsaud/smb2 createReadStream returns a Promise of a Readable stream
            const stream = await new Promise<any>((resolve, reject) => {
                client.createReadStream(targetPath, (err: any, stream: any) => {
                    if (err) reject(err);
                    else resolve(stream);
                });
            });
            return stream;
        });
    }

    async getFolderZipStream(remotePath: string) {
        const targetPath = path.join(this.rootSubPath, remotePath).replace(/\//g, '\\');
        
        const archive = archiver('zip', { zlib: { level: 9 } });

        const addFileWithRetry = async (itemRemotePath: string, itemArchivePath: string, size: number) => {
            await this.withRetry(async (client) => {
                return new Promise<void>(async (resolve, reject) => {
                    let isResolved = false;

                    const cleanup = () => {
                        archive.removeListener('entry', onEntry);
                        archive.removeListener('error', onError);
                    };

                    const onEntry = (entry: any) => {
                        if (entry.name === itemArchivePath) {
                            if (!isResolved) {
                                isResolved = true;
                                cleanup();
                                resolve();
                            }
                        }
                    };

                    const onError = (err: any) => {
                        if (!isResolved) {
                            isResolved = true;
                            cleanup();
                            reject(err);
                        }
                    };

                    archive.on('entry', onEntry);
                    archive.on('error', onError);

                    try {
                        // Use readFile for files smaller than 20MB - much more stable than streams
                        if (size < 20 * 1024 * 1024) {
                            const data = await new Promise<Buffer>((resolve, reject) => {
                                client.readFile(itemRemotePath, (err: any, data: any) => {
                                    if (err) reject(err);
                                    else resolve(data);
                                });
                            });
                            archive.append(data, { name: itemArchivePath });
                        } else {
                            // For larger files, use stream
                            const fileStream = await new Promise<any>((resolve, reject) => {
                                client.createReadStream(itemRemotePath, (err: any, stream: any) => {
                                    if (err) reject(err);
                                    else resolve(stream);
                                });
                            });
                            
                            fileStream.on('error', (err: any) => {
                                console.error(`[SMB] Stream error for ${itemRemotePath}:`, err);
                                if (!isResolved) {
                                    isResolved = true;
                                    cleanup();
                                    reject(err);
                                }
                            });

                            archive.append(fileStream, { name: itemArchivePath });
                        }
                    } catch (err) {
                        if (!isResolved) {
                            isResolved = true;
                            cleanup();
                            reject(err);
                        }
                    }
                });
            }, 3); // 3 retries per file
        };

        const addFolderToArchive = async (currentRemotePath: string, archivePath: string) => {
            const list = await this.withRetry(client => new Promise<any[]>((resolve, reject) => {
                client.readdir(currentRemotePath, { stats: true }, (err: any, data: any) => {
                    if (err) reject(err);
                    else resolve(data || []);
                });
            })) as any[];
            
            for (const item of list) {
                const itemRemotePath = path.join(currentRemotePath, item.name).replace(/\//g, '\\');
                const itemArchivePath = path.join(archivePath, item.name);
                
                if (item.isDirectory()) {
                    await addFolderToArchive(itemRemotePath, itemArchivePath);
                } else {
                    await addFileWithRetry(itemRemotePath, itemArchivePath, item.size || 0);
                }
            }
        };

        (async () => {
            try {
                await addFolderToArchive(targetPath, '');
                await archive.finalize();
            } catch (err) {
                console.error('[SMB] ZIP Generation Error:', err);
                if (archive.writable) {
                    archive.emit('error', err);
                }
            }
        })();

        return archive;
    }

    async delete(remotePath: string) {
        return this.withRetry(async (client) => {
            const targetPath = path.join(this.rootSubPath, remotePath).replace(/\//g, '\\');

            // 1. Get stats to check if it's a directory
            const stats = await new Promise<any>((resolve, reject) => {
                client.stat(targetPath, (err: any, data: any) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            
            const recursiveDelete = async (currentPath: string, isDirectory: boolean) => {
                if (isDirectory) {
                    let files = [];
                    try {
                        files = await new Promise<any[]>((resolve, reject) => {
                            client.readdir(currentPath, { stats: true }, (err: any, data: any) => {
                                if (err) {
                                    if (err.code === 'STATUS_ACCESS_DENIED') {
                                        const error = new Error(`Accès refusé au dossier "${path.basename(currentPath)}". Vérifiez les permissions SMB ou si le dossier est ouvert ailleurs.`);
                                        (error as any).code = err.code;
                                        reject(error);
                                    } else {
                                        reject(err);
                                    }
                                }
                                else resolve(data || []);
                            });
                        });
                    } catch (err: any) {
                        if (err.code === 'STATUS_ACCESS_DENIED') throw err;
                        console.error(`[SMB] Failed to readdir ${currentPath}:`, err.message);
                    }

                    for (const file of files) {
                        const filePath = path.join(currentPath, file.name).replace(/\//g, '\\');
                        await recursiveDelete(filePath, file.isDirectory());
                    }

                    return new Promise<void>((resolve, reject) => {
                        client.rmdir(currentPath, (err: any) => {
                            if (err) {
                                if (err.code === 'STATUS_OBJECT_NAME_NOT_FOUND') resolve();
                                else if (err.code === 'STATUS_ACCESS_DENIED') {
                                    const error = new Error(`Accès refusé : Le dossier "${path.basename(currentPath)}" est protégé ou utilisé par un autre processus système.`);
                                    (error as any).code = err.code;
                                    reject(error);
                                }
                                else reject(err);
                            }
                            else resolve();
                        });
                    });
                } else {
                    // Try to remove read-only attribute if possible (some SMB servers support this via setAttributes)
                    // But first, try a normal unlink
                    return new Promise<void>((resolve, reject) => {
                        client.unlink(currentPath, (err: any) => {
                            if (err) {
                                if (err.code === 'STATUS_OBJECT_NAME_NOT_FOUND') resolve();
                                else if (err.code === 'STATUS_ACCESS_DENIED' || err.code === 'STATUS_CANNOT_DELETE') {
                                    // Special case: try to check if it's a permission issue or a lock
                                    const error = new Error(`Accès refusé : Impossible de supprimer "${path.basename(currentPath)}". Le fichier est peut-être en "Lecture seule", utilisé par un autre utilisateur, ou vous n'avez pas les droits d'écriture sur ce partage.`);
                                    (error as any).code = err.code;
                                    reject(error);
                                }
                                else reject(err);
                            }
                            else resolve();
                        });
                    });
                }
            };

            await recursiveDelete(targetPath, stats.isDirectory());
            return true;
        });
    }
}
