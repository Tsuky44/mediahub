# Graph Report - next-app  (2026-10-05)

## Corpus Check
- Large corpus: 894 files · ~3,009,792 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 4278 nodes · 10250 edges · 261 communities (156 shown, 105 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.74)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Schéma DB Drizzle
- Service Prowlarr
- Notifs — dispatcher
- dashboard / stats
- Session & utilisateur courant
- dashboard / downloads
- Recherche Prowlarr (UI)
- Service Plex
- global / media-filters
- db
- requests / list
- Réglages — rôles
- auth / providers
- Dashboard — accueil
- Réglages — notifications
- Push — souscriptions & envoi
- Demandes — liste
- Logger & services partagés
- settings / media
- Notifs — provider Web Push
- push
- Téléchargements — torrents
- Service Emby
- Cache liste de stockage
- docker / container
- dashboard / docker
- dashboard / settings
- Notifs — outbox worker
- roles / [id]
- Connexion
- dashboard / settings
- docker / stats
- dashboard
- Réglages — utilisateurs
- dashboard / settings
- Docker — page
- Docker — détail conteneur
- user-groups / details
- Notifs — moteur de templates
- services
- services
- Téléchargements — fichiers
- downloads / [hash]
- Média — saisons & épisodes
- dom
- [id] / page
- Réglages — onglets
- Notifs — event store & dédup
- Service Sonarr
- dashboard / downloads
- torrent / filter-modal
- media / [id]
- Notifs — config & destinataires
- Service qBittorrent
- services
- dashboard / stats
- Documentation & concepts du projet
- Scraping trackers (Playwright)
- Mise à jour système
- dashboard / docker
- downloads / torrent
- Média — gestion
- settings / support
- services
- dashboard / settings
- dashboard / recent-requests
- dashboard / docker
- settings / account-requests
- Réglages — sauvegardes
- Cache applicatif
- Service Unraid
- media / [id]
- notifications-v2 / realtime
- Service Docker
- dashboard / downloads
- ui
- dashboard / stats
- services
- types
- docker / logs
- downloads / torrent
- dashboard / settings
- lib
- Notifs — poller de queue
- Parseur de noms de torrents
- dashboard / docker
- dashboard / settings
- settings / system-messages
- stats / me
- Configuration initiale
- Navbar
- notifications-v2 / utils
- Calendrier des sorties
- downloads / [hash]
- Sessions de lecture en direct
- settings / linked-accounts
- Statistiques
- app
- lib
- Service TMDB
- Service SMB
- dashboard / stats
- Demande d'accès
- lib
- Service Radarr
- Média — page de détail
- global / navbar
- media / [id]
- dashboard
- docker / terminal
- [id] / interactive-search
- Service FTP
- dashboard / downloads
- media / [id]
- scripts
- ansi-to-html
- settings / storage
- [id] / page
- stats / me
- [id] / page
- notifications-v2 / pollers
- services
- users / sync
- dashboard / docker
- media / [id]
- cross-env
- Service Jellyfin
- global / navbar
- [id] / page
- notifications-v2 / pollers
- notifications-v2 / realtime
- scripts
- media / [id]
- dashboard / stats
- global / navbar
- scripts
- Service fichiers locaux
- scripts
- global
- Client API centralisé
- services
- test-ability.ts
- dashboard
- notifications-v2 / realtime
- services
- package.json
- stats / top-items-tabs
- lib
- services
- types
- stats / sync-plugin
- support / upload
- scripts
- next.config.ts
- scripts
- scripts
- scripts
- downloads / torrent
- [id] / page
- stats / me
- entrypoint.sh
- middleware.ts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- archiver
- @auth/drizzle-adapter
- axios
- axios-cookiejar-support
- babel-plugin-react-compiler
- basic-ftp
- bcryptjs
- better-sqlite3
- @casl/react
- cheerio
- clsx
- date-fns
- dockerode
- dotenv
- drizzle-kit
- eslint
- eslint.config.mjs
- eslint-config-next
- framer-motion
- @heroicons/react
- http-proxy
- lru-cache
- lucide-react
- @microsoft/signalr
- moment
- next
- next-auth
- drizzle-orm
- @paralleldrive/cuid2
- pg
- playwright
- react
- react-big-calendar
- react-dom
- react-hot-toast
- react-intersection-observer
- recharts
- socket.io
- tailwind-merge
- @tanstack/react-query
- @tanstack/react-query-devtools
- @types/bcryptjs
- @types/react-big-calendar
- use-debounce
- uuid
- web-push
- ws
- @xterm/addon-fit
- @xterm/xterm
- zod
- tsx
- @types/archiver
- @types/better-sqlite3
- @types/node
- @types/pg
- @types/react
- @types/react-dom
- @types/ssh2
- @types/tough-cookie
- @types/uuid
- @types/web-push
- typescript
- postcss.config.mjs
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- scripts
- types

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 108 edges
2. `db` - 106 edges
3. `defineAbilityFor()` - 104 edges
4. `logger` - 63 edges
5. `getTmdbServiceForUser()` - 57 edges
6. `EmbyService` - 57 edges
7. `getSetting()` - 51 edges
8. `users` - 50 edges
9. `authOptions` - 49 edges
10. `Torrent` - 41 edges

## Surprising Connections (you probably didn't know these)
- `Table notification_deliveries` --defined_in--> `notificationDeliveries`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/db/schema.ts
- `Table notification_events` --defined_in--> `notificationEvents`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/db/schema.ts
- `Derive de schema DB en production` --missing_columns--> `users`  [EXTRACTED]
  scripts/README-PRODUCTION-FIX.md → lib/db/schema.ts
- `GET()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/api/admin/notifications/route.ts → lib/auth/index.ts
- `GET()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/api/admin/purge-notif-dedup/route.ts → lib/auth/index.ts

## Import Cycles
- None detected.

## Communities (261 total, 105 thin omitted)

### Community 0 - "Schéma DB Drizzle"
Cohesion: 0.04
Nodes (62): dynamic, dynamic, GET(), POST(), dynamic, GET(), POST(), dynamic (+54 more)

### Community 1 - "Service Prowlarr"
Cohesion: 0.06
Nodes (69): TrackerActionsBar(), TrackerActionsBarProps, TrackerForm(), TrackerFormProps, TrackerList(), TrackerListProps, TrackerStatCard(), TrackerStatCardProps (+61 more)

### Community 2 - "Notifs — dispatcher"
Cohesion: 0.05
Nodes (62): error(), log(), POST(), warn(), dynamic, EVENT_MAP, POST(), captureDownloadIntent() (+54 more)

### Community 3 - "dashboard / stats"
Cohesion: 0.06
Nodes (61): UserActivityButton(), UserActivityButtonProps, ItemDetails, QUERY_KEY(), SeasonDetail, SeasonStat, useUserActivity(), UseUserActivityResult (+53 more)

### Community 4 - "Session & utilisateur courant"
Cohesion: 0.07
Nodes (63): GET(), dynamic, POST(), DELETE(), checkServicesHealth(), execPromise, getDashboardStats(), getRecentRequests() (+55 more)

### Community 5 - "dashboard / downloads"
Cohesion: 0.06
Nodes (50): getTrackerHistory(), QbitPanel(), QbitPanelProps, TorrentStatsBar(), TorrentStatsBarProps, TrackerModalLoadingView(), TrackerModalLoadingViewProps, TrackerModalTabButton() (+42 more)

### Community 6 - "Recherche Prowlarr (UI)"
Cohesion: 0.07
Nodes (56): checkPermission(), downloadMediaRelease(), downloadTorrent(), error(), finalizePush(), getProwlarrIndexers(), getSonarrEpisodes(), log() (+48 more)

### Community 7 - "Service Plex"
Cohesion: 0.06
Nodes (52): Actions, Subjects, getPrisma(), prisma, TODO: Migrer tous les fichiers qui importent '@/lib/prisma' vers…, error(), log(), PlexAccount (+44 more)

### Community 8 - "global / media-filters"
Cohesion: 0.06
Nodes (52): getFilterOptions(), getWatchProviders(), FilterModal(), FilterModalProps, InfiniteScrollTrigger(), MediaGrid(), MediaGridEmpty(), MediaGridLoading() (+44 more)

### Community 9 - "db"
Cohesion: 0.05
Nodes (42): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+34 more)

### Community 10 - "requests / list"
Cohesion: 0.06
Nodes (43): GET(), MediaType, TmdbCatalogItem, GET(), TmdbGenre, TmdbSeason, dynamic, GET() (+35 more)

### Community 11 - "Réglages — rôles"
Cohesion: 0.08
Nodes (38): startImpersonation(), stopImpersonation(), RoleEditor(), RoleEditorProps, RoleManagement(), DefaultRoleSelector(), DefaultRoleSelectorProps, PermissionCheckbox() (+30 more)

### Community 12 - "auth / providers"
Cohesion: 0.08
Nodes (26): dynamic, dynamic, EmbyHistoryItem, error(), JellyfinPlayedItem, PlexHistoryItem, POST(), dynamic (+18 more)

### Community 13 - "Dashboard — accueil"
Cohesion: 0.06
Nodes (32): DashboardLayout(), MediaFilterPills(), MediaFilterPillsProps, MediaTypeTabs(), MediaTypeTabsProps, InfiniteDiscoverList(), InfiniteDiscoverListProps, dynamic (+24 more)

### Community 14 - "Réglages — notifications"
Cohesion: 0.07
Nodes (37): EventAccordionItem(), EventAccordionItemProps, EventRouteCard(), EventRouteCardProps, EventRouteConfig, EventRouteConfig, EventsSection(), EventsSectionProps (+29 more)

### Community 15 - "Push — souscriptions & envoi"
Cohesion: 0.08
Nodes (40): dynamic, POST(), SubscriptionJson, dynamic, POST(), dynamic, POST(), dynamic (+32 more)

### Community 16 - "Demandes — liste"
Cohesion: 0.06
Nodes (33): MediaPoster(), MediaPosterProps, RequestCard(), RequestCardProps, RequestCardMeta(), RequestCardMetaProps, RequestCardPoster(), RequestCardPosterProps (+25 more)

### Community 17 - "Logger & services partagés"
Cohesion: 0.08
Nodes (33): dynamic, error(), log(), POST(), embyToTmdbCache, error(), GET(), log() (+25 more)

### Community 18 - "settings / media"
Cohesion: 0.13
Nodes (30): ArrSection(), ArrSectionProps, JellyseerrSectionProps, AutomationSettings(), Props, EmbySettings(), EmbySettingsProps, JellyfinSettings() (+22 more)

### Community 19 - "Notifs — provider Web Push"
Cohesion: 0.11
Nodes (39): pushLiveCards, buildDiscreteTag(), buildMediaUrl(), snapshotFromPayload(), splitTemplate(), stripMarkup(), WebPushProvider, WebPushSendResult (+31 more)

### Community 20 - "push"
Cohesion: 0.07
Nodes (31): DockerPageHeader(), DockerPageHeaderProps, DownloadsHeader(), DownloadsHeaderProps, ProwlarrPanel(), ProwlarrPanelProps, SmbPanel(), SmbPanelProps (+23 more)

### Community 21 - "Téléchargements — torrents"
Cohesion: 0.07
Nodes (31): AddTorrentModal(), AddTorrentModalProps, BatchAction, BatchActionsBar(), BatchActionsBarProps, DeleteTorrentModal(), DeleteTorrentModalProps, SearchModalProps (+23 more)

### Community 22 - "Service Emby"
Cohesion: 0.12
Nodes (4): EmbyService, error(), log(), warn()

### Community 23 - "Cache liste de stockage"
Cohesion: 0.11
Nodes (41): dynamic, error(), GET(), log(), maxDuration, parseSort(), VALID_SORT_DIRS, VALID_SORT_KEYS (+33 more)

### Community 24 - "docker / container"
Cohesion: 0.12
Nodes (28): ConsoleRow(), DockerConsoleListProps, ContainerCardProps, ContainerPermissions, ContainerCard(), ContainerGridDropdownMenu(), ContainerGridDropdownMenuProps, ContainerGridView() (+20 more)

### Community 25 - "dashboard / docker"
Cohesion: 0.08
Nodes (33): DockerModals(), DockerModalsProps, GroupCreateForm(), GroupCreateFormProps, GroupEditForm(), GroupEditFormProps, GroupListEmpty(), GroupManagerHeader() (+25 more)

### Community 26 - "dashboard / settings"
Cohesion: 0.11
Nodes (34): ActivityLogRow(), ActivityLogRowProps, ActivityLogsPagination(), ActivityLogsPaginationProps, ActivityLogsTable(), ActivityLogsTableProps, ActivityLogsToolbar(), ActivityLogsToolbarProps (+26 more)

### Community 27 - "Notifs — outbox worker"
Cohesion: 0.10
Nodes (22): globalForWorker, OutboxWorker, EvolutionProvider, isRetryable(), normalizeNumber(), summarizeError(), RetryOptions, sleep() (+14 more)

### Community 28 - "roles / [id]"
Cohesion: 0.08
Nodes (32): DELETE(), dynamic, GET(), PUT(), TODO: Check user count separately, TODO: Check if role has assigned users, revalidate, dynamic (+24 more)

### Community 29 - "Connexion"
Cohesion: 0.10
Nodes (31): checkPlexAuthPin(), getPlexAuthPin(), CredentialsForm(), CredentialsFormProps, PlexOAuthButton(), PlexOAuthButtonProps, PROVIDER_OPTIONS, ProviderSelector() (+23 more)

### Community 30 - "dashboard / settings"
Cohesion: 0.11
Nodes (28): dynamic, POST(), dynamic, PATCH(), POST(), TODO: Fetch roles separately if needed, DELETE(), dynamic (+20 more)

### Community 31 - "docker / stats"
Cohesion: 0.08
Nodes (27): ContainerStats(), ContainerStatsProps, DockerContainer, CpuStatCard(), CpuStatCardProps, MemoryStatCard(), MemoryStatCardProps, NetworkStatCard() (+19 more)

### Community 32 - "dashboard"
Cohesion: 0.11
Nodes (28): DashboardSearchBar(), DashboardSearchBarProps, LibraryStatsCard(), LibraryStatsCardProps, QuickNavCards(), ServerStatusCard(), ServerStatusCardProps, TransfersCard() (+20 more)

### Community 33 - "Réglages — utilisateurs"
Cohesion: 0.12
Nodes (26): UserManagement(), UserManagementProps, CreateUserModal(), CreateUserModalProps, EMPTY_FORM, NotificationsEditor(), NotificationsEditorProps, ProviderFilterTabs() (+18 more)

### Community 34 - "dashboard / settings"
Cohesion: 0.12
Nodes (29): EvolutionApiSection(), EvolutionApiSectionProps, EvolutionConfig, NOTIFICATION_TYPES, WebhookSection(), WebhookSectionProps, useNotificationsV2(), assertAdmin() (+21 more)

### Community 35 - "Docker — page"
Cohesion: 0.08
Nodes (24): ConsoleHeader(), DockerConsoleList(), DockerAccessDeniedView(), DockerErrorBanner(), DockerErrorBannerProps, DockerLoadingState(), DockerSearchBar(), DockerStatsGrid() (+16 more)

### Community 36 - "Docker — détail conteneur"
Cohesion: 0.10
Nodes (25): AccessDeniedModal(), AccessDeniedModalProps, DetailsSidebarTabs(), DetailsSidebarTabsProps, SidebarTabConfig, TABS, EnvTab(), EnvTabProps (+17 more)

### Community 37 - "user-groups / details"
Cohesion: 0.15
Nodes (21): AddMemberForm(), AddMemberFormProps, GroupEditForm(), GroupEditFormProps, GroupHeader(), GroupHeaderProps, MembersEmpty(), MembersList() (+13 more)

### Community 38 - "Notifs — moteur de templates"
Cohesion: 0.12
Nodes (21): createInternalNotification(), createMediaAvailableNotification(), CreateNotificationInput, createTicketNotification(), createUpdateNotification(), DEFAULT_TEMPLATES, TemplateVariants, TemplateRenderer (+13 more)

### Community 39 - "services"
Cohesion: 0.14
Nodes (24): dynamic, maxDuration, POST(), dynamic, GET(), dynamic, maxDuration, POST() (+16 more)

### Community 40 - "services"
Cohesion: 0.13
Nodes (25): dynamic, failure(), GET(), PUT(), resolveStack(), RouteContext, DEPLOY, dynamic (+17 more)

### Community 41 - "Téléchargements — fichiers"
Cohesion: 0.12
Nodes (22): DeleteFileModal(), DeleteFileModalProps, FileManagerHeader(), FileManagerHeaderProps, FileManagerRow(), FileManagerRowProps, formatFileSize(), FileManagerTable() (+14 more)

### Community 42 - "downloads / [hash]"
Cohesion: 0.17
Nodes (21): EnrichedTorrentInfo, MediaInfo, RelatedRequest, MediaInfoCard(), MediaInfoCardProps, TorrentDetailsHeader(), TorrentDetailsHeaderProps, TorrentInfoCard() (+13 more)

### Community 43 - "Média — saisons & épisodes"
Cohesion: 0.16
Nodes (21): EpisodeCard(), EpisodeCardProps, SeasonItem(), SeasonItemProps, SeasonItemHeader(), SeasonItemHeaderProps, SeasonRequestButton(), SeasonRequestButtonProps (+13 more)

### Community 44 - "dom"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 45 - "[id] / page"
Cohesion: 0.13
Nodes (20): MediaActionsRowProps, MediaAvailabilityBadges(), MediaAvailabilityBadgesProps, MediaPageContentProps, MediaProgressBarProps, MediaRelatedSliders(), MediaRelatedSlidersProps, MediaTitleHeader() (+12 more)

### Community 46 - "Réglages — onglets"
Cohesion: 0.16
Nodes (22): AccountRequestsManagement(), SettingsTabButton(), SettingsTabButtonProps, SettingsTabsContent(), SettingsTabsContentProps, SettingsTabsNav(), SettingsTabsNavProps, SettingsTabs() (+14 more)

### Community 47 - "Notifs — event store & dédup"
Cohesion: 0.11
Nodes (16): AvailabilityPoller, buildDedupKey(), parseDedupKey(), PERMANENT_DEDUP_EVENTS, seasonSegment(), assertEqual(), MOVIE_MEDIA, REQUESTER (+8 more)

### Community 49 - "dashboard / downloads"
Cohesion: 0.10
Nodes (17): dynamic, POST(), GET(), GET(), dynamic, POST(), GET(), dynamic (+9 more)

### Community 50 - "torrent / filter-modal"
Cohesion: 0.10
Nodes (19): FilterConfigBar(), FilterConfigBarProps, FilterModalFooter(), FilterModalFooterProps, FilterModalHeader(), FilterModalHeaderProps, PeriodSection(), PeriodSectionProps (+11 more)

### Community 51 - "media / [id]"
Cohesion: 0.15
Nodes (20): AvailableSeasonsList(), AvailableSeasonsListProps, SeasonInfo, DownloadStatusModal(), DownloadStatusModalProps, MovieDownloadProgress(), MovieDownloadProgressProps, SeasonDownloadRow() (+12 more)

### Community 52 - "Notifs — config & destinataires"
Cohesion: 0.15
Nodes (17): startNotificationsV2(), stopNotificationsV2(), DEFAULT_CONFIG, defaultRoute(), mergeWithDefaults(), migrateLegacyTemplate(), assertEqual(), runTests() (+9 more)

### Community 53 - "Service qBittorrent"
Cohesion: 0.14
Nodes (3): error(), log(), QBittorrentService

### Community 54 - "services"
Cohesion: 0.18
Nodes (22): authorize(), DELETE(), dynamic, failure(), PUT(), RouteContext, dynamic, GET() (+14 more)

### Community 55 - "dashboard / stats"
Cohesion: 0.16
Nodes (19): buildHref(), HistoryItem(), HistoryItemProps, HistoryItemMeta(), HistoryItemMetaProps, HistoryItemThumbnail(), HistoryItemThumbnailProps, RecentHistory() (+11 more)

### Community 56 - "Documentation & concepts du projet"
Cohesion: 0.08
Nodes (26): P1 - Eliminer la dette de typage any, P2 - Memoization, code splitting, virtualisation, P2 - Client API centralise, Conteneur docker mediahub-app, Fail2ban sur tous les providers, Jellyfin comme serveur principal, MediaHub (application), Next.js App Router (+18 more)

### Community 57 - "Scraping trackers (Playwright)"
Cohesion: 0.22
Nodes (25): COOKIES_DIR, createStealthContext(), ensureCookiesDir(), error(), getRandomUserAgent(), launchStealthBrowser(), loadCookies(), loadToken() (+17 more)

### Community 58 - "Mise à jour système"
Cohesion: 0.14
Nodes (11): GET(), POST(), clearUpdateNotifications(), ContainerUpdateStatus, docker, globalForCache, SystemUpdateService, SystemUpdateStatus (+3 more)

### Community 59 - "dashboard / docker"
Cohesion: 0.13
Nodes (21): DockerHealthBanner(), DockerHealthBannerProps, ACTION_DONE, ACTION_LABELS, ActionPayload, ASSUME_ALL, ContainersApiResponse, ContainersState (+13 more)

### Community 60 - "downloads / torrent"
Cohesion: 0.16
Nodes (18): TorrentFiltersBarProps, TorrentList(), TorrentListProps, TorrentRow, TorrentRowProps, VisibleColumns, TorrentRowFooter(), TorrentRowFooterProps (+10 more)

### Community 61 - "Média — gestion"
Cohesion: 0.18
Nodes (18): MediaRequestRow(), MediaRequestRowProps, MediaRequestsSection(), MediaRequestsSectionProps, getStatusClasses(), MediaServiceStatusSection(), MediaServiceStatusSectionProps, STATUS_LABELS (+10 more)

### Community 62 - "settings / support"
Cohesion: 0.15
Nodes (18): DiscordMentionsManager(), MentionItem, parseMentions(), serializeMentions(), SupportCategoriesConfig(), SubTab, SupportManagement(), statusColors (+10 more)

### Community 63 - "services"
Cohesion: 0.12
Nodes (4): OnQbitChange, QBittorrentSyncClient, normalizeTorrent(), QBittorrentCache

### Community 64 - "dashboard / settings"
Cohesion: 0.17
Nodes (16): dynamic, GET(), approveAccountRequestAction(), deleteAccountRequestAction(), fixMissingTitlesAction(), importJellyseerrRequestsAction(), rejectAccountRequestAction(), testJellyseerrConnectionAction() (+8 more)

### Community 65 - "dashboard / recent-requests"
Cohesion: 0.15
Nodes (17): RequestItem(), RequestItemProps, resolvePosterPaths(), RequestPoster(), RequestPosterProps, getStatusIcon(), getStatusText(), RequestStatusBadge() (+9 more)

### Community 66 - "dashboard / docker"
Cohesion: 0.21
Nodes (18): ConsoleHeaderProps, FILTERS, SORTS, DockerGroupSectionProps, DockerSearchBarProps, SORTS, STATE_FILTERS, UseDockerComputedDataOptions (+10 more)

### Community 67 - "settings / account-requests"
Cohesion: 0.18
Nodes (16): ApprovalModal(), ApprovalModalProps, HistoryRequestRow(), HistoryRequestRowProps, HistorySection(), HistorySectionProps, PendingRequestCard(), PendingRequestCardProps (+8 more)

### Community 68 - "Réglages — sauvegardes"
Cohesion: 0.13
Nodes (18): BackupExportCard(), BackupExportCardProps, BackupImportCard(), BackupImportCardProps, PasswordInput(), PasswordInputColor, PasswordInputProps, RING_CLASSES (+10 more)

### Community 69 - "Cache applicatif"
Cohesion: 0.14
Nodes (18): cached(), CacheOptions, getDbClient(), invalidateCache(), invalidateTag(), l1, l2Get(), l2Set() (+10 more)

### Community 71 - "media / [id]"
Cohesion: 0.16
Nodes (16): addToCalendar(), removeFromCalendar(), MobileActionsMenu(), ManageMediaButton(), ManageMediaButtonProps, toggleSubscription(), SubscribeButton(), WatchLaterButton() (+8 more)

### Community 72 - "notifications-v2 / realtime"
Cohesion: 0.15
Nodes (10): GET(), POST(), StuckItemResponse, DEFAULT_CONFIG, getStuckImportDetector(), StuckImportConfig, StuckItem, QueuePoller (+2 more)

### Community 73 - "Service Docker"
Cohesion: 0.26
Nodes (9): GET(), getDockerConfig(), DockerCapabilities, DockerLifecycleAction, DockerService, error(), log(), stripUnraidIdPrefix() (+1 more)

### Community 74 - "dashboard / downloads"
Cohesion: 0.26
Nodes (19): addTorrent(), checkAccess(), deleteSmbPath(), deleteStoragePath(), deleteTorrents(), getCategories(), getGlobalStats(), getSessionTrackerStats() (+11 more)

### Community 75 - "ui"
Cohesion: 0.18
Nodes (15): SubscribeButtonProps, CalendarHeader(), CalendarHeaderProps, EventTooltip(), Badge(), BadgeProps, Button, ButtonProps (+7 more)

### Community 76 - "dashboard / stats"
Cohesion: 0.19
Nodes (19): fetchStatsData(), fetchOldestWatchEventYear(), fetchProviderIdToLocalUserMap(), fetchUserGroupMap(), fetchWatchHistory(), StatsScopedUser, AggregatedMedia, aggregateMostViewed() (+11 more)

### Community 77 - "services"
Cohesion: 0.14
Nodes (15): register(), dailyTrackerStats, trackerStatsLogs, MediaSyncService, CacheState, g, OnCacheChange, checkCompletedDownloads() (+7 more)

### Community 78 - "types"
Cohesion: 0.18
Nodes (17): AddSeriesOptions, IMPORTANT: lookup returns the series info from SkyHook (metadata provider), SonarrEpisodeFile, SonarrSeason, SonarrSeries, EmbyItem, EmbyMediaSource, EmbyMediaStream (+9 more)

### Community 79 - "docker / logs"
Cohesion: 0.15
Nodes (15): colorizeLog(), convert, LogAccessDenied(), LogAccessDeniedProps, formatTime(), LogViewerContent(), LogViewerContentProps, LogViewerHeader() (+7 more)

### Community 80 - "downloads / torrent"
Cohesion: 0.14
Nodes (15): ColumnsDropdown(), ColumnsDropdownProps, SortDropdown(), SortDropdownProps, StatusFilterRow(), StatusFilterRowProps, TorrentActionBar(), TorrentActionBarProps (+7 more)

### Community 81 - "dashboard / settings"
Cohesion: 0.14
Nodes (16): MaintenanceSettings(), Props, ApiResponse, formatBytes(), formatDuration(), Stats, StuckImportsManager(), StuckItem (+8 more)

### Community 82 - "lib"
Cohesion: 0.12
Nodes (17): Dedup atomique via UNIQUE(dedup_key), Retry avec backoff exponentiel, Pipeline de notifications V2, Outbox pattern (livraison fiable), Notifications V2 - Implementation Summary, emit(), formatLog(), generateCorrelationId() (+9 more)

### Community 83 - "Notifs — poller de queue"
Cohesion: 0.21
Nodes (5): DetectInput, mapTrackedState(), QueuePoller, RadarrQueueItem, SonarrQueueItem

### Community 84 - "Parseur de noms de torrents"
Cohesion: 0.17
Nodes (18): extractAudio(), extractCodec(), extractEpisode(), extractLanguage(), extractPlatform(), extractQuality(), extractReleaseGroup(), extractSeason() (+10 more)

### Community 85 - "dashboard / docker"
Cohesion: 0.17
Nodes (14): ComposeEditorModal(), ComposeEditorModalProps, ComposeFile, DockerStacksPanel(), DockerStacksPanelProps, ACTION_LABELS, QUERY_KEY, useDockerStacks() (+6 more)

### Community 86 - "dashboard / settings"
Cohesion: 0.14
Nodes (14): testProwlarrConnectionAction(), testQBittorrentConnectionAction(), DownloadSettings(), Props, MediaSettings(), SettingsFormFooter(), SettingsFormFooterProps, initialFormData (+6 more)

### Community 87 - "settings / system-messages"
Cohesion: 0.14
Nodes (13): BannerMessageSection(), BannerMessageSectionProps, PopupMessageSection(), PopupMessageSectionProps, SaveStatusAlert(), SaveStatusAlertProps, SystemMessageHeader(), SaveStatus (+5 more)

### Community 88 - "stats / me"
Cohesion: 0.15
Nodes (13): buildMediaHref(), extractSearchName(), MeRecentHistoryItem(), MeRecentHistoryItemProps, MeRecentHistoryListProps, aggregateMyMostViewed(), computeMyTotals(), detectSource() (+5 more)

### Community 89 - "Configuration initiale"
Cohesion: 0.13
Nodes (14): ServerType, SetupConfigureForm(), SetupConfigureFormProps, SetupModeToggle(), SetupModeToggleProps, SetupRestoreForm(), SetupRestoreFormProps, FormData (+6 more)

### Community 90 - "Navbar"
Cohesion: 0.22
Nodes (12): NAVIGATION_ITEMS, useNavbarMenus(), UseNavbarMenusResult, Navbar(), NavbarDesktopMenu(), NavbarDesktopMenuProps, NavbarLogo(), NavbarProps (+4 more)

### Community 91 - "notifications-v2 / utils"
Cohesion: 0.13
Nodes (14): downloadIntents, classifyDownload(), ClassifyInput, ClassifyResult, EpisodeNotificationDecision, FRESH_AIR_WINDOW_DAYS, INTENT_CLASSIFICATIONS, IntentClassification (+6 more)

### Community 92 - "Calendrier des sorties"
Cohesion: 0.19
Nodes (15): CalendarEvent, error(), getCalendarEvents(), log(), RadarrCalendarMovie, SonarrCalendarEpisode, TmdbEpisode, TmdbSeason (+7 more)

### Community 93 - "downloads / [hash]"
Cohesion: 0.25
Nodes (17): error(), fetchRelatedRequests(), fetchTMDBInfo(), findIndexerIdForTracker(), formatBytes(), formatSpeed(), getProwlarrIndexersMap(), getTorrentDetails() (+9 more)

### Community 94 - "Sessions de lecture en direct"
Cohesion: 0.20
Nodes (12): formatSessionDisplay(), SessionDisplay, LiveSessionCard(), LiveSessionCardProps, LiveSessionsEmpty(), LiveSessionsHeader(), LiveSessionsHeaderProps, InterpolatedSession (+4 more)

### Community 95 - "settings / linked-accounts"
Cohesion: 0.19
Nodes (13): AddMemberModal(), AddMemberModalProps, CreateGroupForm(), CreateGroupFormProps, GroupCard(), GroupCardProps, LinkedAccounts(), Candidate (+5 more)

### Community 96 - "Statistiques"
Cohesion: 0.15
Nodes (13): StatCard(), StatCardProps, StatsEmptyState(), StatsEmptyStateProps, StatsRestrictedAccess(), StatsRestrictedAccessProps, formatDuration(), UserStatsCard() (+5 more)

### Community 97 - "app"
Cohesion: 0.15
Nodes (11): geistMono, geistSans, metadata, SupportChatbot(), Providers(), QueryProvider(), Category, ChatMessage (+3 more)

### Community 98 - "lib"
Cohesion: 0.19
Nodes (14): NavbarMobileMenu(), NavbarMobileMenuProps, PREVIEWS, ThemeSwitcher(), ThemeContext, ThemeContextValue, ThemeProvider(), useTheme() (+6 more)

### Community 100 - "Service SMB"
Cohesion: 0.27
Nodes (4): testSmbConnection(), devError(), devLog(), SmbService

### Community 101 - "dashboard / stats"
Cohesion: 0.17
Nodes (11): SourceFilter(), StatsHeader(), StatsHeaderProps, PeriodButtonProps, StatsPeriodNav(), StatsPeriodNavProps, SyncPluginButton(), computeStatsPeriod() (+3 more)

### Community 102 - "Demande d'accès"
Cohesion: 0.16
Nodes (12): Step1(), Step1Props, FormData, Step2(), Step2Props, Step3(), Step3Props, FormData (+4 more)

### Community 103 - "lib"
Cohesion: 0.15
Nodes (9): RETRY, TIMEOUT, breakers, CircuitBreaker, createAxiosClient(), getKey(), inFlight, isRetryable() (+1 more)

### Community 105 - "Média — page de détail"
Cohesion: 0.20
Nodes (12): AccessDeniedFallback(), ExternalMediaFallback(), ExternalMediaFallbackProps, MediaPageContent(), dynamic, MediaDetailsPage(), ExternalItemResolution, fetchExternalItem() (+4 more)

### Community 106 - "global / navbar"
Cohesion: 0.23
Nodes (11): MediaBackdrop(), MediaBackdropProps, MediaBackLink(), MediaHero(), readOrigin(), subscribe(), useNavigationOrigin(), useStoredNavigationOrigin() (+3 more)

### Community 107 - "media / [id]"
Cohesion: 0.28
Nodes (13): SearchActions(), SearchActionsProps, Episode, Release, useInteractiveSearch(), UseInteractiveSearchResult, checkPermission(), downloadRelease() (+5 more)

### Community 108 - "dashboard"
Cohesion: 0.22
Nodes (10): markWelcomeAsSeen(), WelcomePopup(), WelcomePopupProps, useMediaServerType(), PlayButton(), PlayButtonProps, RequestStatusButton(), RequestStatusButtonProps (+2 more)

### Community 109 - "docker / terminal"
Cohesion: 0.19
Nodes (10): TerminalAccessDenied(), TerminalAccessDeniedProps, TerminalContainer(), TerminalContainerProps, TerminalHeader(), TerminalHeaderProps, log(), useTerminal() (+2 more)

### Community 110 - "[id] / interactive-search"
Cohesion: 0.18
Nodes (10): Release, ReleasesTable(), ReleasesTableProps, SearchControls(), SearchControlsProps, SearchEmpty(), SearchEmptyProps, formatSize() (+2 more)

### Community 111 - "Service FTP"
Cohesion: 0.28
Nodes (4): error(), FileInfo, FtpService, log()

### Community 112 - "dashboard / downloads"
Cohesion: 0.27
Nodes (11): ShareManagerModal(), ShareManagerModalProps, deletePublicShare(), listPublicShares(), RemoteFilesResult, ShareListItem, testEmbyConnection(), testJellyfinConnection() (+3 more)

### Community 113 - "media / [id]"
Cohesion: 0.16
Nodes (11): CastList(), CastListProps, CastMember, MediaCastSection(), MediaCastSectionProps, CastMember, CrewMember, DEPT_TRANSLATIONS (+3 more)

### Community 114 - "scripts"
Cohesion: 0.14
Nodes (11): appProcess, http, httpProxy, net, processes, proxy, PROXY_PORT, proxyServer (+3 more)

### Community 115 - "ansi-to-html"
Cohesion: 0.15
Nodes (13): ansi-to-html, @casl/ability, @marsaud/smb2, dependencies, ansi-to-html, @casl/ability, @marsaud/smb2, socket.io-client (+5 more)

### Community 116 - "settings / storage"
Cohesion: 0.22
Nodes (10): testStorageConnection(), testUnraidConnection(), testUnraidDebugAction(), DockerSettings(), LegacySmbMigration(), LegacySmbMigrationProps, StorageConnectionForm(), UnraidSettings() (+2 more)

### Community 117 - "[id] / page"
Cohesion: 0.19
Nodes (9): MediaCollection, MediaCollectionCard(), MediaCollectionCardProps, MediaInfoTable(), MediaInfoTableProps, MediaSidebar(), MediaSidebarProps, MediaWatchProviders() (+1 more)

### Community 118 - "stats / me"
Cohesion: 0.19
Nodes (8): MePeriodNavigatorProps, MePeriodTabsProps, PeriodButtonProps, computeMePeriod(), MePeriod, MePeriodParams, MePeriodResult, normalizePeriod()

### Community 119 - "[id] / page"
Cohesion: 0.20
Nodes (7): MediaActionsRow(), MediaDownloadProgressBar(), MediaDownloadProgressBarProps, MediaPrimaryActions(), MediaPrimaryActionsProps, TrailerButton(), TrailerButtonProps

### Community 121 - "services"
Cohesion: 0.17
Nodes (11): DockerContainerRaw, DockerPort, GraphQLData, UNRAID_DEFAULT_VIEW_ID, UnraidContainer, UnraidContainerStats, UnraidOrganizerEntry, UnraidOrganizerView (+3 more)

### Community 122 - "users / sync"
Cohesion: 0.36
Nodes (9): error(), log(), POST(), warn(), getEmbyServiceForUser(), getJellyfinServiceForUser(), getPlexServiceForUser(), checkItem() (+1 more)

### Community 123 - "dashboard / docker"
Cohesion: 0.44
Nodes (9): useDockerComputedData(), buildGroupedContainers(), computeDockerStats(), DockerStats, filterByState(), filterContainers(), getUngroupedContainers(), hasUpdate() (+1 more)

### Community 124 - "media / [id]"
Cohesion: 0.25
Nodes (8): requestAllSeasons(), useRequestStatus(), Season, SeasonSelectorModal(), SeasonSelectorModalProps, SeasonStatus, RequestButton(), RequestButtonProps

### Community 125 - "cross-env"
Cohesion: 0.18
Nodes (11): cross-env, devDependencies, cross-env, tailwindcss, @tailwindcss/postcss, @types/dockerode, @types/ws, tailwindcss (+3 more)

### Community 126 - "Service Jellyfin"
Cohesion: 0.31
Nodes (4): error(), JellyfinService, log(), warn()

### Community 127 - "global / navbar"
Cohesion: 0.27
Nodes (5): NavbarUserMenu(), NavbarUserMenuProps, navigation, AbilityContext, Can

### Community 128 - "[id] / page"
Cohesion: 0.24
Nodes (7): MediaCrewGrid(), MediaCrewGridProps, MediaKeyword, MediaKeywords(), MediaKeywordsProps, MediaOverviewSection(), MediaOverviewSectionProps

### Community 129 - "notifications-v2 / pollers"
Cohesion: 0.31
Nodes (8): calculateProgress(), detectProgress(), findQueueItem(), findTorrent(), formatSize(), matchQuality(), ProgressSnapshot, ProgressState

### Community 131 - "scripts"
Cohesion: 0.31
Nodes (9): collectRuntimeOrigins(), CONFIG_FILE, fs, main(), mergeOrigins(), patchRequiredServerFiles(), patchStandaloneServer(), path (+1 more)

### Community 132 - "media / [id]"
Cohesion: 0.42
Nodes (8): checkDownloadStatus(), error(), formatBytes(), formatSpeed(), formatTime(), log(), SeasonInfo, warn()

### Community 133 - "dashboard / stats"
Cohesion: 0.31
Nodes (7): ActivityChart(), ActivityChartProps, ActivityData, StatsCharts(), StatsChartsProps, UserStat, StatsDataResult

### Community 134 - "global / navbar"
Cohesion: 0.36
Nodes (7): NotificationItem, useNotifications(), UseNotificationsResult, formatTimeAgo(), NOTIFICATION_ICONS, NotificationBell(), InternalNotificationType

### Community 135 - "scripts"
Cohesion: 0.28
Nodes (6): NOTE: This method now falls back to Playback Reporting as the primary source, getSetting(), main(), mapLimit(), main(), prisma

### Community 137 - "scripts"
Cohesion: 0.42
Nodes (8): cleanEndpointsConfig(), dockerAPI(), fs, http, log(), recreate(), safelyDeleteOldImage(), sleep()

### Community 138 - "global"
Cohesion: 0.39
Nodes (5): MediaItem, MediaList(), MediaListProps, MediaListVariant, MediaTabsProps

### Community 140 - "services"
Cohesion: 0.54
Nodes (7): collectPlayedPairs(), mapLimit(), readLastPlayedDates(), resolveLastPlayedDatesFromEmby(), runLastPlayedBackfill(), sqlExcluded(), upsertLastPlayedDates()

### Community 141 - "test-ability.ts"
Cohesion: 0.25
Nodes (7): abilityAdmin, abilityGuest, abilityPerm, abilityUser, userAdmin, userWithPerm, userWithRole

### Community 142 - "dashboard"
Cohesion: 0.38
Nodes (4): DashboardLayout(), dynamic, SystemMessageDisplay(), CardSpotlight()

### Community 143 - "notifications-v2 / realtime"
Cohesion: 0.29
Nodes (3): OnMessage, SignalRClient, SignalRMessage

### Community 145 - "package.json"
Cohesion: 0.29
Nodes (6): name, pnpm, neverBuiltDependencies, private, version, cpu-features

### Community 146 - "stats / top-items-tabs"
Cohesion: 0.40
Nodes (4): TopItemCard(), TopItemCardProps, TopItemsTabs(), TopItemsTabsProps

### Community 147 - "lib"
Cohesion: 0.33
Nodes (3): RateLimitConfig, RateLimitResult, store

### Community 149 - "types"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 150 - "stats / sync-plugin"
Cohesion: 0.60
Nodes (5): batchProcess(), log(), syncEmbyLike(), syncPlex(), warn()

### Community 151 - "support / upload"
Cohesion: 0.70
Nodes (4): GET(), getUploadDir(), POST(), resolveDbPath()

### Community 152 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 153 - "next.config.ts"
Cohesion: 0.50
Nodes (3): allowedOrigins, nextConfig, NOTE: en mode standalone (Docker), cette config est figée au build.

## Ambiguous Edges - Review These
- `MediaHub (application)` → `Chatbot de support (en test)`  [AMBIGUOUS]
  CHANGELOG.md · relation: has_feature

## Knowledge Gaps
- **868 isolated node(s):** `TmdbSeason`, `TmdbEpisode`, `RadarrCalendarMovie`, `SonarrCalendarEpisode`, `dynamic` (+863 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **105 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MediaHub (application)` and `Chatbot de support (en test)`?**
  _Edge tagged AMBIGUOUS (relation: has_feature) - confidence is low._
- **Why does `P1 - Decomposer les composants monolithiques` connect `Demande d'accès` to `Statistiques`, `dashboard / stats`, `Recherche Prowlarr (UI)`, `global / media-filters`, `Réglages — rôles`, `docker / terminal`, `[id] / interactive-search`, `docker / logs`, `Dashboard — accueil`, `torrent / filter-modal`, `settings / media`, `settings / storage`, `dashboard / settings`, `settings / system-messages`, `Documentation & concepts du projet`, `media / [id]`, `Sessions de lecture en direct`, `docker / stats`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `Top 20 des plus gros composants (lignes)` connect `Demande d'accès` to `Statistiques`, `dashboard / stats`, `Recherche Prowlarr (UI)`, `global / media-filters`, `Réglages — rôles`, `docker / terminal`, `[id] / interactive-search`, `docker / logs`, `Dashboard — accueil`, `torrent / filter-modal`, `settings / media`, `settings / storage`, `dashboard / settings`, `settings / system-messages`, `media / [id]`, `Sessions de lecture en direct`, `docker / stats`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `db` connect `Schéma DB Drizzle` to `Notifs — dispatcher`, `Session & utilisateur courant`, `Service Plex`, `scripts`, `db`, `requests / list`, `auth / providers`, `Dashboard — accueil`, `dashboard`, `Push — souscriptions & envoi`, `services`, `Logger & services partagés`, `Notifs — provider Web Push`, `Cache liste de stockage`, `Notifs — outbox worker`, `roles / [id]`, `dashboard / settings`, `dashboard / settings`, `Notifs — moteur de templates`, `services`, `Notifs — event store & dédup`, `dashboard / downloads`, `Notifs — config & destinataires`, `dashboard / settings`, `dashboard / downloads`, `dashboard / stats`, `services`, `notifications-v2 / utils`, `Calendrier des sorties`, `downloads / [hash]`, `dashboard / downloads`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `TmdbSeason`, `TmdbEpisode`, `RadarrCalendarMovie` to the rest of the system?**
  _868 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Schéma DB Drizzle` be split into smaller, more focused modules?**
  _Cohesion score 0.03506311360448808 - nodes in this community are weakly interconnected._
- **Should `Service Prowlarr` be split into smaller, more focused modules?**
  _Cohesion score 0.056679151061173536 - nodes in this community are weakly interconnected._