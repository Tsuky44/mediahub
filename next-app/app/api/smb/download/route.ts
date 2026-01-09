import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, getSmbServiceForUser } from '@/lib/auth';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || 'user';
    if (!session || !session.user || (userRole !== 'admin' && userRole !== 'user_plus')) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
        return new NextResponse('Missing path', { status: 400 });
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
                    archive.abort();
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
