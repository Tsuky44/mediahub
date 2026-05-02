export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { SystemUpdateService } = await import('@/lib/services/system-update');
    SystemUpdateService.initBackgroundCheck();
    
    const { MediaSyncService } = await import('@/lib/services/media-sync');
    MediaSyncService.initBackgroundSync();

    const { startStatsScheduler } = await import('@/lib/services/stats-scheduler');
    startStatsScheduler();

    const { startTrackerRefreshScheduler } = await import('@/lib/services/tracker-refresh-scheduler');
    startTrackerRefreshScheduler();

    const { startNotificationsV2 } = await import('@/lib/notifications-v2');
    startNotificationsV2();

    const { QBittorrentCache } = await import('@/lib/services/qbittorrent-cache');
    QBittorrentCache.getInstance().start();
  }
}
