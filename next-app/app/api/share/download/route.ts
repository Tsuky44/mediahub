import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { fileShares } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStorageServiceForUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
        return new NextResponse('Missing token', { status: 400 });
    }

    try {
        const [share] = await db.select().from(fileShares).where(eq(fileShares.token, token));

        if (!share) {
            return new NextResponse('Invalid token', { status: 404 });
        }

        if (share.expiresAt && share.expiresAt < new Date()) {
            return new NextResponse('Link expired', { status: 410 });
        }

        if (share.password) {
            const providedPassword = searchParams.get('password');
            if (!providedPassword || providedPassword !== share.password) {
                return new NextResponse('Password required or incorrect', { status: 403 });
            }
        }

        const storageService = await getStorageServiceForUser();
        if (!storageService) {
            return new NextResponse('Storage service not configured', { status: 500 });
        }

        const stats = await storageService.getStat(share.filePath);
        const fileName = share.filePath.split('/').pop() || 'download';

        if (stats.isDirectory) {
            const archive = await storageService.getFolderZipStream(share.filePath);

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
            const stream = await storageService.getFileStream(share.filePath);

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
                        console.error('[Public Share Download] Stream error:', err);
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
        console.error('Public Share Download error:', e);
        return new NextResponse('File not found or storage error', { status: 404 });
    }
}
