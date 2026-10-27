/**
 * Centralized constants to eliminate magic numbers across the codebase.
 */

// --- Timing (ms) ---
export const MS = {
  SECOND: 1_000,
  MINUTE: 60_000,
  FIVE_MINUTES: 5 * 60_000,
  THIRTY_MINUTES: 30 * 60_000,
  HOUR: 60 * 60_000,
  TWO_HOURS: 2 * 60 * 60_000,
  DAY: 24 * 60 * 60_000,
} as const;

// --- Retry / Circuit Breaker ---
export const RETRY = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 100,
  SETTINGS_MAX_ATTEMPTS: 5,
  SETTINGS_BASE_DELAY_MS: 200,
} as const;

// --- Cache TTL (ms) ---
export const CACHE_TTL = {
  SETTINGS: MS.THIRTY_MINUTES,        // 30 min for DB settings reads
  API_STATIC: MS.THIRTY_MINUTES,       // 30 min for profiles/root folders
  API_DYNAMIC: MS.FIVE_MINUTES,        // 5 min for trending/discover
  HEALTH_CHECK: MS.FIVE_MINUTES,      // 5 min for service health pings
} as const;

// --- Database ---
export const DB = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// --- API Timeouts (ms) ---
export const TIMEOUT = {
  TMDB: 8_000,
  SONARR: 30_000,
  RADARR: 30_000,
  EMBY: 10_000,
  QBITTORRENT: 10_000,
  WEBHOOK: 10_000,
} as const;

// --- Request Throttle ---
export const THROTTLE = {
  DEBOUNCE_MS: 300,
  MIN_SEARCH_LENGTH: 2,
  POLL_SERVICES_MS: 30_000,
  POLL_STATS_MS: 60_000,
} as const;

// --- Paging ---
export const PAGING = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// --- Environment ---
export const IS_DEV = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
