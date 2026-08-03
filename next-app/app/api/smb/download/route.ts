import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, getSmbServiceForUser } from '@/lib/auth';
import { defineAbilityFor } from '@/lib/ability';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any
    
    if (!session || !user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const ability = defineAbilityFor(user);
    const canReadExplorer = ability.can('read_explorer', 'Downloads');
    const canManage = ability.can('manage', 'Downloads');
    const isAdmin = user.role === 'admin';

    if (!isAdmin && !canReadExplorer && !canManage) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
        return new NextResponse('Missing path', { status: 400 });
    }

    // Protection contre le Path Traversal
    const normalizedPath = path.replace(/\\/g, '/');
    const isTraversal = 
        normalizedPath.split('/').some(segment => segment === '..') || 
        normalizedPath.startsWith('/') || 
        normalizedPath.includes('//');

    if (isTraversal) {
        console.warn(`[SMB Download] Tentative de Path Traversal bloquée pour le chemin: "${path}"`);
        return new NextResponse('Forbidden: Path traversal attempt detected', { status: 403 });
    }

    try {
        const smbService = await getSmbServiceForUser();
        if (!smbService) {
            return new NextResponse('SMB service not configured', { status: 500 });
        }
        
        const stats = await smbService.getStat(path);
        const fileName = path.split('/').pop() || 'download';
        
        if (stats.isDirectory) {
            const archive = await smbService.getFolderZipStream(path);
            
            const webStream = new ReadableStream({
                start(controller) {
                    archive.on('data', (chunk: Buffer) => {
                        controller.enqueue(chunk);
                        if (controller.desiredSize !== null && controller.desiredSize <= 0) {
                            archive.pause();
                        }
                    });
                    archive.on('end', () => controller.close());
                    archive.on('error', (err: Error) => controller.error(err));
                },
                pull() {
                    archive.resume();
                },
                cancel() {
                    archive.destroy();
                }
            });

            return new Response(webStream, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${fileName}.zip"`,
                },
            });
        } else {
            const stream = await smbService.getFileStream(path);
            
            const webStream = new ReadableStream({
                start(controller) {
                    stream.on('data', (chunk: Buffer) => {
                        controller.enqueue(chunk);
                        if (controller.desiredSize !== null && controller.desiredSize <= 0) {
                            stream.pause();
                        }
                    });
                    stream.on('end', () => controller.close());
                    stream.on('error', (err: Error) => {
                        console.error('[SMB Download] Stream error:', err);
                        controller.error(err);
                    });
                },
                pull() {
                    stream.resume();
                },
                cancel() {
                    stream.destroy();
                }
            });

            return new Response(webStream, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Content-Length': stats.size.toString(),
                },
            });
        }
    } catch (e) {
        console.error('SMB Download error:', e);
        return new NextResponse('File not found or SMB error', { status: 404 });
    }
}
