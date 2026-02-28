import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { tmdbId, mediaType, action } = body;

        if (!tmdbId || !mediaType) {
            return NextResponse.json({ error: 'Missing tmdbId or mediaType' }, { status: 400 });
        }

        const subscriptions = await prisma.mediaSubscription.findMany({
            where: { tmdbId: String(tmdbId), mediaType },
            include: { user: true }
        });

        const requests = await prisma.mediaRequest.findMany({
            where: { tmdbId: String(tmdbId), mediaType },
            include: { user: true }
        });

        const debugInfo = {
            subscriptions: subscriptions.map(s => ({ userId: s.userId, user: s.user.name, email: s.user.email })),
            requests: requests.map(r => ({ userId: r.userId, user: r.user?.name, email: r.user?.email })),
        };

        if (action === 'test_notify') {
            const usersToNotify = new Map<number, any>();
            subscriptions.forEach(s => usersToNotify.set(s.userId, s.user));
            requests.forEach(r => { if (r.user) usersToNotify.set(r.user.id, r.user) });

            const results = [];
            for (const user of Array.from(usersToNotify.values())) {
                try {
                    await NotificationService.notifyUser(
                        user.id,
                        'Test Debug Notification',
                        `Test pour média ${tmdbId}`,
                        'system_test',
                        { mediaId: String(tmdbId), mediaType }
                    );
                    results.push({ userId: user.id, status: 'sent' });
                } catch (e: any) {
                    results.push({ userId: user.id, status: 'failed', error: e.message });
                }
            }
            return NextResponse.json({ debugInfo, results });
        }

        return NextResponse.json({ debugInfo });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
