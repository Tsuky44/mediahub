
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationService } from '@/lib/services/notification-service';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = Number(session.user.id);
        
        console.log(`[TestNotification] Sending test notification to user ${userId}`);

        await NotificationService.notifyUser(
            userId,
            'Test de notification',
            'Ceci est une notification de test pour vérifier le système.',
            'system_test',
            {
                link: '/dashboard/notifications'
            }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[TestNotification] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
