export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { SystemUpdateService } = await import('./lib/services/system-update');
    SystemUpdateService.initBackgroundCheck();
    
    const { MediaSyncService } = await import('./lib/services/media-sync');
    MediaSyncService.initBackgroundSync();
  }
}
