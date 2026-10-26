import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
        const session = await getSession();
        
        // Check admin permissions
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.email, session.user.email)
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
    console.log('[UpdateAPI] POST request received');
    try {
        const session = await getSession();
        console.log('[UpdateAPI] Session:', session?.user?.email ? 'authenticated' : 'none');
        
        if (!session?.user?.email) {
            console.log('[UpdateAPI] Unauthorized - no email in session');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.email, session.user.email)
        });
        console.log('[UpdateAPI] User role:', user?.role);

        if (user?.role !== 'admin') {
            console.log('[UpdateAPI] Forbidden - user is not admin');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse target tag from request body if available
        let tag: string | undefined;
        try {
            const body = await req.json();
            console.log('[UpdateAPI] Request body:', body);
            if (body && typeof body.tag === 'string') {
                tag = body.tag;
            }
        } catch (e) {
            console.log('[UpdateAPI] No body or invalid JSON, using default');
            // No body or invalid JSON, ignore and use default
        }

        // Trigger update in the background and respond immediately.
        // We MUST NOT await performUpdate because the companion container will
        // eventually stop this very container, which would interrupt the HTTP
        // response and cause the client to see a false "error".
        console.log(`[UpdateAPI] Triggering update to tag: ${tag || 'latest'}`);
        SystemUpdateService.performUpdate(tag).catch((err: any) => {
            console.error('[UpdateAPI] Background update failed:', err);
        });

        console.log('[UpdateAPI] Update triggered successfully (background)');
        return NextResponse.json({
            success: true,
            message: `Mise à jour vers ${tag || 'la dernière version'} lancée. Suivez la progression dans le terminal.`,
        });
    } catch (error: any) {
        console.error('[UpdateAPI] Update trigger failed:', error);
        console.error('[UpdateAPI] Error stack:', error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
