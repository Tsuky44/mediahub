# Graph Report - next-app  (2026-11-02)

## Corpus Check
- 716 files · ~292,414 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .css 4, (none) 3, .ico 1)

## Summary
- 3827 nodes · 10884 edges · 156 communities (143 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86ca18b6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getTmdbServiceForUser
- prowlarr.ts
- logger.ts
- auth.ts
- storage.ts
- schema.ts
- ProwlarrSearch.tsx
- NotificationsV2.tsx
- outbox-worker.ts
- RoleEditor.tsx
- media/actions.ts
- AccountRequest
- player-v1.ts
- EmbyService
- bootstrap.ts
- _utils/activity-logs.ts
- group-actions.ts
- MotionDirector.tsx
- getRealUser
- drizzle.ts
- LoginForm.tsx
- download-status-actions.ts
- jellyseerr-import.ts
- file-actions.ts
- interactive-search.ts
- UserManagement.tsx
- services/sonarr.ts
- download-managers/sorraa.ts
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
- system-update.ts
- ManageMediaModal.tsx
- NotificationEvent
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
- torrent-parser.ts
- onyx.tsx
- [id]/actions.ts
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
- notifications-v2-actions.ts
- SupportChatbot.tsx
- InfiniteRequestList.tsx
- DownloadSettings.tsx
- LinkedAccounts.tsx
- stats/page.tsx
- TmdbService
- external-item-resolver.ts
- [file]/route.ts
- media-server-brand.ts
- webhook-provider.ts
- useStorageItems.ts
- ThemeProvider.tsx
- QBittorrentCache
- RadarrService
- SmbService
- TorrentInfoCard.tsx
- download-managers/index.ts
- _components/types.ts
- request-access/page.tsx
- What was implemented
- types/index.ts
- media-requests.ts
- DownloadsClient.tsx
- TorrentStatsBar.tsx
- MediaCastSection.tsx
- media-page-data.ts
- services/tmdb.ts
- media/page.tsx
- start-all.js
- dependencies
- MediaSidebar.tsx
- media-emby-progress.ts
- InfiniteMediaList.tsx
- useInfiniteMedia.ts
- SettingsFormData
- radarr.ts
- useUserActivity.ts
- dashboard/page.tsx
- dashboard/layout.tsx
- NotificationEventBus
- FtpService
- login/actions.ts
- SystemMessageBanner.tsx
- service-factories.ts
- prisma.ts
- useSystemUpdate.ts
- package.json
- ShareManagerModal.tsx
- UserSyncButtons.tsx
- services/emby.ts
- MediaSyncService
- MediaOverviewSection.tsx
- MaintenanceSettings.tsx
- QbitWatchPoller
- patch-allowed-origins.js
- watch-sync.ts
- StatsCharts.tsx
- me/page.tsx
- LocalService
- recreate-containers.js
- next
- OnyxSettings.tsx
- useMediaSettingsTests.ts
- next-auth.d.ts
- system-update.ts
- scripts
- next.config.ts
- README.md
- scripts/verify-sorraa.ts
- postcss.config.mjs
- window.d.ts

## God Nodes (most connected - your core abstractions)
1. `lucide-react` - 231 edges
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
- `5. Updated Bootstrap` --references--> `OutboxWorker`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/notifications-v2/outbox/outbox-worker.ts
- `Côté serveur` --references--> `isInWatchLater()`  [INFERRED]
  PERFORMANCE.md → app/dashboard/media/watch-later-actions.ts
- `Côté serveur` --references--> `getCurrentUser()`  [INFERRED]
  PERFORMANCE.md → lib/auth/index.ts
- `Côté serveur` --references--> `createAxiosClient()`  [INFERRED]
  PERFORMANCE.md → lib/http-client.ts
- `2. Store Layer` --references--> `enqueueDelivery()`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/notifications-v2/store/delivery-store.ts

## Import Cycles
- None detected.

## Communities (156 total, 13 thin omitted)

### Community 0 - "getTmdbServiceForUser"
Cohesion: 0.15
Nodes (22): DELETE(), checkPermission(), downloadRelease(), getSeriesEpisodes(), searchReleases(), triggerAutomaticSearch(), dynamic, RecommendationsPage() (+14 more)

### Community 1 - "prowlarr.ts"
Cohesion: 0.27
Nodes (5): error(), IndexerField, log(), ProwlarrIndexer, ProwlarrService

### Community 2 - "logger.ts"
Cohesion: 0.04
Nodes (70): dynamic, EVENT_MAP, dynamic, register(), mediaRequests, emit(), formatLog(), generateCorrelationId() (+62 more)

### Community 3 - "auth.ts"
Cohesion: 0.11
Nodes (25): handler, dynamic, GET(), publicOrigin(), dynamic, dynamic, authOptions, embyProvider (+17 more)

### Community 4 - "storage.ts"
Cohesion: 0.19
Nodes (15): DeleteStorageModalProps, SeasonsSection(), SeasonsSectionProps, StorageDetailsFooter(), StorageDetailsFooterProps, UserActivitySection(), UserActivitySectionProps, StorageDetailsModal() (+7 more)

### Community 5 - "schema.ts"
Cohesion: 0.05
Nodes (54): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+46 more)

### Community 6 - "ProwlarrSearch.tsx"
Cohesion: 0.07
Nodes (56): ProwlarrPanelProps, SearchModal(), SearchModalProps, checkPermission(), downloadMediaRelease(), downloadTorrent(), error(), getProwlarrIndexers() (+48 more)

### Community 7 - "NotificationsV2.tsx"
Cohesion: 0.14
Nodes (16): EventsSection(), EvolutionApiSection(), EvolutionApiSectionProps, EvolutionConfig, NotificationsActionsBar(), NotificationsActionsBarProps, Delivery, NotificationEvent (+8 more)

### Community 8 - "outbox-worker.ts"
Cohesion: 0.16
Nodes (14): buildPosterUrl(), globalForWorker, OutboxWorker, claimDueDeliveries(), ClaimResult, enqueueDelivery(), EnqueueParams, isEventFullyDispatched() (+6 more)

### Community 9 - "RoleEditor.tsx"
Cohesion: 0.09
Nodes (35): startImpersonation(), RoleEditor(), RoleEditorProps, RoleManagement(), DefaultRoleSelector(), DefaultRoleSelectorProps, PermissionCheckbox(), PermissionCheckboxProps (+27 more)

### Community 10 - "media/actions.ts"
Cohesion: 0.12
Nodes (29): classifyLibraryError(), error(), fetchEmbyMedia(), fetchOnyxMedia(), fetchRecentlyWatchedItems(), fetchServerTrends(), fetchUserRecommendations(), getSeriesTmdbId() (+21 more)

### Community 11 - "AccountRequest"
Cohesion: 0.10
Nodes (32): markWelcomeAsSeen(), WelcomePopup(), WelcomePopupProps, loadServerInfo(), ServerInfo, ServerType, useAvailabilityServerName(), useIsOnyxAccount() (+24 more)

### Community 12 - "player-v1.ts"
Cohesion: 0.08
Nodes (53): dynamic, GET(), dynamic, POST(), dynamic, FEATURES, GET(), dynamic (+45 more)

### Community 13 - "EmbyService"
Cohesion: 0.05
Nodes (35): dynamic, maxDuration, POST(), dynamic, GET(), toMediaInfo(), yearOf(), dynamic (+27 more)

### Community 14 - "bootstrap.ts"
Cohesion: 0.12
Nodes (15): dynamic, GET(), POST(), dynamic, GET(), POST(), notificationDeliveries, notificationEvents (+7 more)

### Community 15 - "_utils/activity-logs.ts"
Cohesion: 0.10
Nodes (40): GET(), GET(), getActivityLogs(), getLogUsers(), importPastRequestsIntoLogs(), ActivityLogRow(), ActivityLogRowProps, ActivityLogsPagination() (+32 more)

### Community 16 - "group-actions.ts"
Cohesion: 0.16
Nodes (23): AddMemberForm(), AddMemberFormProps, GroupEditForm(), GroupEditFormProps, GroupHeader(), GroupHeaderProps, MembersEmpty(), MembersList() (+15 more)

### Community 17 - "MotionDirector.tsx"
Cohesion: 0.09
Nodes (52): arrived(), BACKDROP, backdropHeight(), backdropImage(), calm(), clearNav(), clearNavLater(), depth() (+44 more)

### Community 18 - "getRealUser"
Cohesion: 0.07
Nodes (34): DELETE(), dynamic, GET(), PUT(), revalidate, dynamic, GET(), POST() (+26 more)

### Community 19 - "drizzle.ts"
Cohesion: 0.07
Nodes (26): dynamic, dynamic, GET(), MediaRequestLite, TmdbSearchItem, CONFIG_KEYS, DashboardConfig, loadRecentRequests() (+18 more)

### Community 20 - "LoginForm.tsx"
Cohesion: 0.17
Nodes (21): CredentialsForm(), CredentialsFormProps, PlexOAuthButton(), PlexOAuthButtonProps, PROVIDER_OPTIONS, ProviderSelector(), ProviderSelectorProps, log() (+13 more)

### Community 21 - "download-status-actions.ts"
Cohesion: 0.17
Nodes (17): ImportProgressList(), SmoothBar(), MovieDownloadProgressProps, MediaDownloadProgressBar(), MediaDownloadProgressBarProps, checkDownloadStatus(), DownloadStatus, error() (+9 more)

### Community 22 - "jellyseerr-import.ts"
Cohesion: 0.24
Nodes (6): dynamic, error(), GET(), log(), importJellyseerrRequests(), JellyseerrService

### Community 23 - "file-actions.ts"
Cohesion: 0.12
Nodes (25): deleteSmbPath(), DeleteFileModal(), DeleteFileModalProps, FileManagerHeader(), FileManagerHeaderProps, FileManagerRow(), FileManagerRowProps, formatFileSize() (+17 more)

### Community 24 - "interactive-search.ts"
Cohesion: 0.07
Nodes (31): dynamic, GET(), parseNumber(), parseTarget(), POST(), getManagerKind(), canInteractiveSearch(), ChosenRelease (+23 more)

### Community 25 - "UserManagement.tsx"
Cohesion: 0.18
Nodes (21): UserManagement(), UserManagementProps, CreateUserModal(), CreateUserModalProps, EMPTY_FORM, NotificationsEditor(), NotificationsEditorProps, ProviderFilterTabs() (+13 more)

### Community 26 - "services/sonarr.ts"
Cohesion: 0.07
Nodes (26): CacheOptions, getDbClient(), invalidateCache(), invalidateTag(), l1, l2Get(), l2Set(), refreshing (+18 more)

### Community 27 - "download-managers/sorraa.ts"
Cohesion: 0.08
Nodes (37): POST(), SorraaWebhookPayload, syncRequestStatuses(), ImportInfo, ACTIVE_GRAB_STATUSES, availabilityFromSorraa(), best(), formatBytes() (+29 more)

### Community 28 - "storage-list.ts"
Cohesion: 0.09
Nodes (42): dynamic, error(), GET(), log(), maxDuration, parseSort(), VALID_SORT_DIRS, VALID_SORT_KEYS (+34 more)

### Community 29 - "getCurrentUser"
Cohesion: 0.11
Nodes (29): dynamic, revalidate, Params, PATCH(), DELETE(), Params, GET(), PATCH() (+21 more)

### Community 30 - "getSetting"
Cohesion: 0.24
Nodes (12): embyToTmdbCache, error(), GET(), log(), tmdbPosterCache, warn(), GET(), getStorageServiceForUser() (+4 more)

### Community 31 - "Torrent"
Cohesion: 0.21
Nodes (16): ColumnsDropdownProps, TorrentFiltersBarProps, TorrentRow, TorrentRowComponent(), TorrentRowProps, VisibleColumns, TorrentRowFooter(), TorrentRowFooterProps (+8 more)

### Community 32 - "onyx/route.ts"
Cohesion: 0.10
Nodes (26): dynamic, GET(), hintOf(), linkOnyx(), newKey(), POST(), requireAdmin(), rotateKey() (+18 more)

### Community 33 - "SeasonList.tsx"
Cohesion: 0.08
Nodes (43): getSeasonDetails(), SearchActions(), SearchActionsProps, EpisodeCard(), EpisodeCardProps, BUBBLE, DROP_SIZE, LiquidParts (+35 more)

### Community 34 - "onyx-link/route.ts"
Cohesion: 0.15
Nodes (30): clientIp(), DELETE(), GET(), POST(), findUserByOnyxId(), getOnyxAuthConfig(), linkOnyxAccount(), OnyxAuthConfig (+22 more)

### Community 35 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 36 - "MediaCard.tsx"
Cohesion: 0.10
Nodes (27): LibraryProblem, CollectionPage(), InfiniteDiscoverList(), InfiniteDiscoverListProps, DiscoverPage(), EmptyLibrary(), InfiniteEmbyList(), InfiniteEmbyListProps (+19 more)

### Community 37 - "Changelog"
Cohesion: 0.10
Nodes (19): [0.9.60] - 2026-06-10, [0.9.676] - 2026-07-07, [0.9.677] - 2026-07-07, [0.9.678] - 2026-07-08, [0.9.680] - 2026-07-09, [0.9.683] - 2026-07-10, Added, Added (+11 more)

### Community 38 - "torrent/FilterModal.tsx"
Cohesion: 0.12
Nodes (18): FilterConfigBar(), FilterConfigBarProps, FilterModalFooter(), FilterModalFooterProps, FilterModalHeader(), FilterModalHeaderProps, PeriodSection(), PeriodSectionProps (+10 more)

### Community 39 - "StorageFilterBar.tsx"
Cohesion: 0.11
Nodes (26): FilterSelect(), FilterSelectOption, FilterSelectProps, ADDED_MODES, chipClass(), ChipLabel(), DateFilterControl(), ModeOption (+18 more)

### Community 40 - "[hash]/actions.ts"
Cohesion: 0.19
Nodes (20): error(), fetchRelatedRequests(), fetchTMDBInfo(), findIndexerIdForTracker(), formatBytes(), formatSpeed(), getProwlarrIndexersMap(), getTorrentDetails() (+12 more)

### Community 41 - "SettingsTabsContent.tsx"
Cohesion: 0.18
Nodes (20): SettingsTabButton(), SettingsTabButtonProps, SettingsTabsContent(), SettingsTabsContentProps, SettingsTabsNav(), SettingsTabsNavProps, SettingsTabs(), isSettingsTabId() (+12 more)

### Community 43 - "QBittorrentService"
Cohesion: 0.14
Nodes (3): error(), log(), QBittorrentService

### Community 44 - "HistoryItem.tsx"
Cohesion: 0.18
Nodes (19): buildHref(), HistoryItem(), HistoryItemProps, HistoryItemMeta(), HistoryItemMetaProps, HistoryItemThumbnail(), HistoryItemThumbnailProps, RecentHistory() (+11 more)

### Community 45 - "template-renderer.ts"
Cohesion: 0.21
Nodes (10): DEFAULT_TEMPLATES, TemplateVariants, TemplateRenderer, assertEqual(), assertExcludes(), assertIncludes(), payload(), route() (+2 more)

### Community 46 - "StorageItem"
Cohesion: 0.18
Nodes (19): formatRuntime(), SERIES_STATUS, StorageDetailsHeader(), StorageDetailsHeaderProps, StorageMobileItem(), StorageMobileItemProps, PosterItem, StoragePoster() (+11 more)

### Community 48 - "ManageMediaModal.tsx"
Cohesion: 0.20
Nodes (18): MediaRequestRow(), MediaRequestRowProps, MediaRequestsSection(), MediaRequestsSectionProps, getStatusClasses(), MediaServiceStatusSection(), MediaServiceStatusSectionProps, STATUS_LABELS (+10 more)

### Community 49 - "NotificationEvent"
Cohesion: 0.18
Nodes (19): EventAccordionItem(), EventAccordionItemProps, EventRouteCard(), EventRouteCardProps, EventRouteConfig, EventRouteConfig, EventsSectionProps, EventUserSelector() (+11 more)

### Community 50 - "SupportCategoriesConfig.tsx"
Cohesion: 0.11
Nodes (19): DiscordMentionsManager(), MentionItem, parseMentions(), serializeMentions(), SupportCategoriesConfig(), SubTab, SupportManagement(), statusColors (+11 more)

### Community 51 - "TorrentModals.tsx"
Cohesion: 0.12
Nodes (19): AddTorrentModal(), AddTorrentModalProps, DeleteTorrentModal(), DeleteTorrentModalProps, ShareLimitModalProps, ShareLimitType, ShareLimitUnit, FilterModal (+11 more)

### Community 52 - "MediaPageContent.tsx"
Cohesion: 0.18
Nodes (15): MediaActionsRowProps, MediaAvailabilityBadges(), MediaAvailabilityBadgesProps, MediaPageContent(), MediaPageContentProps, MediaPrimaryActions(), MediaPrimaryActionsProps, MediaRelatedSliders() (+7 more)

### Community 53 - "NotificationItem.tsx"
Cohesion: 0.50
Nodes (5): NotificationItem(), NotificationItemProps, Notification, useNotifications(), NotificationsPage()

### Community 54 - "SettingsFormData"
Cohesion: 0.39
Nodes (12): EmbySettings(), JellyfinSettings(), LibrarySourceSettings(), LocalAuthSection(), PlexSettings(), RequestSettings(), MediaSettings(), CheckboxField() (+4 more)

### Community 55 - "BackupManagement.tsx"
Cohesion: 0.15
Nodes (18): BackupExportCard(), BackupExportCardProps, BackupImportCard(), BackupImportCardProps, PasswordInput(), PasswordInputColor, PasswordInputProps, RING_CLASSES (+10 more)

### Community 56 - "cn"
Cohesion: 0.10
Nodes (32): backdropUrlOf(), CalendarEvent, error(), getCalendarEvents(), log(), RadarrCalendarMovie, SonarrCalendarEpisode, TmdbEpisode (+24 more)

### Community 57 - "MediaActionsRow.tsx"
Cohesion: 0.13
Nodes (24): addToCalendar(), removeFromCalendar(), toggleFavorite(), MediaActionsRow(), MenuItem(), MobileActionsMenu(), FavoriteButton(), FavoriteButtonProps (+16 more)

### Community 58 - "QuickActions.tsx"
Cohesion: 0.09
Nodes (39): DASHBOARD_CARD, DASHBOARD_EYEBROW, DashboardSearchBar(), DashboardSearchBarProps, LibraryStatsCard(), LibraryStatsCardProps, LINKS, QuickNavCards() (+31 more)

### Community 59 - "StorageSettings.tsx"
Cohesion: 0.15
Nodes (15): testUnraidConnection(), testUnraidDebugAction(), LegacySmbMigration(), LegacySmbMigrationProps, StorageConnectionForm(), StorageConnectionFormProps, StorageProtocolSelector(), StorageProtocolSelectorProps (+7 more)

### Community 60 - "fetch-stats-data.ts"
Cohesion: 0.17
Nodes (21): fetchStatsData(), statsResults, fetchOldestWatchEventYear(), fetchProviderIdToLocalUserMap(), fetchUserGroupMap(), fetchWatchHistory(), StatsScopedUser, AggregatedMedia (+13 more)

### Community 61 - "Navbar.tsx"
Cohesion: 0.06
Nodes (42): stopImpersonation(), MediaBackdrop(), MediaBackdropProps, MediaBackLink(), MediaHero(), ImpersonationBannerClient(), Props, NAVIGATION_ITEMS (+34 more)

### Community 62 - "stats-scheduler.ts"
Cohesion: 0.39
Nodes (7): checkCompletedDownloads(), globalForScheduler, MediaRequestLite, normalizeTitleForMatch(), startStatsScheduler(), titleMatchesTorrent(), upsertSetting()

### Community 63 - "media-status.ts"
Cohesion: 0.12
Nodes (13): cache, MemoCache, MemoCacheOptions, MemoGetOptions, earliest(), getArrAvailability(), isFuture(), isPast() (+5 more)

### Community 64 - "emby-tracker.ts"
Cohesion: 0.13
Nodes (30): getPrisma(), activeSessions, attachSessionIfPresent(), authenticateSocket(), broadcastSessions(), cleanupOrphanedSessions(), EmbyNowPlayingItem, EmbySessionItem (+22 more)

### Community 65 - "downloads/actions.ts"
Cohesion: 0.30
Nodes (17): addTorrent(), checkAccess(), deleteStoragePath(), deleteTorrents(), getCategories(), getGlobalStats(), getTags(), getTorrents() (+9 more)

### Community 66 - "TorrentFiltersBar.tsx"
Cohesion: 0.15
Nodes (16): ColumnsDropdown(), TagsSectionProps, SortDropdown(), SortDropdownProps, StatusFilterRow(), StatusFilterRowProps, TorrentActionBar(), TorrentActionBarProps (+8 more)

### Community 67 - "settings.ts"
Cohesion: 0.15
Nodes (14): dynamic, error(), log(), POST(), error(), log(), POST(), setSetting() (+6 more)

### Community 68 - "torrent-parser.ts"
Cohesion: 0.17
Nodes (18): extractAudio(), extractCodec(), extractEpisode(), extractLanguage(), extractPlatform(), extractQuality(), extractReleaseGroup(), extractSeason() (+10 more)

### Community 69 - "onyx.tsx"
Cohesion: 0.16
Nodes (16): PRIMARY_LABEL, RequestStatusButton(), RequestStatusButtonProps, SecondaryButton(), startOnyxPairing(), OnyxLoginPanel(), Step, DOTS (+8 more)

### Community 70 - "[id]/actions.ts"
Cohesion: 0.20
Nodes (14): requestAllSeasons(), requestSeason(), requestSeasons(), requestSelectedSeasons(), useRequestStatus(), SeasonRequestButtonProps, Season, SeasonSelectorModal() (+6 more)

### Community 71 - "RequestCard.tsx"
Cohesion: 0.16
Nodes (15): MediaPoster(), MediaPosterProps, RequestCard(), RequestCardProps, RequestCardMeta(), RequestCardMetaProps, RequestCardPoster(), RequestCardPosterProps (+7 more)

### Community 72 - "SystemMessageManagement.tsx"
Cohesion: 0.16
Nodes (13): BannerMessageSection(), BannerMessageSectionProps, PopupMessageSection(), PopupMessageSectionProps, SaveStatusAlert(), SaveStatusAlertProps, SystemMessageHeader(), SaveStatus (+5 more)

### Community 73 - "StorageManager.tsx"
Cohesion: 0.24
Nodes (14): BulkDeleteModal(), BulkDeleteModalProps, StatusIcon(), BulkDeleteResultModal(), BulkDeleteResultModalProps, DeleteStorageModal(), StorageManagerHeader(), StorageManagerHeaderProps (+6 more)

### Community 74 - "@tanstack/react-query"
Cohesion: 0.13
Nodes (17): SettingsPage(), bricolage, geistMono, metadata, RootLayout(), AbilityProvider(), DeploymentGuard(), reloadOnce() (+9 more)

### Community 75 - "SetupForm.tsx"
Cohesion: 0.19
Nodes (11): SetupModeToggle(), SetupModeToggleProps, SetupRestoreForm(), SetupRestoreFormProps, FormData, ServerType, useSetupForm(), dynamic (+3 more)

### Community 76 - "media-filters-options.ts"
Cohesion: 0.12
Nodes (28): FilterModal(), FilterModalProps, DEFAULT_MEDIA_FILTERS, LANGUAGES, PROVIDER_PREVIEW_LIMIT, REGIONS, SORT_OPTIONS, DateRangeCard() (+20 more)

### Community 77 - "TorrentManager.tsx"
Cohesion: 0.16
Nodes (16): BatchAction, BatchActionsBar(), BatchActionsBarProps, TorrentList(), TorrentListProps, TorrentManager(), useTorrentFilters(), useTorrentManagerActions() (+8 more)

### Community 78 - "LiveSessions.tsx"
Cohesion: 0.22
Nodes (12): formatSessionDisplay(), SessionDisplay, LiveSessionCard(), LiveSessionCardProps, LiveSessionsEmpty(), LiveSessionsHeader(), LiveSessionsHeaderProps, InterpolatedSession (+4 more)

### Community 79 - "evolution-provider.ts"
Cohesion: 0.19
Nodes (12): EvolutionProvider, isRetryable(), normalizeNumber(), summarizeError(), RetryOptions, sleep(), withRetry(), EvolutionConfig (+4 more)

### Community 80 - "sync-plugin/route.ts"
Cohesion: 0.13
Nodes (18): batchProcess(), dynamic, EmbyHistoryItem, error(), JellyfinPlayedItem, log(), PlexHistoryItem, POST() (+10 more)

### Community 81 - "DownloadStatusModal.tsx"
Cohesion: 0.21
Nodes (13): DownloadStatusModal(), DownloadStatusModalProps, NothingDownloading(), MovieDownloadProgress(), SeasonDownloadRow(), SeasonDownloadRowProps, SeasonInfo, StatusBadge() (+5 more)

### Community 82 - "notifications-v2-actions.ts"
Cohesion: 0.29
Nodes (12): useNotificationsV2(), assertAdmin(), getDefaultWebhookPayload(), getNotificationsV2Config(), getUsersForNotifications(), pingEvolutionApi(), saveNotificationsV2Config(), testEventNotification() (+4 more)

### Community 83 - "SupportChatbot.tsx"
Cohesion: 0.20
Nodes (12): DashboardTemplate(), installPhoneTransitionGuard(), dropAnimations(), SupportChatbot(), Category, ChatMessage, Subcategory, useSupportChat() (+4 more)

### Community 84 - "InfiniteRequestList.tsx"
Cohesion: 0.08
Nodes (28): MediaManagerButton(), MediaManagerButtonProps, FilterPillGroup(), FilterPillGroupProps, FilterPillOption, MediaTypeFilter, mediaTypeOptions, OwnershipFilter (+20 more)

### Community 85 - "DownloadSettings.tsx"
Cohesion: 0.43
Nodes (6): testProwlarrConnectionAction(), testQBittorrentConnectionAction(), testSorraaConnectionAction(), DownloadSettings(), Props, TestResult

### Community 86 - "LinkedAccounts.tsx"
Cohesion: 0.21
Nodes (13): AddMemberModal(), AddMemberModalProps, CreateGroupForm(), CreateGroupFormProps, GroupCard(), GroupCardProps, LinkedAccounts(), Candidate (+5 more)

### Community 87 - "stats/page.tsx"
Cohesion: 0.12
Nodes (22): StatsEmptyState(), StatsEmptyStateProps, StatsHeader(), StatsHeaderProps, PeriodButton(), PeriodButtonProps, StatsPeriodNav(), StatsPeriodNavProps (+14 more)

### Community 89 - "external-item-resolver.ts"
Cohesion: 0.36
Nodes (6): AccessDeniedFallback(), ExternalMediaFallback(), ExternalMediaFallbackProps, dynamic, MediaDetailsPage(), isExternalMediaId()

### Community 90 - "[file]/route.ts"
Cohesion: 0.17
Nodes (13): Context, GET(), posters, SIZES, createMemoCache(), extend(), frameThickness(), lineStats() (+5 more)

### Community 91 - "media-server-brand.ts"
Cohesion: 0.20
Nodes (12): ProviderFilterTabsProps, PROVIDERS, ProviderFilter, SourceFilter(), ServerType, SetupConfigureForm(), SetupConfigureFormProps, BRAND (+4 more)

### Community 92 - "webhook-provider.ts"
Cohesion: 0.20
Nodes (11): testWebhook(), buildPayload(), DEFAULT_WEBHOOK_PAYLOAD, getKeyValue(), KeyMap, KeyMapFn, parseKeys(), resolveUrl() (+3 more)

### Community 93 - "useStorageItems.ts"
Cohesion: 0.22
Nodes (14): EMPTY_PAGINATION, EMPTY_TOTALS, fetchStoragePage(), removeFromPages(), StoragePages, storageQueryKey(), translateStorageError(), useStorageItems() (+6 more)

### Community 94 - "ThemeProvider.tsx"
Cohesion: 0.24
Nodes (12): PREVIEWS, ThemeSwitcher(), ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), DEFAULT_THEME, isThemeId() (+4 more)

### Community 95 - "QBittorrentCache"
Cohesion: 0.12
Nodes (6): CacheState, describeFailure(), g, normalizeTorrent(), OnCacheChange, QBittorrentCache

### Community 97 - "SmbService"
Cohesion: 0.26
Nodes (4): testSmbConnection(), devError(), devLog(), SmbService

### Community 98 - "TorrentInfoCard.tsx"
Cohesion: 0.20
Nodes (18): EnrichedTorrentInfo, MediaInfoCard(), TorrentDetailsHeader(), TorrentDetailsHeaderProps, TorrentInfoCard(), TorrentInfoCardProps, TorrentSidebar(), TorrentSidebarProps (+10 more)

### Community 99 - "download-managers/index.ts"
Cohesion: 0.33
Nodes (8): ArrDownloadManager, getDownloadManager(), SETTING_KEYS, SorraaDownloadManager, AddRequestInput, AddRequestOutcome, DownloadManager, ManagerKind

### Community 100 - "_components/types.ts"
Cohesion: 0.21
Nodes (12): ArrSection(), ArrSectionProps, AutomationSettings(), Props, MaintenanceSettings(), SettingsFormFooter(), SettingsFormFooterProps, initialFormData (+4 more)

### Community 101 - "request-access/page.tsx"
Cohesion: 0.20
Nodes (11): Step1(), Step1Props, FormData, Step2(), Step2Props, Step3(), Step3Props, FormData (+3 more)

### Community 102 - "What was implemented"
Cohesion: 0.18
Nodes (10): 1. New Database Tables (Migration), 5. Updated Bootstrap, 6. Updated Public API, 8. Deprecated EvolutionListener, How it solves the original problems, Migration command, Notifications V2 — Implementation Summary, Rollback (if needed) (+2 more)

### Community 103 - "types/index.ts"
Cohesion: 0.25
Nodes (7): EmbyItem, EmbyMediaSource, EmbyMediaStream, EmbyNowPlayingItem, EmbyProviderIds, EmbySession, EmbyUserData

### Community 104 - "media-requests.ts"
Cohesion: 0.26
Nodes (9): dynamic, POST(), POST(), POST(), forget(), createMediaRequest(), CreateMediaRequestBody, CreateMediaRequestResult (+1 more)

### Community 105 - "DownloadsClient.tsx"
Cohesion: 0.20
Nodes (11): DownloadsHeader(), DownloadsHeaderProps, ProwlarrPanel(), QbitPanel(), SmbPanel(), SmbPanelProps, useDownloadsClient(), DownloadsClient() (+3 more)

### Community 106 - "TorrentStatsBar.tsx"
Cohesion: 0.27
Nodes (10): QbitPanelProps, TorrentStatsBar(), TorrentStatsBarProps, TorrentStats(), GlobalStats, QUERY_KEY, useGlobalStats(), formatRatio() (+2 more)

### Community 107 - "MediaCastSection.tsx"
Cohesion: 0.19
Nodes (11): CastList(), CastListProps, CastMember, MediaCastSection(), MediaCastSectionProps, CastMember, CrewMember, DEPT_TRANSLATIONS (+3 more)

### Community 108 - "media-page-data.ts"
Cohesion: 0.24
Nodes (14): loadMediaPageData(), MediaPageData, MediaPageDataResult, getSubscriptionStatus(), MediaDerivedMeta, MediaEmbyProgress, MediaSearchParams, NormalizedCastMember (+6 more)

### Community 109 - "services/tmdb.ts"
Cohesion: 0.09
Nodes (31): GET(), MediaType, TmdbCatalogItem, GET(), TmdbGenre, TmdbSeason, dynamic, GET() (+23 more)

### Community 110 - "media/page.tsx"
Cohesion: 0.23
Nodes (9): LibraryPage, MediaFilterPills(), MediaFilterPillsProps, MediaTypeTabs(), MediaTypeTabsProps, dynamic, MediaPage(), RecentlyWatched() (+1 more)

### Community 111 - "start-all.js"
Cohesion: 0.09
Nodes (20): http-proxy@^1.18.1, http-proxy, ACTION_MANIFEST, appProcess, fs, http, httpProxy, isStaleAction() (+12 more)

### Community 112 - "dependencies"
Cohesion: 0.04
Nodes (49): dependencies, axios@^1.13.2, basic-ftp@^5.0.5, bcryptjs@^3.0.3, better-sqlite3@^12.9.0, @casl/ability@^6.8.0, @casl/react@^5.0.1, clsx@^2.1.1 (+41 more)

### Community 113 - "MediaSidebar.tsx"
Cohesion: 0.23
Nodes (9): MediaCollection, MediaCollectionCard(), MediaCollectionCardProps, MediaInfoTable(), MediaInfoTableProps, MediaSidebar(), MediaSidebarProps, MediaWatchProviders() (+1 more)

### Community 114 - "media-emby-progress.ts"
Cohesion: 0.24
Nodes (10): POST(), EmbyApiEpisode, EmbyApiItem, EMPTY_PROGRESS, errorLog(), fetchMediaEmbyProgress(), log(), UserProgress (+2 more)

### Community 115 - "InfiniteMediaList.tsx"
Cohesion: 0.23
Nodes (13): InfiniteScrollTrigger(), MediaGrid(), MediaGridEmpty(), MediaGridLoading(), MediaGridMoreLoading(), MediaGridProps, withMediaType(), withMediaTypeCache (+5 more)

### Community 116 - "useInfiniteMedia.ts"
Cohesion: 0.27
Nodes (10): buildURLParams(), getCacheKey(), loadScrollCache(), parseFiltersFromURL(), saveScrollCache(), ScrollCache, useInfiniteMedia(), mapGenres() (+2 more)

### Community 117 - "SettingsFormData"
Cohesion: 0.19
Nodes (12): Props, EmbySettingsProps, JellyfinSettingsProps, LibrarySourceSettingsProps, Platform, LocalAuthSectionProps, PlexSettingsProps, RequestSettingsProps (+4 more)

### Community 118 - "radarr.ts"
Cohesion: 0.10
Nodes (15): GET(), POST(), StuckItemResponse, DEFAULT_CONFIG, getStuckImportDetector(), StuckImportConfig, StuckImportDetector, StuckItem (+7 more)

### Community 119 - "useUserActivity.ts"
Cohesion: 0.24
Nodes (9): UserActivityButton(), UserActivityButtonProps, ItemDetails, QUERY_KEY(), SeasonDetail, SeasonStat, useUserActivity(), UseUserActivityResult (+1 more)

### Community 120 - "dashboard/page.tsx"
Cohesion: 0.07
Nodes (53): RecentlyWatchedSection(), RecentlyWatchedSkeleton(), RecentRequestsSection(), RecentRequestsSkeleton(), RecommendationsSection(), RecommendationsSkeleton(), settle(), RequestItem() (+45 more)

### Community 121 - "dashboard/layout.tsx"
Cohesion: 0.43
Nodes (5): DashboardLayout(), dynamic, getDashboardConfig, IntentPrefetch(), SystemMessageDisplay()

### Community 123 - "FtpService"
Cohesion: 0.23
Nodes (6): error(), FileInfo, FtpService, log(), archiver@^7.0.1, archiver

### Community 124 - "login/actions.ts"
Cohesion: 0.52
Nodes (5): checkPlexAuthPin(), getPlexAuthPin(), logError(), usePlexOAuth(), UsePlexOAuthResult

### Community 125 - "SystemMessageBanner.tsx"
Cohesion: 0.43
Nodes (5): SystemMessageBanner(), logError(), SystemMessageBanner, useSystemMessageBanner(), UseSystemMessageBannerResult

### Community 126 - "service-factories.ts"
Cohesion: 0.18
Nodes (20): error(), log(), POST(), warn(), ExternalItemResolution, fetchExternalItem(), resolveExternalItem(), resolveTmdbIdFromName() (+12 more)

### Community 127 - "prisma.ts"
Cohesion: 0.27
Nodes (7): error(), log(), POST(), warn(), buildWhereClause(), prisma, verifyWebhookSecret()

### Community 128 - "useSystemUpdate.ts"
Cohesion: 0.31
Nodes (8): ContainerStatusCard(), ContainerStatusCardProps, ChangelogCategory, ChangelogVersion, ContainerUpdateStatus, SystemUpdateStatus, useSystemUpdate(), SystemUpdate()

### Community 129 - "package.json"
Cohesion: 0.06
Nodes (41): eslintConfig, devDependencies, babel-plugin-react-compiler@1.0.0, cross-env@^10.1.0, drizzle-kit@^0.31.10, eslint@^9, eslint-config-next@16.1.1, tailwindcss@^4 (+33 more)

### Community 130 - "ShareManagerModal.tsx"
Cohesion: 0.47
Nodes (5): ShareManagerModal(), ShareManagerModalProps, deletePublicShare(), listPublicShares(), ShareListItem

### Community 131 - "UserSyncButtons.tsx"
Cohesion: 0.60
Nodes (4): SYNC_BUTTONS, SyncButtonConfig, UserSyncButtonsProps, SyncProvider

### Community 132 - "services/emby.ts"
Cohesion: 0.11
Nodes (16): getHttpsAgent(), insecureHttpsAgent, KEEP_ALIVE, keepAliveHttpAgent, strictHttpsAgent, serverIds, TmdbIndex, tmdbIndexes (+8 more)

### Community 135 - "MediaOverviewSection.tsx"
Cohesion: 0.29
Nodes (7): MediaCrewGrid(), MediaCrewGridProps, MediaKeyword, MediaKeywords(), MediaKeywordsProps, MediaOverviewSection(), MediaOverviewSectionProps

### Community 137 - "MaintenanceSettings.tsx"
Cohesion: 0.38
Nodes (6): ApiResponse, formatBytes(), formatDuration(), Stats, StuckImportsManager(), StuckItem

### Community 139 - "patch-allowed-origins.js"
Cohesion: 0.22
Nodes (11): DATABASE_URL, entrypoint.sh script, collectRuntimeOrigins(), CONFIG_FILE, fs, main(), mergeOrigins(), patchRequiredServerFiles() (+3 more)

### Community 140 - "watch-sync.ts"
Cohesion: 0.33
Nodes (6): dynamic, GET(), EmbySession, error(), log(), syncActiveSessions()

### Community 142 - "StatsCharts.tsx"
Cohesion: 0.29
Nodes (7): ActivityChartProps, ActivityChart, ActivityData, StatsCharts(), StatsChartsProps, UserStat, StatsDataResult

### Community 143 - "me/page.tsx"
Cohesion: 0.18
Nodes (14): TopItemCard(), TopItemCardProps, TopItemsTabs(), TopItemsTabsProps, dynamic, PeriodButton(), sanitizePlaybackDuration(), SourceBadge() (+6 more)

### Community 147 - "recreate-containers.js"
Cohesion: 0.36
Nodes (8): cleanEndpointsConfig(), dockerAPI(), fs, http, log(), recreate(), safelyDeleteOldImage(), sleep()

### Community 148 - "next"
Cohesion: 0.06
Nodes (43): dynamic, GET(), POST(), dynamic, GET(), dynamic, GET(), POST() (+35 more)

### Community 150 - "OnyxSettings.tsx"
Cohesion: 0.16
Nodes (10): adminCall(), OnyxLinkCard(), OnyxSettings(), OnyxSettingsProps, OnyxStatus, randomKey(), api, ApiClient (+2 more)

### Community 157 - "useMediaSettingsTests.ts"
Cohesion: 0.60
Nodes (5): testEmbyConnection(), testJellyfinConnection(), testPlexConnection(), importPlexHistoryAction(), useMediaSettingsTests()

### Community 166 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 167 - "system-update.ts"
Cohesion: 0.15
Nodes (13): GET(), getUploadDir(), POST(), resolveDbPath(), clearUpdateNotifications(), FileInfo, ContainerUpdateStatus, docker (+5 more)

### Community 171 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 177 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 231 - "scripts/verify-sorraa.ts"
Cohesion: 0.07
Nodes (22): Côté client, Côté serveur, Performance — conventions, accounts, Json, loggedOut, onyxUser(), startFakeOnyx() (+14 more)

## Knowledge Gaps
- **2 isolated node(s):** `DATABASE_URL`, `ADR-0102`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 888 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `SupportCategoriesConfig.tsx` to `auth.ts`, `schema.ts`, `ProwlarrSearch.tsx`, `NotificationsV2.tsx`, `RoleEditor.tsx`, `media/actions.ts`, `AccountRequest`, `_utils/activity-logs.ts`, `group-actions.ts`, `MotionDirector.tsx`, `drizzle.ts`, `LoginForm.tsx`, `download-status-actions.ts`, `file-actions.ts`, `UserManagement.tsx`, `getCurrentUser`, `Torrent`, `SeasonList.tsx`, `MediaCard.tsx`, `torrent/FilterModal.tsx`, `StorageFilterBar.tsx`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `StorageItem`, `ManageMediaModal.tsx`, `NotificationEvent`, `TorrentModals.tsx`, `MediaPageContent.tsx`, `NotificationItem.tsx`, `SettingsFormData`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `TorrentFiltersBar.tsx`, `onyx.tsx`, `[id]/actions.ts`, `RequestCard.tsx`, `SystemMessageManagement.tsx`, `StorageManager.tsx`, `@tanstack/react-query`, `SetupForm.tsx`, `media-filters-options.ts`, `TorrentManager.tsx`, `LiveSessions.tsx`, `notifications-v2-actions.ts`, `SupportChatbot.tsx`, `InfiniteRequestList.tsx`, `DownloadSettings.tsx`, `LinkedAccounts.tsx`, `stats/page.tsx`, `media-server-brand.ts`, `useStorageItems.ts`, `ThemeProvider.tsx`, `TorrentInfoCard.tsx`, `_components/types.ts`, `request-access/page.tsx`, `DownloadsClient.tsx`, `MediaCastSection.tsx`, `services/tmdb.ts`, `media/page.tsx`, `dependencies`, `InfiniteMediaList.tsx`, `useInfiniteMedia.ts`, `useUserActivity.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `login/actions.ts`, `SystemMessageBanner.tsx`, `useSystemUpdate.ts`, `package.json`, `ShareManagerModal.tsx`, `MaintenanceSettings.tsx`, `StatsCharts.tsx`, `me/page.tsx`, `next`, `OnyxSettings.tsx`, `useMediaSettingsTests.ts`?**
  _High betweenness centrality (0.216) - this node is a cross-community bridge._
- **What connects `DATABASE_URL`, `ADR-0102` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getTmdbServiceForUser` be split into smaller, more focused modules?**
  _Cohesion score 0.1452991452991453 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `getTmdbServiceForUser`, `package.json`, `logger.ts`, `auth.ts`, `schema.ts`, `ProwlarrSearch.tsx`, `MediaOverviewSection.tsx`, `media/actions.ts`, `player-v1.ts`, `EmbyService`, `bootstrap.ts`, `_utils/activity-logs.ts`, `watch-sync.ts`, `StatsCharts.tsx`, `getRealUser`, `drizzle.ts`, `me/page.tsx`, `LoginForm.tsx`, `jellyseerr-import.ts`, `MotionDirector.tsx`, `interactive-search.ts`, `UserManagement.tsx`, `storage-list.ts`, `getCurrentUser`, `getSetting`, `Torrent`, `onyx/route.ts`, `SeasonList.tsx`, `onyx-link/route.ts`, `MediaCard.tsx`, `system-update.ts`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `next.config.ts`, `ManageMediaModal.tsx`, `TorrentModals.tsx`, `NotificationItem.tsx`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `Navbar.tsx`, `downloads/actions.ts`, `settings.ts`, `onyx.tsx`, `[id]/actions.ts`, `RequestCard.tsx`, `@tanstack/react-query`, `SetupForm.tsx`, `LiveSessions.tsx`, `sync-plugin/route.ts`, `SupportChatbot.tsx`, `InfiniteRequestList.tsx`, `stats/page.tsx`, `external-item-resolver.ts`, `[file]/route.ts`, `media-server-brand.ts`, `useStorageItems.ts`, `TorrentInfoCard.tsx`, `_components/types.ts`, `request-access/page.tsx`, `media-requests.ts`, `DownloadsClient.tsx`, `MediaCastSection.tsx`, `services/tmdb.ts`, `media/page.tsx`, `dependencies`, `MediaSidebar.tsx`, `useInfiniteMedia.ts`, `radarr.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `login/actions.ts`, `service-factories.ts`, `prisma.ts`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Should `logger.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.044069112793632306 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `_components/types.ts` to `getTmdbServiceForUser`, `useSystemUpdate.ts`, `package.json`, `UserSyncButtons.tsx`, `storage.ts`, `ProwlarrSearch.tsx`, `NotificationsV2.tsx`, `RoleEditor.tsx`, `MaintenanceSettings.tsx`, `AccountRequest`, `media/actions.ts`, `StatsCharts.tsx`, `_utils/activity-logs.ts`, `group-actions.ts`, `me/page.tsx`, `LoginForm.tsx`, `download-status-actions.ts`, `OnyxSettings.tsx`, `UserManagement.tsx`, `Torrent`, `SeasonList.tsx`, `MediaCard.tsx`, `torrent/FilterModal.tsx`, `StorageFilterBar.tsx`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `StorageItem`, `ManageMediaModal.tsx`, `NotificationEvent`, `SupportCategoriesConfig.tsx`, `TorrentModals.tsx`, `MediaPageContent.tsx`, `NotificationItem.tsx`, `SettingsFormData`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `TorrentFiltersBar.tsx`, `onyx.tsx`, `[id]/actions.ts`, `RequestCard.tsx`, `SystemMessageManagement.tsx`, `StorageManager.tsx`, `SetupForm.tsx`, `media-filters-options.ts`, `TorrentManager.tsx`, `LiveSessions.tsx`, `DownloadStatusModal.tsx`, `SupportChatbot.tsx`, `InfiniteRequestList.tsx`, `DownloadSettings.tsx`, `LinkedAccounts.tsx`, `stats/page.tsx`, `media-server-brand.ts`, `ThemeProvider.tsx`, `TorrentInfoCard.tsx`, `request-access/page.tsx`, `DownloadsClient.tsx`, `TorrentStatsBar.tsx`, `MediaCastSection.tsx`, `media/page.tsx`, `dependencies`, `InfiniteMediaList.tsx`, `SettingsFormData`, `useUserActivity.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `SystemMessageBanner.tsx`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1147086031452359 - nodes in this community are weakly interconnected._