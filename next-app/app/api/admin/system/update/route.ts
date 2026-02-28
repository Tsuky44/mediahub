import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Docker from 'dockerode';
import os from 'os';

// We can't easily import the class if it's not exported default, 
// let's just inline the logic or fix the export.
// Actually, I can just import it if I fix the previous file to be a module.
// But wait, the previous file system-update.ts was created successfully.
// Let's reuse it.

import { SystemUpdateService } from '@/lib/services/system-update';

export const dynamic = 'force-dynamic';

// GET: Check for updates
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // Check admin permissions
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const force = searchParams.get('force') === 'true';

        const status = await SystemUpdateService.checkUpdate(force);
        return NextResponse.json(status);

    } catch (error: any) {
        console.error('[UpdateAPI] Check failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Perform update
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (user?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Trigger update
        // Note: This might kill the server process if it restarts immediately.
        // The client should handle the disconnection gracefully.
        await SystemUpdateService.performUpdate();

        return NextResponse.json({ success: true, message: 'Update started. The container will restart shortly.' });

    } catch (error: any) {
        console.error('[UpdateAPI] Update trigger failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
