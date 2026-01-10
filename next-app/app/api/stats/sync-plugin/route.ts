import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EmbyService } from '@/lib/services/emby';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await (prisma as any).user.findUnique({
            where: { id: parseInt(session.user.id) },
            include: { instance: true }
        });

        if (!user || !user.instance) {
            return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
        }

        const emby = new EmbyService(user.instance.embyUrl, user.instance.embyApiKey);
        // Utilise getPlaybackReportingStats explicitement pour garantir qu'on prend les données de ce plugin
        const stats = await emby.getPlaybackReportingStats(30); 

        if (!stats || stats.length === 0) {
            return NextResponse.json({ message: 'No data found in plugin', syncedCount: 0 });
        }

        let syncedCount = 0;
        for (const s of stats) {
            const startTime = new Date(s.DateCreated || s.ActivityDateInserted);
            const playDuration = Math.round(s.PlayDuration || 0);
            
            if (playDuration < 10) continue;

            const embyUserId = s.UserId;
            const itemId = s.ItemId || s.NowPlayingItemId;

            const exists = await (prisma as any).embyActivityLog.findFirst({
                where: {
                    instanceId: user.instance.id,
                    embyUserId,
                    itemId,
                    startTime: {
                        gte: new Date(startTime.getTime() - 5000),
                        lte: new Date(startTime.getTime() + 5000)
                    }
                }
            });

            if (!exists) {
                await (prisma as any).embyActivityLog.create({
                    data: {
                        instanceId: user.instance.id,
                        embyUserId,
                        userName: s.UserName || s.User || 'Unknown',
                        itemId,
                        itemName: s.ItemName || s.Name || 'Unknown',
                        itemType: s.ItemType || s.Type || 'Unknown',
                        startTime,
                        endTime: new Date(startTime.getTime() + playDuration * 1000),
                        playDuration,
                        client: s.ClientName || s.Client || 'Unknown',
                        device: s.DeviceName || s.Device || 'Unknown',
                        mediaInfo: JSON.stringify({
                            playbackMethod: s.PlaybackMethod || s.PlayMethod,
                            pluginSynced: true
                        })
                    }
                });
                syncedCount++;
            }
        }

        return NextResponse.json({ 
            message: `Successfully synced ${syncedCount} new logs`, 
            syncedCount 
        });

    } catch (error: any) {
        console.error('Plugin sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
