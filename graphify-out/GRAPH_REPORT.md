# Graph Report - next-app  (2026-11-02)

## Corpus Check
- Large corpus: 722 files · ~342,787 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3832 nodes · 11030 edges · 166 communities (156 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- services
- Schéma DB Drizzle
- Dashboard — accueil
- Logger & services partagés
- Notifications internes (cloche)
- global
- Cache liste de stockage
- Demandes — liste
- dashboard / settings
- admin / users
- integrations
- Réglages — rôles
- Service Emby
- Calendrier des sorties
- Notifs — dispatcher
- Permissions CASL
- downloads / [hash]
- global / media-filters
- Connexion DB & auth
- settings / media
- services
- dependencies
- services
- media / [id]
- dashboard / media
- download-managers
- scripts
- drizzle.config.ts
- services
- settings / support
- user-groups / details
- Réglages — utilisateurs
- scripts
- media / [id]
- auth / providers
- MediaCard & listes
- Service Jellyfin
- Navbar
- downloads / torrent
- torrent / filter-modal
- Statistiques
- Session & utilisateur courant
- services
- Service Plex
- media / [id]
- Client API centralisé
- dashboard
- Téléchargements — fichiers
- settings / account-requests
- settings / storage
- lib
- Service Sonarr
- Recherche Prowlarr (UI)
- Réglages — onglets
- Notifs — outbox worker
- Service qBittorrent
- notifications-v2 / providers
- media / [id]
- Téléchargements — torrents
- settings / notifications-v2
- dashboard / stats
- Connexion
- notifications-v2 / pollers
- media / [id]
- Média — gestion
- global / prowlarr
- notifications-v2 / store
- lib
- scripts
- Réglages — sauvegardes
- stats / storage
- Notifs — config & destinataires
- requests / infinite-media
- dashboard / settings
- Réglages — notifications
- dashboard / stats
- dashboard / stats
- Cache applicatif
- Parseur de noms de torrents
- dashboard / downloads
- downloads / torrent
- downloads / torrent
- dashboard / media
- [id] / season
- requests / list
- settings / system-messages
- downloads / downloads-client
- Sessions de lecture en direct
- providers
- Notifs — provider WhatsApp
- Notifs — moteur de templates
- tsconfig.json
- sync / requests
- dashboard
- media / [id]
- settings / linked-accounts
- lib
- devDependencies
- public / request-access
- dashboard / dashboard
- media / [id]
- Média — page de détail
- stats / storage
- stats / storage-manager
- Configuration initiale
- lib
- Notifs — détection de disponibilité
- Service Radarr
- global / navbar
- dashboard / stats
- hooks
- Demande d'accès
- scripts
- integrations
- downloads / file-manager
- media / [id]
- storage / details
- lib
- Mise à jour système
- Service SMB
- [id] / page
- Service Prowlarr
- image / [id]
- lib
- services
- dashboard / downloads
- [id] / page
- [id] / page
- scripts
- notifications-v2
- Service Unraid
- media / [id]
- requests / infinite-media
- dashboard / stats
- login
- Service FTP
- services
- webhooks / sorraa
- [id] /  services
- dashboard / stats
- dashboard / recent-requests
- Service fichiers locaux
- [id] / page
- scripts
- media / [id]
- stats / me
- providers
- global / navbar
- global
- dashboard / notifications
- types
- dashboard / settings
- login
- roles / default
- user / candidates
- dashboard / downloads
- types
- support / upload
- scripts
- services
- scripts
- next.config.ts
- postcss.config.mjs
- types

## God Nodes (most connected - your core abstractions)
1. `lucide-react` - 230 edges
2. `react` - 188 edges
3. `next` - 171 edges
4. `getCurrentUser()` - 101 edges
5. `db` - 100 edges
6. `drizzle-orm` - 97 edges
7. `getSession` - 86 edges
8. `defineAbilityFor()` - 77 edges
9. `EmbyService` - 77 edges
10. `logger` - 57 edges

## Surprising Connections (you probably didn't know these)
- `Table notification_events` --defined_in--> `notificationEvents`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/db/schema.ts
- `Derive de schema DB en production` --missing_columns--> `users`  [EXTRACTED]
  scripts/README-PRODUCTION-FIX.md → lib/db/schema.ts
- `Table notification_deliveries` --defined_in--> `notificationDeliveries`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/db/schema.ts
- `GET()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/api/admin/notifications/route.ts → lib/auth/index.ts
- `GET()` --calls--> `getSession`  [EXTRACTED]
  app/api/admin/system/update/logs/route.ts → lib/auth/index.ts

## Import Cycles
- None detected.

## Communities (166 total, 10 thin omitted)

### Community 0 - "services"
Cohesion: 0.06
Nodes (73): clientIp(), connect(), dynamic, GET(), hintOf(), linkOnyx(), POST(), requireAdmin() (+65 more)

### Community 1 - "Schéma DB Drizzle"
Cohesion: 0.04
Nodes (59): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+51 more)

### Community 2 - "Dashboard — accueil"
Cohesion: 0.09
Nodes (44): RecentlyWatchedSection(), RecentlyWatchedSkeleton(), RecentRequestsSection(), RecentRequestsSkeleton(), RecommendationsSection(), RecommendationsSkeleton(), settle(), RequestItem() (+36 more)

### Community 3 - "Logger & services partagés"
Cohesion: 0.06
Nodes (36): dynamic, dynamic, POST(), revalidate, POST(), dynamic, EVENT_MAP, MediaRequestLite (+28 more)

### Community 4 - "Notifications internes (cloche)"
Cohesion: 0.06
Nodes (37): startImpersonation(), DELETE(), dynamic, GET(), PUT(), revalidate, dynamic, GET() (+29 more)

### Community 5 - "global"
Cohesion: 0.08
Nodes (51): arrived(), BACKDROP, backdropHeight(), backdropImage(), calm(), clearNav(), clearNavLater(), depth() (+43 more)

### Community 6 - "Cache liste de stockage"
Cohesion: 0.09
Nodes (43): dynamic, error(), GET(), log(), maxDuration, parseSort(), VALID_SORT_DIRS, VALID_SORT_KEYS (+35 more)

### Community 7 - "Demandes — liste"
Cohesion: 0.07
Nodes (40): MediaManagerButton(), MediaManagerButtonProps, error(), fetchUserRequests(), forceSyncRequests(), log(), warn(), FilterPillGroup() (+32 more)

### Community 8 - "dashboard / settings"
Cohesion: 0.09
Nodes (41): getActivityLogs(), getLogUsers(), importPastRequestsIntoLogs(), ActivityLogRow(), ActivityLogRowProps, ActivityLogsPagination(), ActivityLogsPaginationProps, ActivityLogsTable() (+33 more)

### Community 9 - "admin / users"
Cohesion: 0.07
Nodes (38): dynamic, GET(), POST(), dynamic, GET(), POST(), dynamic, POST() (+30 more)

### Community 10 - "integrations"
Cohesion: 0.12
Nodes (41): dynamic, GET(), dynamic, POST(), dynamic, GET(), parseNumber(), parseTarget() (+33 more)

### Community 11 - "Réglages — rôles"
Cohesion: 0.10
Nodes (34): RoleEditor(), RoleEditorProps, RoleManagement(), DefaultRoleSelector(), DefaultRoleSelectorProps, PermissionCheckbox(), PermissionCheckboxProps, PermissionRow() (+26 more)

### Community 12 - "Service Emby"
Cohesion: 0.12
Nodes (4): EmbyService, error(), log(), warn()

### Community 13 - "Calendrier des sorties"
Cohesion: 0.10
Nodes (33): backdropUrlOf(), CalendarEvent, error(), getCalendarEvents(), log(), RadarrCalendarMovie, SonarrCalendarEpisode, TmdbEpisode (+25 more)

### Community 14 - "Notifs — dispatcher"
Cohesion: 0.08
Nodes (27): dynamic, EVENT_MAP, groupEpisodesBySeason(), handleImportEvent(), POST(), createMediaAvailableNotification(), dispatch(), generateCorrelationId() (+19 more)

### Community 15 - "Permissions CASL"
Cohesion: 0.10
Nodes (34): GET(), POST(), StuckItemResponse, GET(), DELETE(), GET(), InfiniteDiscoverList(), DiscoverPage() (+26 more)

### Community 16 - "downloads / [hash]"
Cohesion: 0.13
Nodes (34): EnrichedTorrentInfo, error(), fetchRelatedRequests(), fetchTMDBInfo(), findIndexerIdForTracker(), formatBytes(), formatSpeed(), getProwlarrIndexersMap() (+26 more)

### Community 17 - "global / media-filters"
Cohesion: 0.11
Nodes (31): getFilterOptions(), getWatchProviders(), FilterModal(), FilterModalProps, DEFAULT_MEDIA_FILTERS, LANGUAGES, PROVIDER_PREVIEW_LIMIT, REGIONS (+23 more)

### Community 18 - "Connexion DB & auth"
Cohesion: 0.08
Nodes (25): dynamic, GET(), POST(), dynamic, GET(), CONFIG_KEYS, DashboardConfig, COLUMN_PATCHES (+17 more)

### Community 19 - "settings / media"
Cohesion: 0.18
Nodes (28): ArrSection(), ArrSectionProps, AutomationSettings(), Props, EmbySettings(), EmbySettingsProps, JellyfinSettings(), JellyfinSettingsProps (+20 more)

### Community 20 - "services"
Cohesion: 0.07
Nodes (21): searchSorraa(), ageInDays(), describeRejection(), findUnit(), mb(), releaseFromSorraa(), ReleaseUnitTarget, SorraaAvailability (+13 more)

### Community 21 - "dependencies"
Cohesion: 0.05
Nodes (40): dependencies, archiver, axios, basic-ftp, bcryptjs, better-sqlite3, @casl/ability, @casl/react (+32 more)

### Community 22 - "services"
Cohesion: 0.11
Nodes (31): dynamic, maxDuration, POST(), dynamic, GET(), toMediaInfo(), yearOf(), dynamic (+23 more)

### Community 23 - "media / [id]"
Cohesion: 0.11
Nodes (29): getSeasonDetails(), requestSeason(), requestSeasons(), SearchActions(), SearchActionsProps, EpisodeCard(), EpisodeCardProps, EpisodeSkeleton() (+21 more)

### Community 24 - "dashboard / media"
Cohesion: 0.12
Nodes (30): classifyLibraryError(), error(), fetchEmbyMedia(), fetchOnyxMedia(), fetchRecentlyWatchedItems(), fetchServerTrends(), fetchUserRecommendations(), getSeriesTmdbId() (+22 more)

### Community 25 - "download-managers"
Cohesion: 0.13
Nodes (24): ArrDownloadManager, getDownloadManager(), SETTING_KEYS, ACTIVE_GRAB_STATUSES, availabilityFromSorraa(), best(), formatBytes(), formatDuration() (+16 more)

### Community 26 - "scripts"
Cohesion: 0.11
Nodes (33): getPrisma(), dotenv, socket.io, ws, activeSessions, attachSessionIfPresent(), authenticateSocket(), broadcastSessions() (+25 more)

### Community 27 - "drizzle.config.ts"
Cohesion: 0.06
Nodes (31): eslintConfig, name, pnpm, neverBuiltDependencies, private, version, babel-plugin-react-compiler, better-sqlite3 (+23 more)

### Community 28 - "services"
Cohesion: 0.10
Nodes (14): register(), CacheState, describeFailure(), g, normalizeTorrent(), OnCacheChange, QBittorrentCache, checkCompletedDownloads() (+6 more)

### Community 29 - "settings / support"
Cohesion: 0.11
Nodes (19): DiscordMentionsManager(), MentionItem, parseMentions(), serializeMentions(), SupportCategoriesConfig(), SubTab, SupportManagement(), statusColors (+11 more)

### Community 30 - "user-groups / details"
Cohesion: 0.16
Nodes (23): AddMemberForm(), AddMemberFormProps, GroupEditForm(), GroupEditFormProps, GroupHeader(), GroupHeaderProps, MembersEmpty(), MembersList() (+15 more)

### Community 31 - "Réglages — utilisateurs"
Cohesion: 0.15
Nodes (24): UserManagement(), UserManagementProps, CreateUserModal(), CreateUserModalProps, EMPTY_FORM, NotificationsEditor(), NotificationsEditorProps, ProviderFilterTabs() (+16 more)

### Community 32 - "scripts"
Cohesion: 0.08
Nodes (21): accounts, Json, loggedOut, onyxUser(), startFakeOnyx(), usernameById(), Json, received (+13 more)

### Community 33 - "media / [id]"
Cohesion: 0.14
Nodes (23): addToCalendar(), removeFromCalendar(), MediaActionsRow(), MenuItem(), MobileActionsMenu(), ManageMediaButton(), ManageMediaButtonProps, toggleSubscription() (+15 more)

### Community 34 - "auth / providers"
Cohesion: 0.14
Nodes (20): handler, dynamic, GET(), authOptions, embyProvider, error(), log(), error() (+12 more)

### Community 35 - "MediaCard & listes"
Cohesion: 0.12
Nodes (21): CollectionPage(), InfiniteDiscoverListProps, RecommendationItem, Recommendations(), getFramelessPosterUrl(), getPosterUrl(), TmdbImageSize, MediaCardActions() (+13 more)

### Community 36 - "Service Jellyfin"
Cohesion: 0.10
Nodes (17): getHttpsAgent(), insecureHttpsAgent, KEEP_ALIVE, keepAliveHttpAgent, serverIds, TmdbIndex, tmdbIndexes, error() (+9 more)

### Community 37 - "Navbar"
Cohesion: 0.14
Nodes (19): stopImpersonation(), ImpersonationBannerClient(), Props, NAVIGATION_ITEMS, useNavbarMenus(), UseNavbarMenusResult, Navbar(), NavbarDesktopMenu() (+11 more)

### Community 38 - "downloads / torrent"
Cohesion: 0.15
Nodes (23): ColumnsDropdownProps, TorrentFiltersBarProps, TorrentRowComponent(), TorrentRowProps, VisibleColumns, TorrentRowFooter(), TorrentRowFooterProps, TorrentRowHeader() (+15 more)

### Community 39 - "torrent / filter-modal"
Cohesion: 0.12
Nodes (21): FilterConfigBar(), FilterConfigBarProps, FilterModalFooter(), FilterModalFooterProps, FilterModalHeader(), FilterModalHeaderProps, PeriodSection(), PeriodSectionProps (+13 more)

### Community 40 - "Statistiques"
Cohesion: 0.12
Nodes (22): StatsEmptyState(), StatsEmptyStateProps, StatsHeader(), StatsHeaderProps, PeriodButton(), PeriodButtonProps, StatsPeriodNav(), StatsPeriodNavProps (+14 more)

### Community 41 - "Session & utilisateur courant"
Cohesion: 0.17
Nodes (22): dynamic, GET(), POST(), Params, PATCH(), DELETE(), Params, GET() (+14 more)

### Community 42 - "services"
Cohesion: 0.12
Nodes (27): dynamic, GET(), POST(), getManagerKind(), canInteractiveSearch(), ChosenRelease, grabArrRelease(), grabRelease() (+19 more)

### Community 43 - "Service Plex"
Cohesion: 0.13
Nodes (18): batchProcess(), dynamic, EmbyHistoryItem, error(), JellyfinPlayedItem, log(), PlexHistoryItem, POST() (+10 more)

### Community 44 - "media / [id]"
Cohesion: 0.14
Nodes (23): requestAllSeasons(), requestSelectedSeasons(), PRIMARY_LABEL, RequestStatusButton(), RequestStatusButtonProps, SecondaryButton(), useRequestStatus(), Season (+15 more)

### Community 45 - "Client API centralisé"
Cohesion: 0.10
Nodes (19): adminCall(), OnyxLinkCard(), OnyxServiceCard(), OnyxSettings(), OnyxSettingsProps, OnyxStatus, randomKey(), P1 - Eliminer la dette de typage any (+11 more)

### Community 46 - "dashboard"
Cohesion: 0.14
Nodes (22): DashboardSearchBar(), DashboardSearchBarProps, LibraryStatsCard(), QuickNavCards(), ServerStatusCard(), TransfersCard(), TransfersCardProps, QuickActions() (+14 more)

### Community 47 - "Téléchargements — fichiers"
Cohesion: 0.13
Nodes (22): deleteSmbPath(), FileManagerHeader(), FileManagerHeaderProps, DURATION_OPTIONS, ShareFileModal(), ShareFileModalProps, ShareManagerModal(), ShareManagerModalProps (+14 more)

### Community 48 - "settings / account-requests"
Cohesion: 0.17
Nodes (20): deleteAccountRequestAction(), rejectAccountRequestAction(), ApprovalModal(), ApprovalModalProps, HistoryRequestRow(), HistoryRequestRowProps, HistorySection(), HistorySectionProps (+12 more)

### Community 49 - "settings / storage"
Cohesion: 0.13
Nodes (20): testUnraidDebugAction(), SettingsFormFooter(), SettingsFormFooterProps, initialFormData, useSettingsForm(), SettingsForm(), SettingsFormProps, LegacySmbMigration() (+12 more)

### Community 50 - "lib"
Cohesion: 0.11
Nodes (23): CacheOptions, getDbClient(), invalidateCache(), invalidateTag(), l1, l2Get(), l2Set(), refreshing (+15 more)

### Community 52 - "Recherche Prowlarr (UI)"
Cohesion: 0.13
Nodes (20): SearchModal(), SearchModalProps, ProwlarrEpisode, ProwlarrSeason, buildTvQuery(), ProwlarrBulkBar(), ProwlarrBulkBarProps, ProwlarrFiltersPanel() (+12 more)

### Community 53 - "Réglages — onglets"
Cohesion: 0.18
Nodes (20): SettingsTabButton(), SettingsTabButtonProps, SettingsTabsContent(), SettingsTabsContentProps, SettingsTabsNav(), SettingsTabsNavProps, SettingsTabs(), isSettingsTabId() (+12 more)

### Community 54 - "Notifs — outbox worker"
Cohesion: 0.12
Nodes (10): buildPosterUrl(), globalForWorker, OutboxWorker, claimDueDeliveries(), ClaimResult, EnqueueParams, isEventFullyDispatched(), markDeliveryFailed() (+2 more)

### Community 55 - "Service qBittorrent"
Cohesion: 0.14
Nodes (3): error(), log(), QBittorrentService

### Community 56 - "notifications-v2 / providers"
Cohesion: 0.18
Nodes (20): useNotificationsV2(), assertAdmin(), getDefaultWebhookPayload(), getNotificationsV2Config(), getUsersForNotifications(), pingEvolutionApi(), saveNotificationsV2Config(), testEventNotification() (+12 more)

### Community 57 - "media / [id]"
Cohesion: 0.14
Nodes (19): GET(), MediaType, TmdbCatalogItem, GET(), TmdbGenre, TmdbSeason, dynamic, GET() (+11 more)

### Community 58 - "Téléchargements — torrents"
Cohesion: 0.14
Nodes (18): QbitPanel(), QbitPanelProps, BatchAction, BatchActionsBar(), BatchActionsBarProps, TorrentList(), TorrentListProps, TorrentRow (+10 more)

### Community 59 - "settings / notifications-v2"
Cohesion: 0.17
Nodes (19): EventAccordionItem(), EventAccordionItemProps, EventRouteCard(), EventRouteCardProps, EventRouteConfig, EventRouteConfig, EventsSection(), EventsSectionProps (+11 more)

### Community 60 - "dashboard / stats"
Cohesion: 0.17
Nodes (21): fetchStatsData(), statsResults, fetchOldestWatchEventYear(), fetchProviderIdToLocalUserMap(), fetchUserGroupMap(), fetchWatchHistory(), StatsScopedUser, AggregatedMedia (+13 more)

### Community 61 - "Connexion"
Cohesion: 0.19
Nodes (20): CredentialsForm(), CredentialsFormProps, PlexOAuthButton(), PROVIDER_OPTIONS, ProviderSelector(), ProviderSelectorProps, log(), logError() (+12 more)

### Community 62 - "notifications-v2 / pollers"
Cohesion: 0.11
Nodes (9): DEFAULT_CONFIG, StuckImportConfig, StuckImportDetector, RadarrQueueItem, AddSeriesOptions, SonarrEpisodeFile, SonarrQueueItem, SonarrSeason (+1 more)

### Community 63 - "media / [id]"
Cohesion: 0.17
Nodes (18): ImportProgressList(), SmoothBar(), MovieDownloadProgressProps, MediaDownloadProgressBar(), MediaDownloadProgressBarProps, checkDownloadStatus(), DownloadStatus, error() (+10 more)

### Community 64 - "Média — gestion"
Cohesion: 0.20
Nodes (18): MediaRequestRow(), MediaRequestRowProps, MediaRequestsSection(), MediaRequestsSectionProps, getStatusClasses(), MediaServiceStatusSection(), MediaServiceStatusSectionProps, STATUS_LABELS (+10 more)

### Community 65 - "global / prowlarr"
Cohesion: 0.20
Nodes (19): ProwlarrCategory, ProwlarrIndexer, ProwlarrRelease, ProwlarrSearchSource, ProwlarrSortBy, ProwlarrSortOrder, CATEGORIES, formatSize() (+11 more)

### Community 66 - "notifications-v2 / store"
Cohesion: 0.13
Nodes (20): Dedup atomique via UNIQUE(dedup_key), Retry avec backoff exponentiel, Pipeline de notifications V2, Outbox pattern (livraison fiable), Notifications V2 - Implementation Summary, globalForQbitWatch, WatchEntry, buildDedupKey() (+12 more)

### Community 67 - "lib"
Cohesion: 0.11
Nodes (15): cache, createMemoCache(), load(), MemoCache, MemoCacheOptions, MemoGetOptions, remember(), earliest() (+7 more)

### Community 68 - "scripts"
Cohesion: 0.09
Nodes (19): http-proxy, ACTION_MANIFEST, appProcess, fs, http, httpProxy, isStaleAction(), net (+11 more)

### Community 69 - "Réglages — sauvegardes"
Cohesion: 0.15
Nodes (18): BackupExportCard(), BackupExportCardProps, BackupImportCard(), BackupImportCardProps, PasswordInput(), PasswordInputColor, PasswordInputProps, RING_CLASSES (+10 more)

### Community 70 - "stats / storage"
Cohesion: 0.20
Nodes (17): formatRuntime(), SERIES_STATUS, StorageDetailsHeader(), StorageDetailsHeaderProps, StorageMobileItem(), StorageMobileItemProps, PosterItem, StoragePoster() (+9 more)

### Community 71 - "Notifs — config & destinataires"
Cohesion: 0.15
Nodes (15): CONFIG_KEY, ConfigStore, DEFAULT_CONFIG, mergeWithDefaults(), safeParse(), DispatchResult, NotificationStore, Notify (+7 more)

### Community 72 - "requests / infinite-media"
Cohesion: 0.18
Nodes (16): InfiniteScrollTrigger(), MediaGrid(), MediaGridEmpty(), MediaGridLoading(), MediaGridMoreLoading(), MediaGridProps, withMediaType(), withMediaTypeCache (+8 more)

### Community 73 - "dashboard / settings"
Cohesion: 0.16
Nodes (16): MaintenanceSettings(), Props, ApiResponse, formatBytes(), formatDuration(), Stats, StuckImportsManager(), StuckItem (+8 more)

### Community 74 - "Réglages — notifications"
Cohesion: 0.14
Nodes (15): EvolutionApiSection(), EvolutionApiSectionProps, EvolutionConfig, NotificationsActionsBar(), NotificationsActionsBarProps, Delivery, NotificationEvent, NotificationsDashboard() (+7 more)

### Community 75 - "dashboard / stats"
Cohesion: 0.18
Nodes (15): buildHref(), HistoryItem(), HistoryItemProps, HistoryItemMeta(), HistoryItemMetaProps, HistoryItemThumbnail(), HistoryItemThumbnailProps, TopItemCard() (+7 more)

### Community 76 - "dashboard / stats"
Cohesion: 0.15
Nodes (17): DeleteStorageModalProps, StorageFilterBarProps, BulkDeleteItemStatus, DeleteTarget, SeasonStat, StorageDateFilter, StorageDateFilterMode, StorageFilters (+9 more)

### Community 78 - "Parseur de noms de torrents"
Cohesion: 0.17
Nodes (18): extractAudio(), extractCodec(), extractEpisode(), extractLanguage(), extractPlatform(), extractQuality(), extractReleaseGroup(), extractSeason() (+10 more)

### Community 79 - "dashboard / downloads"
Cohesion: 0.30
Nodes (17): addTorrent(), checkAccess(), deleteStoragePath(), deleteTorrents(), getCategories(), getGlobalStats(), getTags(), getTorrents() (+9 more)

### Community 80 - "downloads / torrent"
Cohesion: 0.15
Nodes (15): AddTorrentModal(), AddTorrentModalProps, DeleteTorrentModal(), DeleteTorrentModalProps, ShareLimitModalProps, ShareLimitType, ShareLimitUnit, FilterModal (+7 more)

### Community 81 - "downloads / torrent"
Cohesion: 0.17
Nodes (14): ColumnsDropdown(), SortDropdown(), SortDropdownProps, StatusFilterRow(), StatusFilterRowProps, TorrentActionBar(), TorrentActionBarProps, TorrentFiltersBar() (+6 more)

### Community 82 - "dashboard / media"
Cohesion: 0.15
Nodes (15): LibraryPage, LibraryProblem, MediaFilterPills(), MediaFilterPillsProps, MediaTypeTabs(), MediaTypeTabsProps, EmptyLibrary(), InfiniteEmbyList() (+7 more)

### Community 83 - "[id] / season"
Cohesion: 0.18
Nodes (17): BUBBLE, DROP_SIZE, LiquidParts, liquidSwitch(), RowLayout, TAIL_SIZES, TAILS, SeasonBubble() (+9 more)

### Community 84 - "requests / list"
Cohesion: 0.16
Nodes (13): MediaPoster(), MediaPosterProps, RequestCard(), RequestCardProps, RequestCardPoster(), RequestCardPosterProps, RequestListItemsProps, PosterUrls (+5 more)

### Community 85 - "settings / system-messages"
Cohesion: 0.16
Nodes (13): BannerMessageSection(), BannerMessageSectionProps, PopupMessageSection(), PopupMessageSectionProps, SaveStatusAlert(), SaveStatusAlertProps, SystemMessageHeader(), SaveStatus (+5 more)

### Community 86 - "downloads / downloads-client"
Cohesion: 0.19
Nodes (13): DownloadsHeader(), DownloadsHeaderProps, ProwlarrPanel(), ProwlarrPanelProps, SmbPanel(), SmbPanelProps, useDownloadsClient(), DownloadsClient() (+5 more)

### Community 87 - "Sessions de lecture en direct"
Cohesion: 0.22
Nodes (12): formatSessionDisplay(), SessionDisplay, LiveSessionCard(), LiveSessionCardProps, LiveSessionsEmpty(), LiveSessionsHeader(), LiveSessionsHeaderProps, InterpolatedSession (+4 more)

### Community 88 - "providers"
Cohesion: 0.17
Nodes (13): bricolage, geistMono, metadata, RootLayout(), DeploymentGuard(), reloadOnce(), Providers(), QueryProvider() (+5 more)

### Community 89 - "Notifs — provider WhatsApp"
Cohesion: 0.19
Nodes (12): EvolutionProvider, isRetryable(), normalizeNumber(), summarizeError(), RetryOptions, sleep(), withRetry(), EvolutionConfig (+4 more)

### Community 90 - "Notifs — moteur de templates"
Cohesion: 0.22
Nodes (11): DEFAULT_TEMPLATES, TemplateVariants, TemplateRenderer, assertEqual(), assertExcludes(), assertIncludes(), payload(), route() (+3 more)

### Community 91 - "tsconfig.json"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 92 - "sync / requests"
Cohesion: 0.20
Nodes (10): dynamic, error(), GET(), log(), warn(), fixMissingTitlesAction(), importJellyseerrRequestsAction(), testJellyseerrConnectionAction() (+2 more)

### Community 93 - "dashboard"
Cohesion: 0.20
Nodes (14): markWelcomeAsSeen(), WelcomePopup(), WelcomePopupProps, loadServerInfo(), ServerInfo, ServerType, useAvailabilityServerName(), useIsOnyxAccount() (+6 more)

### Community 94 - "media / [id]"
Cohesion: 0.25
Nodes (16): checkPermission(), downloadMediaRelease(), downloadTorrent(), error(), getProwlarrIndexers(), getSonarrEpisodes(), searchMediaReleases(), searchProwlarr() (+8 more)

### Community 95 - "settings / linked-accounts"
Cohesion: 0.21
Nodes (13): AddMemberModal(), AddMemberModalProps, CreateGroupForm(), CreateGroupFormProps, GroupCard(), GroupCardProps, LinkedAccounts(), Candidate (+5 more)

### Community 96 - "lib"
Cohesion: 0.18
Nodes (13): SYNC_BUTTONS, SyncButtonConfig, UserSyncButtonsProps, SyncProvider, SourceFilter(), PlexOAuthButtonProps, ServerType, SetupConfigureFormProps (+5 more)

### Community 97 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, babel-plugin-react-compiler, cross-env, drizzle-kit, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 98 - "public / request-access"
Cohesion: 0.14
Nodes (9): dynamic, POST(), requestSchema, SharePage(), ShareClient(), ShareClientProps, accountRequests, config (+1 more)

### Community 99 - "dashboard / dashboard"
Cohesion: 0.23
Nodes (11): DASHBOARD_CARD, DASHBOARD_EYEBROW, LibraryStatsCardProps, LINKS, ServerStatusCardProps, UseDashboardServerStatsResult, StatCard(), StatCardProps (+3 more)

### Community 100 - "media / [id]"
Cohesion: 0.21
Nodes (13): DownloadStatusModal(), DownloadStatusModalProps, NothingDownloading(), MovieDownloadProgress(), SeasonDownloadRow(), SeasonDownloadRowProps, SeasonInfo, StatusBadge() (+5 more)

### Community 101 - "Média — page de détail"
Cohesion: 0.21
Nodes (13): AccessDeniedFallback(), ExternalMediaFallback(), ExternalMediaFallbackProps, dynamic, MediaDetailsPage(), ExternalItemResolution, fetchExternalItem(), isExternalMediaId() (+5 more)

### Community 102 - "stats / storage"
Cohesion: 0.28
Nodes (12): BulkDeleteModal(), BulkDeleteModalProps, StatusIcon(), BulkDeleteResultModal(), BulkDeleteResultModalProps, DeleteStorageModal(), StorageManagerHeader(), StorageManagerHeaderProps (+4 more)

### Community 103 - "stats / storage-manager"
Cohesion: 0.21
Nodes (15): FilterSelect(), FilterSelectOption, FilterSelectProps, ADDED_MODES, chipClass(), ChipLabel(), DateFilterControl(), ModeOption (+7 more)

### Community 104 - "Configuration initiale"
Cohesion: 0.18
Nodes (12): SetupConfigureForm(), SetupModeToggle(), SetupModeToggleProps, SetupRestoreForm(), SetupRestoreFormProps, FormData, ServerType, useSetupForm() (+4 more)

### Community 105 - "lib"
Cohesion: 0.16
Nodes (9): RETRY, strictHttpsAgent, breakers, CircuitBreaker, createAxiosClient(), getKey(), inFlight, isRetryable() (+1 more)

### Community 106 - "Notifs — détection de disponibilité"
Cohesion: 0.15
Nodes (5): startNotificationsV2(), stopNotificationsV2(), AvailabilityPoller, getQbitWatchPoller(), QbitWatchPoller

### Community 108 - "global / navbar"
Cohesion: 0.24
Nodes (11): MediaBackdrop(), MediaBackdropProps, MediaBackLink(), MediaHero(), readOrigin(), subscribe(), useNavigationOrigin(), useStoredNavigationOrigin() (+3 more)

### Community 109 - "dashboard / stats"
Cohesion: 0.20
Nodes (15): EMPTY_PAGINATION, EMPTY_TOTALS, fetchStoragePage(), removeFromPages(), StoragePages, storageQueryKey(), translateStorageError(), useStorageItems() (+7 more)

### Community 110 - "hooks"
Cohesion: 0.20
Nodes (11): DashboardTemplate(), installPhoneTransitionGuard(), dropAnimations(), SupportChatbot(), Category, ChatMessage, Subcategory, useSupportChat() (+3 more)

### Community 111 - "Demande d'accès"
Cohesion: 0.20
Nodes (11): Step1(), Step1Props, FormData, Step2(), Step2Props, Step3(), Step3Props, FormData (+3 more)

### Community 112 - "scripts"
Cohesion: 0.12
Nodes (16): Conteneur docker mediahub-app, Fail2ban sur tous les providers, Jellyfin comme serveur principal, MediaHub (application), Next.js App Router, Docker unique (tracker integre a l'app), Partage SMB, Gestion du stockage (+8 more)

### Community 113 - "integrations"
Cohesion: 0.22
Nodes (12): dynamic, FEATURES, GET(), dynamic, POST(), deliverOnyxEvent(), DeliveryResult, getOnyxWebhookTarget() (+4 more)

### Community 114 - "downloads / file-manager"
Cohesion: 0.23
Nodes (11): DeleteFileModal(), DeleteFileModalProps, FileManagerRow(), FileManagerRowProps, formatFileSize(), FileManagerTable(), FileManagerTableProps, devLog() (+3 more)

### Community 115 - "media / [id]"
Cohesion: 0.18
Nodes (12): CastList(), CastListProps, CastMember, MediaCastSection(), MediaCastSectionProps, CastMember, CrewMember, DEPT_TRANSLATIONS (+4 more)

### Community 116 - "storage / details"
Cohesion: 0.27
Nodes (11): SeasonsSection(), SeasonsSectionProps, StorageDetailsFooter(), StorageDetailsFooterProps, UserActivitySection(), UserActivitySectionProps, StorageDetailsModal(), StorageDetailsModalProps (+3 more)

### Community 117 - "lib"
Cohesion: 0.24
Nodes (12): PREVIEWS, ThemeSwitcher(), ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), DEFAULT_THEME, isThemeId() (+4 more)

### Community 118 - "Mise à jour système"
Cohesion: 0.23
Nodes (4): clearUpdateNotifications(), followsBranchTag(), SystemUpdateService, VersionService

### Community 119 - "Service SMB"
Cohesion: 0.30
Nodes (3): testSmbConnection(), devError(), SmbService

### Community 120 - "[id] / page"
Cohesion: 0.23
Nodes (10): MediaAvailabilityBadges(), MediaAvailabilityBadgesProps, MediaPageContent(), MediaPageContentProps, MediaPrimaryActions(), MediaPrimaryActionsProps, MediaTitleHeader(), TrailerButton() (+2 more)

### Community 121 - "Service Prowlarr"
Cohesion: 0.27
Nodes (6): error(), IndexerField, log(), ProwlarrIndexer, ProwlarrService, warn()

### Community 122 - "image / [id]"
Cohesion: 0.24
Nodes (10): dynamic, POST(), embyToTmdbCache, error(), GET(), log(), tmdbPosterCache, warn() (+2 more)

### Community 123 - "lib"
Cohesion: 0.22
Nodes (11): Context, GET(), posters, SIZES, extend(), frameThickness(), lineStats(), Pixels (+3 more)

### Community 124 - "services"
Cohesion: 0.18
Nodes (10): GET(), getStorageServiceForUser(), FileInfo, getFtpService(), warn(), FileInfo, getLocalService(), getSmbService() (+2 more)

### Community 125 - "dashboard / downloads"
Cohesion: 0.32
Nodes (9): TorrentStatsBar(), TorrentStatsBarProps, TorrentStats(), GlobalStats, QUERY_KEY, useGlobalStats(), formatRatio(), formatStatsSize() (+1 more)

### Community 126 - "[id] / page"
Cohesion: 0.26
Nodes (9): MediaActionsRowProps, MediaRelatedSliders(), MediaRelatedSlidersProps, MediaTitleHeaderProps, MediaSearchParams, MediaType, NormalizedCastMember, NormalizedCrewMember (+1 more)

### Community 127 - "[id] / page"
Cohesion: 0.23
Nodes (9): MediaCollection, MediaCollectionCard(), MediaCollectionCardProps, MediaInfoTable(), MediaInfoTableProps, MediaSidebar(), MediaSidebarProps, MediaWatchProviders() (+1 more)

### Community 128 - "scripts"
Cohesion: 0.22
Nodes (11): DATABASE_URL, entrypoint.sh script, collectRuntimeOrigins(), CONFIG_FILE, fs, main(), mergeOrigins(), patchRequiredServerFiles() (+3 more)

### Community 129 - "notifications-v2"
Cohesion: 0.18
Nodes (5): cryptoRandomId(), globalForBus, Handler, notificationBus, NotificationEventBus

### Community 130 - "Service Unraid"
Cohesion: 0.27
Nodes (7): checkServicesHealth(), execPromise, getDashboardStats(), testUnraidConnection(), error(), useDashboardServerStats(), UnraidService

### Community 131 - "media / [id]"
Cohesion: 0.23
Nodes (10): UserActivityButton(), UserActivityButtonProps, ItemDetails, QUERY_KEY(), SeasonDetail, SeasonStat, useUserActivity(), UseUserActivityResult (+2 more)

### Community 132 - "requests / infinite-media"
Cohesion: 0.27
Nodes (10): buildURLParams(), getCacheKey(), loadScrollCache(), parseFiltersFromURL(), saveScrollCache(), ScrollCache, useInfiniteMedia(), mapGenres() (+2 more)

### Community 133 - "dashboard / stats"
Cohesion: 0.32
Nodes (9): RecentHistory(), RecentHistoryProps, resolveSocketUrl(), useHistorySocket(), UseHistorySocketResult, compareHistoryItems(), compareHistoryItemsNewestLive(), processHistoryItem() (+1 more)

### Community 134 - "login"
Cohesion: 0.27
Nodes (9): checkPlexAuthPin(), getPlexAuthPin(), startOnyxPairing(), OnyxLoginPanel(), Step, logError(), usePlexOAuth(), UsePlexOAuthResult (+1 more)

### Community 135 - "Service FTP"
Cohesion: 0.36
Nodes (3): error(), FtpService, log()

### Community 136 - "services"
Cohesion: 0.21
Nodes (7): ContainerUpdateStatus, docker, globalForCache, SystemUpdateStatus, ChangelogCategory, ChangelogVersion, dockerode

### Community 137 - "webhooks / sorraa"
Cohesion: 0.29
Nodes (9): dynamic, POST(), SorraaWebhookPayload, syncRequestStatuses(), stateToRequestStatus(), SorraaRequestState, signSorraaDelivery(), SORRAA_TIMESTAMP_TOLERANCE_S (+1 more)

### Community 138 - "[id] /  services"
Cohesion: 0.22
Nodes (10): EmbyApiEpisode, EmbyApiItem, EMPTY_PROGRESS, errorLog(), fetchMediaEmbyProgress(), log(), MediaEmbyProgress, SeasonProgressEntry (+2 more)

### Community 139 - "dashboard / stats"
Cohesion: 0.25
Nodes (8): ActivityChartProps, ActivityChart, ActivityData, StatsCharts(), StatsChartsProps, UserStat, StatsDataResult, recharts

### Community 140 - "dashboard / recent-requests"
Cohesion: 0.31
Nodes (7): getStatusIcon(), getStatusText(), RequestStatusBadge(), RequestStatusBadgeProps, DOTS, MediaCardStatusProps, formatReleaseDate()

### Community 142 - "[id] / page"
Cohesion: 0.29
Nodes (7): MediaCrewGrid(), MediaCrewGridProps, MediaKeyword, MediaKeywords(), MediaKeywordsProps, MediaOverviewSection(), MediaOverviewSectionProps

### Community 143 - "scripts"
Cohesion: 0.36
Nodes (8): cleanEndpointsConfig(), dockerAPI(), fs, http, log(), recreate(), safelyDeleteOldImage(), sleep()

### Community 144 - "media / [id]"
Cohesion: 0.39
Nodes (7): loadMediaPageData(), MediaPageDataResult, getSubscriptionStatus(), MediaDerivedMeta, normalizeCredits(), deriveMediaMeta(), isInWatchLater()

### Community 145 - "stats / me"
Cohesion: 0.33
Nodes (8): dynamic, PeriodButton(), sanitizePlaybackDuration(), SourceBadge(), StatCard(), UserStatsPage(), UserStatsPageProps, WatchHistoryItem

### Community 146 - "providers"
Cohesion: 0.31
Nodes (5): NavbarUserMenuProps, AbilityContext, Can, AppAbility, @casl/react

### Community 147 - "global / navbar"
Cohesion: 0.36
Nodes (7): NotificationItem, useNotifications(), UseNotificationsResult, formatTimeAgo(), NOTIFICATION_ICONS, NotificationBell(), InternalNotificationType

### Community 148 - "global"
Cohesion: 0.43
Nodes (5): DashboardLayout(), dynamic, getDashboardConfig, IntentPrefetch(), SystemMessageDisplay()

### Community 149 - "dashboard / notifications"
Cohesion: 0.50
Nodes (5): NotificationItem(), NotificationItemProps, Notification, useNotifications(), NotificationsPage()

### Community 150 - "types"
Cohesion: 0.25
Nodes (7): EmbyItem, EmbyMediaSource, EmbyMediaStream, EmbyNowPlayingItem, EmbyProviderIds, EmbySession, EmbyUserData

### Community 151 - "dashboard / settings"
Cohesion: 0.43
Nodes (6): testProwlarrConnectionAction(), testQBittorrentConnectionAction(), testSorraaConnectionAction(), DownloadSettings(), Props, TestResult

### Community 152 - "login"
Cohesion: 0.43
Nodes (5): SystemMessageBanner(), logError(), SystemMessageBanner, useSystemMessageBanner(), UseSystemMessageBannerResult

### Community 153 - "roles / default"
Cohesion: 0.47
Nodes (5): dynamic, error(), log(), POST(), warn()

### Community 154 - "user / candidates"
Cohesion: 0.47
Nodes (5): dynamic, error(), GET(), log(), warn()

### Community 155 - "dashboard / downloads"
Cohesion: 0.60
Nodes (5): testEmbyConnection(), testJellyfinConnection(), testPlexConnection(), importPlexHistoryAction(), useMediaSettingsTests()

### Community 156 - "types"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 157 - "support / upload"
Cohesion: 0.70
Nodes (4): GET(), getUploadDir(), POST(), resolveDbPath()

### Community 158 - "scripts"
Cohesion: 0.60
Nodes (3): getSetting(), main(), mapLimit()

### Community 160 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Ambiguous Edges - Review These
- `MediaHub (application)` → `Chatbot de support (en test)`  [AMBIGUOUS]
  CHANGELOG.md · relation: has_feature

## Knowledge Gaps
- **35 isolated node(s):** `DATABASE_URL`, `pg`, `tsx`, `@tailwindcss/postcss`, `@types/archiver` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 930 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `settings / support` to `Schéma DB Drizzle`, `Dashboard — accueil`, `global`, `Demandes — liste`, `dashboard / settings`, `Réglages — rôles`, `Calendrier des sorties`, `global / media-filters`, `Connexion DB & auth`, `settings / media`, `media / [id]`, `drizzle.config.ts`, `user-groups / details`, `Réglages — utilisateurs`, `media / [id]`, `auth / providers`, `MediaCard & listes`, `Navbar`, `downloads / torrent`, `torrent / filter-modal`, `Statistiques`, `Session & utilisateur courant`, `media / [id]`, `Client API centralisé`, `dashboard`, `Téléchargements — fichiers`, `settings / account-requests`, `settings / storage`, `Recherche Prowlarr (UI)`, `Réglages — onglets`, `notifications-v2 / providers`, `Téléchargements — torrents`, `settings / notifications-v2`, `Connexion`, `media / [id]`, `Média — gestion`, `global / prowlarr`, `Réglages — sauvegardes`, `stats / storage`, `requests / infinite-media`, `dashboard / settings`, `Réglages — notifications`, `dashboard / stats`, `dashboard / stats`, `downloads / torrent`, `downloads / torrent`, `dashboard / media`, `[id] / season`, `requests / list`, `settings / system-messages`, `downloads / downloads-client`, `Sessions de lecture en direct`, `providers`, `dashboard`, `media / [id]`, `settings / linked-accounts`, `lib`, `public / request-access`, `dashboard / dashboard`, `stats / storage`, `stats / storage-manager`, `Configuration initiale`, `global / navbar`, `dashboard / stats`, `hooks`, `Demande d'accès`, `downloads / file-manager`, `media / [id]`, `lib`, `[id] / page`, `Service Unraid`, `media / [id]`, `requests / infinite-media`, `dashboard / stats`, `login`, `dashboard / stats`, `stats / me`, `providers`, `global / navbar`, `global`, `dashboard / notifications`, `dashboard / settings`, `login`, `dashboard / downloads`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **What connects `DATABASE_URL`, `pg`, `tsx` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `services` be split into smaller, more focused modules?**
  _Cohesion score 0.06007480130902291 - nodes in this community are weakly interconnected._
- **Why does `next` connect `public / request-access` to `services`, `Schéma DB Drizzle`, `Dashboard — accueil`, `Logger & services partagés`, `Notifications internes (cloche)`, `requests / infinite-media`, `Cache liste de stockage`, `Demandes — liste`, `login`, `admin / users`, `integrations`, `webhooks / sorraa`, `dashboard / stats`, `Calendrier des sorties`, `Notifs — dispatcher`, `Permissions CASL`, `downloads / [hash]`, `[id] / page`, `Connexion DB & auth`, `stats / me`, `global`, `dashboard / notifications`, `services`, `providers`, `dashboard / media`, `roles / default`, `user / candidates`, `global`, `global / navbar`, `support / upload`, `drizzle.config.ts`, `Réglages — utilisateurs`, `next.config.ts`, `auth / providers`, `MediaCard & listes`, `Navbar`, `downloads / torrent`, `Statistiques`, `Session & utilisateur courant`, `services`, `Service Plex`, `media / [id]`, `dashboard`, `settings / storage`, `Réglages — onglets`, `media / [id]`, `Connexion`, `Média — gestion`, `Réglages — sauvegardes`, `requests / infinite-media`, `dashboard / stats`, `dashboard / downloads`, `downloads / torrent`, `dashboard / media`, `[id] / season`, `requests / list`, `downloads / downloads-client`, `Sessions de lecture en direct`, `providers`, `sync / requests`, `dashboard`, `lib`, `dashboard / dashboard`, `Média — page de détail`, `Configuration initiale`, `global / navbar`, `dashboard / stats`, `hooks`, `Demande d'accès`, `integrations`, `media / [id]`, `image / [id]`, `lib`, `[id] / page`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Should `Schéma DB Drizzle` be split into smaller, more focused modules?**
  _Cohesion score 0.04329004329004329 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `torrent / filter-modal` to `Dashboard — accueil`, `media / [id]`, `dashboard / stats`, `Demandes — liste`, `dashboard / settings`, `Réglages — rôles`, `dashboard / recent-requests`, `dashboard / stats`, `Calendrier des sorties`, `Permissions CASL`, `downloads / [hash]`, `global / media-filters`, `stats / me`, `settings / media`, `providers`, `dashboard / notifications`, `global / navbar`, `media / [id]`, `dashboard / settings`, `login`, `global`, `drizzle.config.ts`, `settings / support`, `user-groups / details`, `Réglages — utilisateurs`, `media / [id]`, `MediaCard & listes`, `Navbar`, `downloads / torrent`, `Statistiques`, `media / [id]`, `Client API centralisé`, `dashboard`, `settings / account-requests`, `settings / storage`, `Recherche Prowlarr (UI)`, `Réglages — onglets`, `Téléchargements — torrents`, `settings / notifications-v2`, `Connexion`, `media / [id]`, `Média — gestion`, `global / prowlarr`, `Réglages — sauvegardes`, `stats / storage`, `requests / infinite-media`, `dashboard / settings`, `Réglages — notifications`, `dashboard / stats`, `dashboard / stats`, `downloads / torrent`, `downloads / torrent`, `dashboard / media`, `[id] / season`, `requests / list`, `settings / system-messages`, `downloads / downloads-client`, `Sessions de lecture en direct`, `dashboard`, `settings / linked-accounts`, `lib`, `dashboard / dashboard`, `media / [id]`, `stats / storage`, `stats / storage-manager`, `Configuration initiale`, `global / navbar`, `hooks`, `Demande d'accès`, `media / [id]`, `storage / details`, `lib`, `[id] / page`, `dashboard / downloads`, `[id] / page`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `MediaHub (application)` and `Chatbot de support (en test)`?**
  _Edge tagged AMBIGUOUS (relation: has_feature) - confidence is low._