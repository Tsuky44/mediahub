// Barrel export for auth module
// All auth logic has been moved to the auth/ directory for better maintainability
export {
  authOptions,
  getCurrentUser,
  getRealUser,
} from './auth/index'

export {
  getEmbyServiceForUser,
  getPlexServiceForUser,
  getJellyfinServiceForUser,
  getTmdbServiceForUser,
  getRadarrServiceForUser,
  getSonarrServiceForUser,
  getStorageServiceForUser,
  getSmbServiceForUser,
  getProwlarrServiceForUser,
} from './auth/service-factories'

// Re-export providers for direct access if needed
export { localProvider } from './auth/providers/local'
export { embyProvider } from './auth/providers/emby'
export { plexProvider } from './auth/providers/plex'
export { jellyfinProvider } from './auth/providers/jellyfin'
