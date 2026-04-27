import { getSetting } from '../settings';
import * as ftp from 'basic-ftp';
import path from 'path';
import archiver from 'archiver';
import { Readable, PassThrough } from 'stream';

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: unknown[]) => { if (isDev) console.log(...args); };
const error = (...args: unknown[]) => { if (isDev) console.error(...args); };
const warn = (...args: unknown[]) => { if (isDev) console.warn(...args); };

export interface FileInfo {
    name: string;
    size: number;
    mtime: Date;
    type: 'f' | 'd';
    fullPath: string;
}

export async function getFtpService() {
    const host = await getSetting('storage_host');
    const port = parseInt(await getSetting('storage_port') || '21');
    const user = await getSetting('storage_username');
    const pass = await getSetting('storage_password');
    const rootPath = await getSetting('storage_root_path') || '';
    const secure = (await getSetting('storage_secure')) === 'true';
    
    if (!host) return null;
    
    return new FtpService(host, port, user, pass, rootPath, secure);
}

export class FtpService {
    private client: ftp.Client | null = null;
    private host: string;
    private port: number;
    private username?: string;
    private password?: string;
    private rootPath: string;
    private secure: boolean;

    constructor(host: string, port: number = 21, username?: string, password?: string, rootPath: string = '', secure: boolean = false) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.rootPath = rootPath;
        this.secure = secure;
    }

    private async connect(): Promise<ftp.Client> {
        if (this.client && !this.client.closed) {
            try {
                // Test if connection is still alive
                await this.client.pwd();
                return this.client;
            } catch {
                // Connection dead, reconnect
                this.client.close();
            }
        }

        this.client = new ftp.Client(30000); // 30s timeout
        this.client.ftp.verbose = isDev;

        log(`[FTP] Connecting to ${this.host}:${this.port} (secure: ${this.secure}, root: "${this.rootPath}")`);

        try {
            await this.client.access({
                host: this.host,
                port: this.port,
                user: this.username || 'anonymous',
                password: this.password || '',
                secure: this.secure // Use FTPS if configured
            });

            log('[FTP] Connected, current dir:', await this.client.pwd());

            // Navigate to root path if specified
            if (this.rootPath) {
                log('[FTP] Navigating to root path:', this.rootPath);
                await this.client.cd(this.rootPath);
                log('[FTP] Now in dir:', await this.client.pwd());
            }

            log('[FTP] Connected successfully');
            return this.client;
        } catch (e) {
            this.client.close();
            throw e;
        }
    }

    private async disconnect() {
        if (this.client && !this.client.closed) {
            try {
                this.client.close();
            } catch (e) {
                error('[FTP] Error disconnecting:', e);
            }
            this.client = null;
        }
    }

    async testConnection(config?: { host: string, port?: number, user: string, pass: string, rootPath?: string, secure?: boolean }) {
        const host = config?.host || this.host;
        const port = config?.port || this.port;
        const username = config?.user || this.username;
        const password = config?.pass || this.password;
        const rootPath = config?.rootPath || this.rootPath;
        const secure = config?.secure !== undefined ? config.secure : this.secure;

        if (!host) {
            throw new Error('Paramètres FTP manquants (hôte requis)');
        }

        const testClient = new ftp.Client(10000);
        testClient.ftp.verbose = isDev;

        try {
            await testClient.access({
                host,
                port,
                user: username || 'anonymous',
                password: password || '',
                secure: secure || false
            });
            
            log('[FTP-Test] Connected successfully, current dir:', await testClient.pwd());
            
            // Try to navigate to root path if specified
            if (rootPath) {
                log('[FTP-Test] Navigating to:', rootPath);
                await testClient.cd(rootPath);
                log('[FTP-Test] Navigated to:', await testClient.pwd());
            }
            
            // Try to list to verify access
            const list = await testClient.list();
            log('[FTP-Test] Listed', list.length, 'items');
        } catch (e) {
            const err = e as Error
            let errorMessage = err?.message || 'Échec de la connexion FTP';
            if (errorMessage.includes('ENOTFOUND')) errorMessage = 'Hôte introuvable';
            if (errorMessage.includes('ETIMEDOUT')) errorMessage = 'Délai de connexion dépassé';
            if (errorMessage.includes('ECONNREFUSED')) errorMessage = 'Connexion refusée - vérifie l\'hôte et le port';
            if (errorMessage.includes('530')) errorMessage = 'Identifiants incorrects (login ou mot de passe)';
            if (errorMessage.includes('550')) errorMessage = 'Accès refusé ou dossier introuvable';
            
            throw new Error(errorMessage);
        } finally {
            testClient.close();
        }
    }

    async listFiles(remotePath: string = ''): Promise<FileInfo[]> {
        log(`[FTP] Listing files for path: "${remotePath}"`);
        
        const client = await this.connect();
        
        try {
            // Navigate to the requested path relative to root
            if (remotePath) {
                await client.cd(remotePath);
            }

            const list = await client.list();
            
            const result: FileInfo[] = list
                .filter((item: ftp.FileInfo) => {
                    const name = item.name.toLowerCase();
                    return !name.startsWith('.') && 
                           name !== 'system volume information';
                })
                .map((item: ftp.FileInfo) => ({
                    name: item.name,
                    size: item.size || 0,
                    mtime: item.modifiedAt || new Date(),
                    type: item.type === ftp.FileType.Directory ? 'd' : 'f',
                    fullPath: remotePath ? `${remotePath}/${item.name}` : item.name
                }));

            // Sort: directories first, then alphabetically
            result.sort((a, b) => {
                if (a.type === 'd' && b.type !== 'd') return -1;
                if (a.type !== 'd' && b.type === 'd') return 1;
                return a.name.localeCompare(b.name);
            });

            // Go back to root path for next operation
            if (remotePath) {
                if (this.rootPath) {
                    await client.cd(this.rootPath);
                } else {
                    await client.cd('/');
                }
            }

            return result;
        } catch (e) {
            error('[FTP] List files error:', e);
            throw e;
        }
    }

    async getStat(remotePath: string): Promise<{ isDirectory: boolean; size: number }> {
        const client = await this.connect();
        
        try {
            const dir = path.dirname(remotePath);
            const filename = path.basename(remotePath);
            
            if (dir !== '.' && dir !== '/') {
                await client.cd(dir);
            }
            
            const list = await client.list();
            const item = list.find((i: ftp.FileInfo) => i.name === filename);
            
            if (!item) {
                throw new Error('File not found');
            }
            
            return {
                isDirectory: item.type === ftp.FileType.Directory,
                size: item.size || 0
            };
        } catch (e) {
            error('[FTP] Stat error:', e);
            throw e;
        }
    }

    async getFileStream(remotePath: string): Promise<Readable> {
        const client = await this.connect();
        
        try {
            const passThrough = new PassThrough();
            
            // Download to the passthrough stream
            client.downloadTo(passThrough, remotePath).catch((err: Error) => {
                error('[FTP] Download error:', err);
                passThrough.destroy(err);
            });
            
            return passThrough;
        } catch (e) {
            error('[FTP] Get file stream error:', e);
            throw e;
        }
    }

    async getFolderZipStream(remotePath: string): Promise<Readable> {
        const archive = archiver('zip', { zlib: { level: 6 }});
        const passThrough = new PassThrough();
        
        archive.pipe(passThrough);
        
        const addFolderToArchive = async (folderPath: string, archivePath: string) => {
            const client = await this.connect();
            const items = await client.list(folderPath);
            
            for (const item of items) {
                const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
                const archiveItemPath = archivePath ? `${archivePath}/${item.name}` : item.name;
                
                if (item.type === ftp.FileType.Directory) {
                    await addFolderToArchive(itemPath, archiveItemPath);
                } else {
                    const fileStream = new PassThrough();
                    client.downloadTo(fileStream, itemPath).catch(() => {});
                    archive.append(fileStream, { name: archiveItemPath });
                }
            }
        };
        
        addFolderToArchive(remotePath, path.basename(remotePath))
            .then(() => archive.finalize())
            .catch(err => {
                error('[FTP] Zip creation error:', err);
                archive.destroy();
            });
        
        return passThrough;
    }

    async delete(remotePath: string): Promise<void> {
        const client = await this.connect();
        
        try {
            const stat = await this.getStat(remotePath);
            
            if (stat.isDirectory) {
                await client.removeDir(remotePath);
            } else {
                await client.remove(remotePath);
            }
        } catch (e) {
            error('[FTP] Delete error:', e);
            throw e;
        }
    }
}
