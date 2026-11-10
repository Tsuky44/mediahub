# Graph Report - next-app  (2026-11-03)

## Corpus Check
- 718 files · ~293,322 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .css 4, (none) 3, .ico 1)

## Summary
- 3836 nodes · 10917 edges · 159 communities (143 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fd166f9e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- defineAbilityFor
- item-viewing-stats.ts
- logger.ts
- auth/index.ts
- storage.ts
- schema.ts
- ProwlarrSearch.tsx
- onyx-link/route.ts
- outbox-worker.ts
- RoleEditor.tsx
- media/actions.ts
- AccountRequest
- player-v1.ts
- EmbyService
- dashboard-actions.ts
- _utils/activity-logs.ts
- group-actions.ts
- MotionDirector.tsx
- getRealUser
- next
- LoginForm.tsx
- download-status-actions.ts
- MediaPrimaryActions.tsx
- file-actions.ts
- interactive-search.ts
- UserManagement.tsx
- services/sonarr.ts
- services/sorraa.ts
- storage-list.ts
- getCurrentUser
- getSetting
- Torrent
- onyx/route.ts
- SeasonList.tsx
- onyx-link/route.ts
- compilerOptions
- MediaCard.tsx
- Changelog
- torrent/FilterModal.tsx
- StorageFilterBar.tsx
- [hash]/actions.ts
- SettingsTabsContent.tsx
- SonarrService
- QBittorrentService
- HistoryItem.tsx
- template-renderer.ts
- StorageItem
- internal.ts
- ManageMediaModal.tsx
- notifications-v2-actions.ts
- SupportCategoriesConfig.tsx
- TorrentModals.tsx
- MediaPageContent.tsx
- NotificationItem.tsx
- SettingsFormData
- BackupManagement.tsx
- cn
- MediaActionsRow.tsx
- QuickActions.tsx
- StorageSettings.tsx
- fetch-stats-data.ts
- Navbar.tsx
- stats-scheduler.ts
- media-status.ts
- emby-tracker.ts
- downloads/actions.ts
- TorrentFiltersBar.tsx
- settings.ts
- RequestItem.tsx
- formatReleaseDate
- onyx.tsx
- RequestCard.tsx
- SystemMessageManagement.tsx
- StorageManager.tsx
- @tanstack/react-query
- SetupForm.tsx
- media-filters-options.ts
- TorrentManager.tsx
- LiveSessions.tsx
- evolution-provider.ts
- sync-plugin/route.ts
- DownloadStatusModal.tsx
- useNavigationOrigin.ts
- SeasonList.tsx
- InfiniteRequestList.tsx
- list/actions.ts
- LinkedAccounts.tsx
- StatsHeader.tsx
- TmdbService
- external-item-resolver.ts
- [file]/route.ts
- media-server-brand.ts
- getMediaAvailability
- useStorageItems.ts
- ThemeProvider.tsx
- QBittorrentCache
- RadarrService
- SmbService
- SorraaService
- download-managers/sorraa.ts
- _components/types.ts
- request-access/page.tsx
- What was implemented
- stats/page.tsx
- sync-plugin/route.ts
- FileManager.tsx
- TorrentStatsBar.tsx
- MediaCastSection.tsx
- media-page-data.ts
- logger.ts
- media/page.tsx
- start-all.js
- dependencies
- MediaSidebar.tsx
- cache-service.ts
- InfiniteMediaList.tsx
- useInfiniteMedia.ts
- NotificationBell.tsx
- radarr.ts
- useUserActivity.ts
- dashboard/page.tsx
- dashboard/layout.tsx
- perf-mode.ts
- FtpService
- login/actions.ts
- SystemMessageBanner.tsx
- service-factories.ts
- getTmdbService
- useSystemUpdate.ts
- package.json
- ShareManagerModal.tsx
- OutboxWorker
- services/emby.ts
- MediaSyncService
- OnyxDirectory
- MediaOverviewSection.tsx
- settings/page.tsx
- SwrCache
- QbitWatchPoller
- patch-allowed-origins.js
- watch-sync.ts
- template.tsx
- StatsCharts.tsx
- me/page.tsx
- .getPlaybackReportingStats
- backfill-last-played.ts
- LocalService
- recreate-containers.js
- OnyxSettings.tsx
- useMediaSettingsTests.ts
- next-auth.d.ts
- scripts
- next.config.ts
- README.md
- scripts/verify-sorraa.ts
- postcss.config.mjs
- window.d.ts

## God Nodes (most connected - your core abstractions)
1. `lucide-react` - 232 edges
2. `react` - 189 edges
3. `next` - 172 edges
4. `getCurrentUser()` - 102 edges
5. `db` - 100 edges
6. `drizzle-orm` - 98 edges
7. `getSession` - 86 edges
8. `defineAbilityFor()` - 77 edges
9. `EmbyService` - 77 edges
10. `logger` - 57 edges

## Surprising Connections (you probably didn't know these)
- `7. Updated Pollers` --references--> `seedExistingEvents()`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/notifications-v2/store/event-store.ts
- `Côté serveur` --references--> `isInWatchLater()`  [INFERRED]
  PERFORMANCE.md → app/dashboard/media/watch-later-actions.ts
- `Côté serveur` --references--> `getCurrentUser()`  [INFERRED]
  PERFORMANCE.md → lib/auth/index.ts
- `Côté serveur` --references--> `createAxiosClient()`  [INFERRED]
  PERFORMANCE.md → lib/http-client.ts
- `5. Updated Bootstrap` --references--> `OutboxWorker`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/notifications-v2/outbox/outbox-worker.ts

## Import Cycles
- None detected.

## Communities (159 total, 16 thin omitted)

### Community 0 - "defineAbilityFor"
Cohesion: 0.11
Nodes (22): GET(), GET(), POST(), GET(), DownloadsPage(), log(), InfiniteDiscoverList(), InfiniteDiscoverListProps (+14 more)

### Community 1 - "item-viewing-stats.ts"
Cohesion: 0.13
Nodes (28): dynamic, maxDuration, POST(), dynamic, GET(), toMediaInfo(), yearOf(), dynamic (+20 more)

### Community 2 - "logger.ts"
Cohesion: 0.05
Nodes (56): globalForV2, startNotificationsV2(), stopNotificationsV2(), CONFIG_KEY, ConfigStore, DEFAULT_CONFIG, mergeWithDefaults(), safeParse() (+48 more)

### Community 3 - "auth/index.ts"
Cohesion: 0.13
Nodes (9): handler, authOptions, embyProvider, jellyfinProvider, localProvider, plexProvider, roles, config (+1 more)

### Community 4 - "storage.ts"
Cohesion: 0.30
Nodes (10): SeasonsSection(), SeasonsSectionProps, StorageDetailsFooter(), StorageDetailsFooterProps, UserActivitySection(), UserActivitySectionProps, StorageDetailsModal(), StorageDetailsModalProps (+2 more)

### Community 5 - "schema.ts"
Cohesion: 0.03
Nodes (86): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+78 more)

### Community 6 - "ProwlarrSearch.tsx"
Cohesion: 0.06
Nodes (61): DownloadsHeader(), DownloadsHeaderProps, ProwlarrPanel(), ProwlarrPanelProps, SmbPanel(), useDownloadsClient(), DownloadsClient(), DownloadsPermissions (+53 more)

### Community 7 - "onyx-link/route.ts"
Cohesion: 0.20
Nodes (20): dynamic, GET(), publicOrigin(), clientIp(), DELETE(), GET(), POST(), findUserByOnyxId() (+12 more)

### Community 8 - "outbox-worker.ts"
Cohesion: 0.21
Nodes (12): buildPosterUrl(), globalForWorker, ClaimResult, enqueueDelivery(), EnqueueParams, isEventFullyDispatched(), markDeliveryFailed(), markDeliverySent() (+4 more)

### Community 9 - "RoleEditor.tsx"
Cohesion: 0.08
Nodes (38): startImpersonation(), stopImpersonation(), RoleEditor(), RoleEditorProps, RoleManagement(), DefaultRoleSelector(), DefaultRoleSelectorProps, PermissionCheckbox() (+30 more)

### Community 10 - "media/actions.ts"
Cohesion: 0.10
Nodes (30): classifyLibraryError(), error(), fetchEmbyMedia(), fetchOnyxMedia(), fetchRecentlyWatchedItems(), fetchServerTrends(), fetchUserRecommendations(), getSeriesTmdbId() (+22 more)

### Community 11 - "AccountRequest"
Cohesion: 0.19
Nodes (17): ApprovalModal(), ApprovalModalProps, HistoryRequestRow(), HistoryRequestRowProps, HistorySection(), HistorySectionProps, PendingRequestCard(), PendingRequestCardProps (+9 more)

### Community 12 - "player-v1.ts"
Cohesion: 0.07
Nodes (59): dynamic, FEATURES, GET(), dynamic, GET(), Context, DELETE(), dynamic (+51 more)

### Community 14 - "dashboard-actions.ts"
Cohesion: 0.17
Nodes (13): checkServicesHealth(), execPromise, getDashboardStats(), MediaRequestLite, readLibraryStats(), TmdbSearchItem, testUnraidConnection(), error() (+5 more)

### Community 15 - "_utils/activity-logs.ts"
Cohesion: 0.09
Nodes (41): getActivityLogs(), getLogUsers(), importPastRequestsIntoLogs(), ActivityLogRow(), ActivityLogRowProps, ActivityLogsPagination(), ActivityLogsPaginationProps, ActivityLogsTable() (+33 more)

### Community 16 - "group-actions.ts"
Cohesion: 0.16
Nodes (22): AddMemberForm(), AddMemberFormProps, GroupEditForm(), GroupEditFormProps, GroupHeader(), GroupHeaderProps, MembersEmpty(), MembersList() (+14 more)

### Community 17 - "MotionDirector.tsx"
Cohesion: 0.10
Nodes (45): arrived(), BACKDROP, backdropHeight(), backdropImage(), calm(), clearNav(), clearNavLater(), depth() (+37 more)

### Community 18 - "getRealUser"
Cohesion: 0.08
Nodes (29): DELETE(), dynamic, GET(), PUT(), revalidate, dynamic, GET(), POST() (+21 more)

### Community 19 - "next"
Cohesion: 0.07
Nodes (49): dynamic, dynamic, GET(), POST(), dynamic, GET(), POST(), dynamic (+41 more)

### Community 20 - "LoginForm.tsx"
Cohesion: 0.17
Nodes (22): CredentialsForm(), CredentialsFormProps, PlexOAuthButton(), PlexOAuthButtonProps, PROVIDER_OPTIONS, ProviderSelector(), ProviderSelectorProps, log() (+14 more)

### Community 21 - "download-status-actions.ts"
Cohesion: 0.23
Nodes (18): DELETE(), checkDownloadStatus(), error(), formatBytes(), formatSpeed(), formatTime(), log(), SeasonInfo (+10 more)

### Community 22 - "MediaPrimaryActions.tsx"
Cohesion: 0.19
Nodes (14): markWelcomeAsSeen(), WelcomePopup(), WelcomePopupProps, loadServerInfo(), ServerInfo, ServerType, useIsOnyxAccount(), useMediaServerType() (+6 more)

### Community 23 - "file-actions.ts"
Cohesion: 0.16
Nodes (14): DeleteFileModalProps, FileManagerHeaderProps, FileManagerRow(), FileManagerRowProps, formatFileSize(), FileManagerTable(), FileManagerTableProps, DURATION_OPTIONS (+6 more)

### Community 24 - "interactive-search.ts"
Cohesion: 0.11
Nodes (29): dynamic, GET(), parseNumber(), parseTarget(), POST(), getManagerKind(), canInteractiveSearch(), ChosenRelease (+21 more)

### Community 25 - "UserManagement.tsx"
Cohesion: 0.18
Nodes (21): UserManagement(), UserManagementProps, CreateUserModal(), CreateUserModalProps, EMPTY_FORM, NotificationsEditor(), NotificationsEditorProps, ProviderFilterTabs() (+13 more)

### Community 26 - "services/sonarr.ts"
Cohesion: 0.09
Nodes (19): CACHE_TTL, DB, IS_DEV, MS, PAGING, RETRY, THROTTLE, TIMEOUT (+11 more)

### Community 27 - "services/sorraa.ts"
Cohesion: 0.13
Nodes (19): SorraaWebhookPayload, ageInDays(), describeRejection(), mb(), releaseFromSorraa(), ReleaseUnitTarget, SorraaAvailability, SorraaFoundRelease (+11 more)

### Community 28 - "storage-list.ts"
Cohesion: 0.10
Nodes (41): dynamic, error(), GET(), log(), maxDuration, parseSort(), VALID_SORT_DIRS, VALID_SORT_KEYS (+33 more)

### Community 29 - "getCurrentUser"
Cohesion: 0.09
Nodes (31): dynamic, POST(), requestSchema, dynamic, error(), GET(), log(), approveAccountRequestAction() (+23 more)

### Community 30 - "getSetting"
Cohesion: 0.39
Nodes (7): embyToTmdbCache, error(), GET(), log(), tmdbPosterCache, warn(), getMediaServerServiceForUser()

### Community 31 - "Torrent"
Cohesion: 0.16
Nodes (21): TorrentFiltersBarProps, TorrentRowComponent(), TorrentRowProps, VisibleColumns, TorrentRowFooter(), TorrentRowFooterProps, TorrentRowHeader(), TorrentRowHeaderProps (+13 more)

### Community 32 - "onyx/route.ts"
Cohesion: 0.12
Nodes (27): dynamic, GET(), hintOf(), linkOnyx(), newKey(), POST(), requireAdmin(), rotateKey() (+19 more)

### Community 33 - "SeasonList.tsx"
Cohesion: 0.12
Nodes (28): getSeasonDetails(), requestSeason(), SearchActions(), SearchActionsProps, EpisodeCard(), EpisodeCardProps, EpisodeSkeleton(), SeasonEpisodes() (+20 more)

### Community 34 - "onyx-link/route.ts"
Cohesion: 0.25
Nodes (16): ONYX_OTP_REQUIRED, ONYX_PAIRING_PENDING, onyxProvider, failure(), OnyxAuthError, onyxDevicePoll(), onyxDeviceStart(), onyxLogin() (+8 more)

### Community 35 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 36 - "MediaCard.tsx"
Cohesion: 0.13
Nodes (20): CollectionPage(), dynamic, SimilarPage(), getFramelessPosterUrl(), getPosterUrl(), TmdbImageSize, MediaCardActions(), MediaCardActionsProps (+12 more)

### Community 37 - "Changelog"
Cohesion: 0.10
Nodes (19): [0.9.60] - 2026-06-10, [0.9.676] - 2026-07-07, [0.9.677] - 2026-07-07, [0.9.678] - 2026-07-08, [0.9.680] - 2026-07-09, [0.9.683] - 2026-07-10, Added, Added (+11 more)

### Community 38 - "torrent/FilterModal.tsx"
Cohesion: 0.12
Nodes (20): FilterConfigBar(), FilterConfigBarProps, FilterModalFooter(), FilterModalFooterProps, FilterModalHeader(), FilterModalHeaderProps, PeriodSection(), PeriodSectionProps (+12 more)

### Community 39 - "StorageFilterBar.tsx"
Cohesion: 0.11
Nodes (26): FilterSelect(), FilterSelectOption, FilterSelectProps, ADDED_MODES, chipClass(), ChipLabel(), DateFilterControl(), ModeOption (+18 more)

### Community 40 - "[hash]/actions.ts"
Cohesion: 0.06
Nodes (57): EnrichedTorrentInfo, error(), fetchRelatedRequests(), fetchTMDBInfo(), findIndexerIdForTracker(), formatBytes(), formatSpeed(), getProwlarrIndexersMap() (+49 more)

### Community 41 - "SettingsTabsContent.tsx"
Cohesion: 0.18
Nodes (20): SettingsTabButton(), SettingsTabButtonProps, SettingsTabsContent(), SettingsTabsContentProps, SettingsTabsNav(), SettingsTabsNavProps, UserGroupManagement(), isSettingsTabId() (+12 more)

### Community 43 - "QBittorrentService"
Cohesion: 0.14
Nodes (3): error(), log(), QBittorrentService

### Community 44 - "HistoryItem.tsx"
Cohesion: 0.20
Nodes (17): buildHref(), HistoryItem(), HistoryItemProps, HistoryItemMeta(), HistoryItemMetaProps, HistoryItemThumbnail(), HistoryItemThumbnailProps, RecentHistory() (+9 more)

### Community 45 - "template-renderer.ts"
Cohesion: 0.21
Nodes (11): DEFAULT_TEMPLATES, TemplateVariants, TemplateRenderer, assertEqual(), assertExcludes(), assertIncludes(), payload(), route() (+3 more)

### Community 46 - "StorageItem"
Cohesion: 0.18
Nodes (18): BulkDeleteModalProps, formatRuntime(), SERIES_STATUS, StorageDetailsHeader(), StorageDetailsHeaderProps, StorageMobileItemProps, PosterItem, StoragePoster() (+10 more)

### Community 47 - "internal.ts"
Cohesion: 0.11
Nodes (18): dynamic, GET(), POST(), clearUpdateNotifications(), createInternalNotification(), createMediaAvailableNotification(), CreateNotificationInput, createTicketNotification() (+10 more)

### Community 48 - "ManageMediaModal.tsx"
Cohesion: 0.20
Nodes (18): MediaRequestRow(), MediaRequestRowProps, MediaRequestsSection(), MediaRequestsSectionProps, getStatusClasses(), MediaServiceStatusSection(), MediaServiceStatusSectionProps, STATUS_LABELS (+10 more)

### Community 49 - "notifications-v2-actions.ts"
Cohesion: 0.05
Nodes (57): EventAccordionItem(), EventAccordionItemProps, EventRouteCard(), EventRouteCardProps, EventRouteConfig, EventRouteConfig, EventsSection(), EventsSectionProps (+49 more)

### Community 50 - "SupportCategoriesConfig.tsx"
Cohesion: 0.11
Nodes (19): DiscordMentionsManager(), MentionItem, parseMentions(), serializeMentions(), SupportCategoriesConfig(), SubTab, SupportManagement(), statusColors (+11 more)

### Community 51 - "TorrentModals.tsx"
Cohesion: 0.14
Nodes (16): AddTorrentModal(), DeleteTorrentModal(), DeleteTorrentModalProps, SearchModal(), SearchModalProps, ShareLimitModalProps, ShareLimitType, ShareLimitUnit (+8 more)

### Community 52 - "MediaPageContent.tsx"
Cohesion: 0.21
Nodes (12): MediaActionsRowProps, MediaAvailabilityBadges(), MediaAvailabilityBadgesProps, MediaPageContentProps, MediaPrimaryActionsProps, MediaRelatedSliders(), MediaRelatedSlidersProps, MediaTitleHeader() (+4 more)

### Community 53 - "NotificationItem.tsx"
Cohesion: 0.50
Nodes (5): NotificationItem(), NotificationItemProps, Notification, useNotifications(), NotificationsPage()

### Community 54 - "SettingsFormData"
Cohesion: 0.25
Nodes (18): Props, EmbySettings(), EmbySettingsProps, JellyfinSettings(), JellyfinSettingsProps, LibrarySourceSettings(), LocalAuthSection(), PlexSettings() (+10 more)

### Community 55 - "BackupManagement.tsx"
Cohesion: 0.15
Nodes (18): BackupExportCard(), BackupExportCardProps, BackupImportCard(), BackupImportCardProps, PasswordInput(), PasswordInputColor, PasswordInputProps, RING_CLASSES (+10 more)

### Community 56 - "cn"
Cohesion: 0.11
Nodes (30): backdropUrlOf(), CalendarEvent, error(), getCalendarEvents(), log(), RadarrCalendarMovie, SonarrCalendarEpisode, TmdbEpisode (+22 more)

### Community 57 - "MediaActionsRow.tsx"
Cohesion: 0.12
Nodes (24): addToCalendar(), removeFromCalendar(), MediaActionsRow(), MenuItem(), MobileActionsMenu(), FavoriteButton(), FavoriteButtonProps, ManageMediaButton() (+16 more)

### Community 58 - "QuickActions.tsx"
Cohesion: 0.10
Nodes (33): DASHBOARD_CARD, DASHBOARD_EYEBROW, DashboardSearchBar(), DashboardSearchBarProps, LibraryStatsCard(), LibraryStatsCardProps, LINKS, QuickNavCards() (+25 more)

### Community 59 - "StorageSettings.tsx"
Cohesion: 0.14
Nodes (20): LibrarySourceSettingsProps, Platform, LocalAuthSectionProps, RequestSettingsProps, Props, initialFormData, LegacySmbMigration(), LegacySmbMigrationProps (+12 more)

### Community 60 - "fetch-stats-data.ts"
Cohesion: 0.17
Nodes (21): fetchStatsData(), statsResults, fetchOldestWatchEventYear(), fetchProviderIdToLocalUserMap(), fetchUserGroupMap(), fetchWatchHistory(), StatsScopedUser, AggregatedMedia (+13 more)

### Community 61 - "Navbar.tsx"
Cohesion: 0.13
Nodes (21): NAVIGATION_ITEMS, useNavbarMenus(), UseNavbarMenusResult, Navbar(), NavbarDesktopMenu(), NavbarDesktopMenuProps, NavbarLogo(), WORDMARK (+13 more)

### Community 62 - "stats-scheduler.ts"
Cohesion: 0.21
Nodes (11): register(), CacheState, g, OnCacheChange, checkCompletedDownloads(), globalForScheduler, MediaRequestLite, normalizeTitleForMatch() (+3 more)

### Community 63 - "media-status.ts"
Cohesion: 0.09
Nodes (17): cache, forget(), MemoCache, MemoCacheOptions, MemoGetOptions, earliest(), getReleaseWait(), isFuture() (+9 more)

### Community 64 - "emby-tracker.ts"
Cohesion: 0.13
Nodes (30): getPrisma(), activeSessions, attachSessionIfPresent(), authenticateSocket(), broadcastSessions(), cleanupOrphanedSessions(), EmbyNowPlayingItem, EmbySessionItem (+22 more)

### Community 65 - "downloads/actions.ts"
Cohesion: 0.30
Nodes (17): addTorrent(), checkAccess(), deleteStoragePath(), deleteTorrents(), getCategories(), getGlobalStats(), getTags(), getTorrents() (+9 more)

### Community 66 - "TorrentFiltersBar.tsx"
Cohesion: 0.14
Nodes (17): AddTorrentModalProps, ColumnsDropdown(), ColumnsDropdownProps, SortDropdown(), SortDropdownProps, StatusFilterRow(), StatusFilterRowProps, TorrentActionBar() (+9 more)

### Community 67 - "settings.ts"
Cohesion: 0.23
Nodes (9): dynamic, error(), log(), POST(), error(), log(), POST(), setSetting() (+1 more)

### Community 68 - "RequestItem.tsx"
Cohesion: 0.20
Nodes (14): RequestItem(), RequestItemProps, resolvePosterPaths(), RequestPoster(), RequestPosterProps, MediaRequest, useRecentRequests(), RecentRequests() (+6 more)

### Community 69 - "formatReleaseDate"
Cohesion: 0.31
Nodes (7): getStatusIcon(), getStatusText(), RequestStatusBadge(), RequestStatusBadgeProps, DOTS, MediaCardStatusProps, formatReleaseDate()

### Community 70 - "onyx.tsx"
Cohesion: 0.14
Nodes (24): useAvailabilityServerName(), requestAllSeasons(), requestSelectedSeasons(), PRIMARY_LABEL, RequestStatusButton(), RequestStatusButtonProps, SecondaryButton(), useRequestStatus() (+16 more)

### Community 71 - "RequestCard.tsx"
Cohesion: 0.16
Nodes (13): MediaPoster(), MediaPosterProps, RequestCard(), RequestCardProps, RequestCardPoster(), RequestCardPosterProps, RequestListItemsProps, PosterUrls (+5 more)

### Community 72 - "SystemMessageManagement.tsx"
Cohesion: 0.16
Nodes (13): BannerMessageSection(), BannerMessageSectionProps, PopupMessageSection(), PopupMessageSectionProps, SaveStatusAlert(), SaveStatusAlertProps, SystemMessageHeader(), SaveStatus (+5 more)

### Community 73 - "StorageManager.tsx"
Cohesion: 0.23
Nodes (14): BulkDeleteModal(), StatusIcon(), BulkDeleteResultModal(), BulkDeleteResultModalProps, DeleteStorageModal(), StorageManagerHeader(), StorageManagerHeaderProps, useStorageManager() (+6 more)

### Community 74 - "@tanstack/react-query"
Cohesion: 0.14
Nodes (16): bricolage, geistMono, metadata, RootLayout(), DeploymentGuard(), reloadOnce(), Providers(), QueryProvider() (+8 more)

### Community 75 - "SetupForm.tsx"
Cohesion: 0.18
Nodes (12): SetupConfigureForm(), SetupModeToggle(), SetupModeToggleProps, SetupRestoreForm(), SetupRestoreFormProps, FormData, ServerType, useSetupForm() (+4 more)

### Community 76 - "media-filters-options.ts"
Cohesion: 0.09
Nodes (35): fetchMedia(), getFilterOptions(), getWatchProviders(), toCardStatus(), withTimeBudget(), FilterModal(), FilterModalProps, InfiniteMediaListProps (+27 more)

### Community 77 - "TorrentManager.tsx"
Cohesion: 0.14
Nodes (18): QbitPanel(), QbitPanelProps, BatchAction, BatchActionsBar(), BatchActionsBarProps, TorrentList(), TorrentListProps, TorrentRow (+10 more)

### Community 78 - "LiveSessions.tsx"
Cohesion: 0.19
Nodes (14): formatSessionDisplay(), SessionDisplay, LiveSessionCard(), LiveSessionCardProps, LiveSessionsEmpty(), LiveSessionsHeader(), LiveSessionsHeaderProps, InterpolatedSession (+6 more)

### Community 79 - "evolution-provider.ts"
Cohesion: 0.19
Nodes (12): EvolutionProvider, isRetryable(), normalizeNumber(), summarizeError(), RetryOptions, sleep(), withRetry(), EvolutionConfig (+4 more)

### Community 80 - "sync-plugin/route.ts"
Cohesion: 0.19
Nodes (7): error(), importPlexHistory(), log(), error(), log(), PlexService, warn()

### Community 81 - "DownloadStatusModal.tsx"
Cohesion: 0.12
Nodes (23): DownloadStatusModal(), DownloadStatusModalProps, NothingDownloading(), ImportProgressList(), SmoothBar(), MovieDownloadProgress(), MovieDownloadProgressProps, MediaDownloadProgressBar() (+15 more)

### Community 82 - "useNavigationOrigin.ts"
Cohesion: 0.20
Nodes (11): MediaBackdrop(), MediaBackdropProps, MediaBackLink(), MediaHero(), readOrigin(), subscribe(), useNavigationOrigin(), useStoredNavigationOrigin() (+3 more)

### Community 83 - "SeasonList.tsx"
Cohesion: 0.12
Nodes (25): BUBBLE, DROP_SIZE, LiquidParts, liquidSwitch(), RowLayout, TAIL_SIZES, TAILS, SeasonBubble() (+17 more)

### Community 84 - "InfiniteRequestList.tsx"
Cohesion: 0.09
Nodes (26): MediaManagerButton(), MediaManagerButtonProps, FilterPillGroup(), FilterPillGroupProps, FilterPillOption, MediaTypeFilter, mediaTypeOptions, OwnershipFilter (+18 more)

### Community 85 - "list/actions.ts"
Cohesion: 0.22
Nodes (14): GET(), POST(), StuckItemResponse, error(), fetchUserRequests(), forceSyncRequests(), log(), useInfiniteRequests() (+6 more)

### Community 86 - "LinkedAccounts.tsx"
Cohesion: 0.21
Nodes (13): AddMemberModal(), AddMemberModalProps, CreateGroupForm(), CreateGroupFormProps, GroupCard(), GroupCardProps, LinkedAccounts(), Candidate (+5 more)

### Community 87 - "StatsHeader.tsx"
Cohesion: 0.19
Nodes (12): SourceFilter(), StatsHeader(), StatsHeaderProps, PeriodButton(), PeriodButtonProps, StatsPeriodNav(), StatsPeriodNavProps, SyncPluginButton() (+4 more)

### Community 89 - "external-item-resolver.ts"
Cohesion: 0.23
Nodes (12): AccessDeniedFallback(), ExternalMediaFallback(), ExternalMediaFallbackProps, MediaPageContent(), dynamic, MediaDetailsPage(), ExternalItemResolution, fetchExternalItem() (+4 more)

### Community 90 - "[file]/route.ts"
Cohesion: 0.17
Nodes (13): Context, GET(), posters, SIZES, createMemoCache(), extend(), frameThickness(), lineStats() (+5 more)

### Community 91 - "media-server-brand.ts"
Cohesion: 0.18
Nodes (13): ProviderFilterTabsProps, PROVIDERS, SYNC_BUTTONS, SyncButtonConfig, UserSyncButtonsProps, ProviderFilter, SyncProvider, ServerType (+5 more)

### Community 92 - "getMediaAvailability"
Cohesion: 0.22
Nodes (14): dynamic, GET(), dynamic, POST(), dynamic, GET(), dynamic, GET() (+6 more)

### Community 93 - "useStorageItems.ts"
Cohesion: 0.14
Nodes (21): DeleteStorageModalProps, EMPTY_PAGINATION, EMPTY_TOTALS, fetchStoragePage(), removeFromPages(), StoragePages, storageQueryKey(), translateStorageError() (+13 more)

### Community 94 - "ThemeProvider.tsx"
Cohesion: 0.24
Nodes (12): PREVIEWS, ThemeSwitcher(), ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), DEFAULT_THEME, isThemeId() (+4 more)

### Community 95 - "QBittorrentCache"
Cohesion: 0.15
Nodes (3): describeFailure(), normalizeTorrent(), QBittorrentCache

### Community 97 - "SmbService"
Cohesion: 0.20
Nodes (7): testSmbConnection(), devError(), devLog(), devWarn(), SmbService, archiver@^7.0.1, archiver

### Community 99 - "download-managers/sorraa.ts"
Cohesion: 0.13
Nodes (24): ArrDownloadManager, SETTING_KEYS, ACTIVE_GRAB_STATUSES, availabilityFromSorraa(), best(), formatBytes(), formatDuration(), importsFromGrabs() (+16 more)

### Community 100 - "_components/types.ts"
Cohesion: 0.23
Nodes (10): ArrSection(), ArrSectionProps, AutomationSettings(), Props, DownloadSettings(), SettingsFormFooter(), SettingsFormFooterProps, useSettingsForm() (+2 more)

### Community 101 - "request-access/page.tsx"
Cohesion: 0.20
Nodes (11): Step1(), Step1Props, FormData, Step2(), Step2Props, Step3(), Step3Props, FormData (+3 more)

### Community 102 - "What was implemented"
Cohesion: 0.17
Nodes (11): 1. New Database Tables (Migration), 3. Dispatcher, 6. Updated Public API, 7. Updated Pollers, 8. Deprecated EvolutionListener, How it solves the original problems, Migration command, Notifications V2 — Implementation Summary (+3 more)

### Community 103 - "stats/page.tsx"
Cohesion: 0.21
Nodes (11): StatsEmptyState(), StatsEmptyStateProps, StatsRestrictedAccess(), StatsRestrictedAccessProps, formatDuration(), UserStatsCard(), UserStatsCardProps, dynamic (+3 more)

### Community 104 - "sync-plugin/route.ts"
Cohesion: 0.32
Nodes (11): batchProcess(), dynamic, EmbyHistoryItem, error(), JellyfinPlayedItem, log(), PlexHistoryItem, POST() (+3 more)

### Community 105 - "FileManager.tsx"
Cohesion: 0.23
Nodes (12): deleteSmbPath(), SmbPanelProps, DeleteFileModal(), FileManagerHeader(), ShareFileModal(), FileManager(), FileManagerProps, ShareModalState (+4 more)

### Community 106 - "TorrentStatsBar.tsx"
Cohesion: 0.32
Nodes (9): TorrentStatsBar(), TorrentStatsBarProps, TorrentStats(), GlobalStats, QUERY_KEY, useGlobalStats(), formatRatio(), formatStatsSize() (+1 more)

### Community 107 - "MediaCastSection.tsx"
Cohesion: 0.18
Nodes (12): CastList(), CastListProps, CastMember, MediaCastSection(), MediaCastSectionProps, CastMember, CrewMember, DEPT_TRANSLATIONS (+4 more)

### Community 108 - "media-page-data.ts"
Cohesion: 0.14
Nodes (20): EmbyApiEpisode, EmbyApiItem, EMPTY_PROGRESS, errorLog(), fetchMediaEmbyProgress(), log(), loadMediaPageData(), MediaPageDataResult (+12 more)

### Community 109 - "logger.ts"
Cohesion: 0.07
Nodes (35): GET(), getUploadDir(), POST(), resolveDbPath(), dynamic, EVENT_MAP, POST(), dynamic (+27 more)

### Community 110 - "media/page.tsx"
Cohesion: 0.21
Nodes (10): LibraryPage, MediaFilterPills(), MediaFilterPillsProps, MediaTypeTabs(), MediaTypeTabsProps, dynamic, MediaPage(), DiscoverPage() (+2 more)

### Community 111 - "start-all.js"
Cohesion: 0.09
Nodes (20): http-proxy@^1.18.1, http-proxy, ACTION_MANIFEST, appProcess, fs, http, httpProxy, isStaleAction() (+12 more)

### Community 112 - "dependencies"
Cohesion: 0.04
Nodes (48): dependencies, axios@^1.13.2, bcryptjs@^3.0.3, better-sqlite3@^12.9.0, @casl/ability@^6.8.0, @casl/react@^5.0.1, clsx@^2.1.1, dockerode@^4.0.9 (+40 more)

### Community 113 - "MediaSidebar.tsx"
Cohesion: 0.23
Nodes (9): MediaCollection, MediaCollectionCard(), MediaCollectionCardProps, MediaInfoTable(), MediaInfoTableProps, MediaSidebar(), MediaSidebarProps, MediaWatchProviders() (+1 more)

### Community 114 - "cache-service.ts"
Cohesion: 0.29
Nodes (8): CacheOptions, getDbClient(), invalidateCache(), invalidateTag(), l1, l2Get(), l2Set(), refreshing

### Community 115 - "InfiniteMediaList.tsx"
Cohesion: 0.26
Nodes (12): InfiniteScrollTrigger(), MediaGrid(), MediaGridEmpty(), MediaGridLoading(), MediaGridMoreLoading(), MediaGridProps, withMediaType(), withMediaTypeCache (+4 more)

### Community 116 - "useInfiniteMedia.ts"
Cohesion: 0.14
Nodes (19): LibraryProblem, EmptyLibrary(), InfiniteEmbyList(), InfiniteEmbyListProps, RETRY, SOURCE_NAME, buildURLParams(), getCacheKey() (+11 more)

### Community 117 - "NotificationBell.tsx"
Cohesion: 0.36
Nodes (7): NotificationItem, useNotifications(), UseNotificationsResult, formatTimeAgo(), NOTIFICATION_ICONS, NotificationBell(), InternalNotificationType

### Community 118 - "radarr.ts"
Cohesion: 0.15
Nodes (5): DEFAULT_CONFIG, StuckImportConfig, StuckImportDetector, RadarrQueueItem, SonarrQueueItem

### Community 119 - "useUserActivity.ts"
Cohesion: 0.24
Nodes (9): UserActivityButton(), UserActivityButtonProps, ItemDetails, QUERY_KEY(), SeasonDetail, SeasonStat, useUserActivity(), UseUserActivityResult (+1 more)

### Community 120 - "dashboard/page.tsx"
Cohesion: 0.11
Nodes (38): RecentlyWatchedSection(), RecentlyWatchedSkeleton(), RecentRequestsSection(), RecentRequestsSkeleton(), RecommendationsSection(), RecommendationsSkeleton(), settle(), Loading() (+30 more)

### Community 121 - "dashboard/layout.tsx"
Cohesion: 0.43
Nodes (5): DashboardLayout(), dynamic, getDashboardConfig, IntentPrefetch(), SystemMessageDisplay()

### Community 122 - "perf-mode.ts"
Cohesion: 0.47
Nodes (8): detectPerfMode(), enableLite(), isLite(), judge(), remember(), watchFrames(), watchScroll(), weakGraphics()

### Community 123 - "FtpService"
Cohesion: 0.21
Nodes (6): error(), FileInfo, FtpService, log(), basic-ftp@^5.0.5, basic-ftp

### Community 124 - "login/actions.ts"
Cohesion: 0.31
Nodes (8): checkPlexAuthPin(), getPlexAuthPin(), startOnyxPairing(), OnyxLoginPanel(), Step, logError(), usePlexOAuth(), UsePlexOAuthResult

### Community 125 - "SystemMessageBanner.tsx"
Cohesion: 0.43
Nodes (5): SystemMessageBanner(), logError(), SystemMessageBanner, useSystemMessageBanner(), UseSystemMessageBannerResult

### Community 126 - "service-factories.ts"
Cohesion: 0.17
Nodes (22): error(), log(), POST(), warn(), GET(), GET(), getEmbyServiceForUser(), getJellyfinServiceForUser() (+14 more)

### Community 127 - "getTmdbService"
Cohesion: 0.14
Nodes (14): GET(), MediaType, TmdbCatalogItem, GET(), TmdbGenre, TmdbSeason, error(), log() (+6 more)

### Community 128 - "useSystemUpdate.ts"
Cohesion: 0.16
Nodes (16): MaintenanceSettings(), Props, ApiResponse, formatBytes(), formatDuration(), Stats, StuckImportsManager(), StuckItem (+8 more)

### Community 129 - "package.json"
Cohesion: 0.06
Nodes (41): eslintConfig, devDependencies, babel-plugin-react-compiler@1.0.0, cross-env@^10.1.0, drizzle-kit@^0.31.10, eslint@^9, eslint-config-next@16.1.1, tailwindcss@^4 (+33 more)

### Community 130 - "ShareManagerModal.tsx"
Cohesion: 0.52
Nodes (5): ShareManagerModal(), ShareManagerModalProps, deletePublicShare(), listPublicShares(), ShareListItem

### Community 131 - "OutboxWorker"
Cohesion: 0.32
Nodes (3): OutboxWorker, claimDueDeliveries(), 5. Updated Bootstrap

### Community 132 - "services/emby.ts"
Cohesion: 0.11
Nodes (16): getHttpsAgent(), insecureHttpsAgent, KEEP_ALIVE, keepAliveHttpAgent, strictHttpsAgent, serverIds, TmdbIndex, tmdbIndexes (+8 more)

### Community 135 - "MediaOverviewSection.tsx"
Cohesion: 0.29
Nodes (7): MediaCrewGrid(), MediaCrewGridProps, MediaKeyword, MediaKeywords(), MediaKeywordsProps, MediaOverviewSection(), MediaOverviewSectionProps

### Community 136 - "settings/page.tsx"
Cohesion: 0.53
Nodes (4): SettingsTabs(), dynamic, SettingsPage(), AbilityProvider()

### Community 139 - "patch-allowed-origins.js"
Cohesion: 0.22
Nodes (11): DATABASE_URL, entrypoint.sh script, collectRuntimeOrigins(), CONFIG_FILE, fs, main(), mergeOrigins(), patchRequiredServerFiles() (+3 more)

### Community 140 - "watch-sync.ts"
Cohesion: 0.33
Nodes (6): dynamic, GET(), EmbySession, error(), log(), syncActiveSessions()

### Community 141 - "template.tsx"
Cohesion: 0.60
Nodes (3): DashboardTemplate(), installPhoneTransitionGuard(), PHONE_QUERY

### Community 142 - "StatsCharts.tsx"
Cohesion: 0.29
Nodes (7): ActivityChartProps, ActivityChart, ActivityData, StatsCharts(), StatsChartsProps, UserStat, StatsDataResult

### Community 143 - "me/page.tsx"
Cohesion: 0.18
Nodes (14): TopItemCard(), TopItemCardProps, TopItemsTabs(), TopItemsTabsProps, dynamic, PeriodButton(), sanitizePlaybackDuration(), SourceBadge() (+6 more)

### Community 145 - "backfill-last-played.ts"
Cohesion: 0.83
Nodes (3): getSetting(), main(), mapLimit()

### Community 147 - "recreate-containers.js"
Cohesion: 0.36
Nodes (8): cleanEndpointsConfig(), dockerAPI(), fs, http, log(), recreate(), safelyDeleteOldImage(), sleep()

### Community 150 - "OnyxSettings.tsx"
Cohesion: 0.16
Nodes (10): adminCall(), OnyxLinkCard(), OnyxSettings(), OnyxSettingsProps, OnyxStatus, randomKey(), api, ApiClient (+2 more)

### Community 157 - "useMediaSettingsTests.ts"
Cohesion: 0.60
Nodes (5): testEmbyConnection(), testJellyfinConnection(), testPlexConnection(), importPlexHistoryAction(), useMediaSettingsTests()

### Community 166 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 171 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 177 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 231 - "scripts/verify-sorraa.ts"
Cohesion: 0.08
Nodes (22): Côté client, Côté serveur, Performance — conventions, accounts, Json, loggedOut, onyxUser(), startFakeOnyx() (+14 more)

## Knowledge Gaps
- **2 isolated node(s):** `DATABASE_URL`, `ADR-0102`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 887 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `SupportCategoriesConfig.tsx` to `defineAbilityFor`, `auth/index.ts`, `schema.ts`, `ProwlarrSearch.tsx`, `RoleEditor.tsx`, `AccountRequest`, `dashboard-actions.ts`, `_utils/activity-logs.ts`, `group-actions.ts`, `MotionDirector.tsx`, `next`, `LoginForm.tsx`, `MediaPrimaryActions.tsx`, `file-actions.ts`, `UserManagement.tsx`, `getCurrentUser`, `Torrent`, `SeasonList.tsx`, `MediaCard.tsx`, `torrent/FilterModal.tsx`, `StorageFilterBar.tsx`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `StorageItem`, `ManageMediaModal.tsx`, `notifications-v2-actions.ts`, `TorrentModals.tsx`, `NotificationItem.tsx`, `SettingsFormData`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `TorrentFiltersBar.tsx`, `RequestItem.tsx`, `onyx.tsx`, `RequestCard.tsx`, `SystemMessageManagement.tsx`, `StorageManager.tsx`, `@tanstack/react-query`, `SetupForm.tsx`, `media-filters-options.ts`, `TorrentManager.tsx`, `LiveSessions.tsx`, `DownloadStatusModal.tsx`, `useNavigationOrigin.ts`, `SeasonList.tsx`, `InfiniteRequestList.tsx`, `list/actions.ts`, `LinkedAccounts.tsx`, `StatsHeader.tsx`, `useStorageItems.ts`, `ThemeProvider.tsx`, `_components/types.ts`, `request-access/page.tsx`, `stats/page.tsx`, `FileManager.tsx`, `MediaCastSection.tsx`, `media/page.tsx`, `dependencies`, `InfiniteMediaList.tsx`, `useInfiniteMedia.ts`, `NotificationBell.tsx`, `useUserActivity.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `login/actions.ts`, `SystemMessageBanner.tsx`, `useSystemUpdate.ts`, `package.json`, `ShareManagerModal.tsx`, `settings/page.tsx`, `template.tsx`, `StatsCharts.tsx`, `me/page.tsx`, `OnyxSettings.tsx`, `useMediaSettingsTests.ts`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **What connects `DATABASE_URL`, `ADR-0102` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `defineAbilityFor` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `defineAbilityFor`, `item-viewing-stats.ts`, `package.json`, `auth/index.ts`, `schema.ts`, `ProwlarrSearch.tsx`, `onyx-link/route.ts`, `MediaOverviewSection.tsx`, `RoleEditor.tsx`, `media/actions.ts`, `player-v1.ts`, `watch-sync.ts`, `StatsCharts.tsx`, `me/page.tsx`, `template.tsx`, `MotionDirector.tsx`, `getRealUser`, `LoginForm.tsx`, `interactive-search.ts`, `UserManagement.tsx`, `storage-list.ts`, `getCurrentUser`, `getSetting`, `Torrent`, `onyx/route.ts`, `MediaCard.tsx`, `[hash]/actions.ts`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `next.config.ts`, `internal.ts`, `ManageMediaModal.tsx`, `TorrentModals.tsx`, `NotificationItem.tsx`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `downloads/actions.ts`, `settings.ts`, `RequestItem.tsx`, `onyx.tsx`, `RequestCard.tsx`, `@tanstack/react-query`, `SetupForm.tsx`, `LiveSessions.tsx`, `useNavigationOrigin.ts`, `SeasonList.tsx`, `InfiniteRequestList.tsx`, `list/actions.ts`, `StatsHeader.tsx`, `external-item-resolver.ts`, `[file]/route.ts`, `getMediaAvailability`, `useStorageItems.ts`, `request-access/page.tsx`, `stats/page.tsx`, `sync-plugin/route.ts`, `MediaCastSection.tsx`, `logger.ts`, `media/page.tsx`, `dependencies`, `MediaSidebar.tsx`, `useInfiniteMedia.ts`, `NotificationBell.tsx`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `login/actions.ts`, `service-factories.ts`, `getTmdbService`?**
  _High betweenness centrality (0.173) - this node is a cross-community bridge._
- **Should `item-viewing-stats.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12878787878787878 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `torrent/FilterModal.tsx` to `defineAbilityFor`, `useSystemUpdate.ts`, `package.json`, `storage.ts`, `ProwlarrSearch.tsx`, `RoleEditor.tsx`, `AccountRequest`, `StatsCharts.tsx`, `_utils/activity-logs.ts`, `group-actions.ts`, `me/page.tsx`, `LoginForm.tsx`, `MediaPrimaryActions.tsx`, `OnyxSettings.tsx`, `UserManagement.tsx`, `Torrent`, `SeasonList.tsx`, `MediaCard.tsx`, `StorageFilterBar.tsx`, `[hash]/actions.ts`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `StorageItem`, `ManageMediaModal.tsx`, `notifications-v2-actions.ts`, `SupportCategoriesConfig.tsx`, `TorrentModals.tsx`, `MediaPageContent.tsx`, `NotificationItem.tsx`, `SettingsFormData`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `TorrentFiltersBar.tsx`, `RequestItem.tsx`, `formatReleaseDate`, `onyx.tsx`, `RequestCard.tsx`, `SystemMessageManagement.tsx`, `StorageManager.tsx`, `SetupForm.tsx`, `media-filters-options.ts`, `TorrentManager.tsx`, `LiveSessions.tsx`, `DownloadStatusModal.tsx`, `useNavigationOrigin.ts`, `SeasonList.tsx`, `InfiniteRequestList.tsx`, `LinkedAccounts.tsx`, `StatsHeader.tsx`, `media-server-brand.ts`, `useStorageItems.ts`, `ThemeProvider.tsx`, `_components/types.ts`, `request-access/page.tsx`, `stats/page.tsx`, `TorrentStatsBar.tsx`, `MediaCastSection.tsx`, `media/page.tsx`, `dependencies`, `InfiniteMediaList.tsx`, `useInfiniteMedia.ts`, `NotificationBell.tsx`, `useUserActivity.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `SystemMessageBanner.tsx`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05107252298263534 - nodes in this community are weakly interconnected._