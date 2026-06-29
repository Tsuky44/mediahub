import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { mediaSubscriptions, mediaRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
// V1 notifications supprimées
// import { NotificationService } from '@/lib/services/notification-service';

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tmdbId, mediaType, action } = body;

        if (!tmdbId || !mediaType) {
            return NextResponse.json({ error: 'Missing tmdbId or mediaType' }, { status: 400 });
        }

        const subscriptions = await db.query.mediaSubscriptions.findMany({
            where: and(eq(mediaSubscriptions.tmdbId, String(tmdbId)), eq(mediaSubscriptions.mediaType, mediaType)),
            with: { user: true }
        });

        const requests = await db.query.mediaRequests.findMany({
            where: and(eq(mediaRequests.tmdbId, String(tmdbId)), eq(mediaRequests.mediaType, mediaType)),
            with: { user: true }
        });

        const debugInfo = {
            subscriptions: subscriptions.map(s => ({ userId: s.userId, user: s.user.name, email: s.user.email })),
            requests: requests.map(r => ({ userId: r.userId, user: r.user?.name, email: r.user?.email })),
        };

        if (action === 'test_notify') {
            const usersToNotify = new Map<number, any>();
            subscriptions.forEach(s => usersToNotify.set(s.userId, s.user));
            requests.forEach(r => { if (r.user) usersToNotify.set(r.user.id, r.user) });

            // V1 notifications supprimées - plus d'envoi de notifications
            const results = [];
            for (const user of Array.from(usersToNotify.values())) {
                results.push({ 
                    userId: user.id, 
                    status: 'failed', 
                    error: 'V1 notifications removed - cannot send test notification' 
                });
            }
            return NextResponse.json({ 
                debugInfo, 
                results,
                message: 'V1 notifications have been removed. Test notifications cannot be sent.' 
            });
        }

        return NextResponse.json({ debugInfo });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
