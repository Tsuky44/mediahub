# Graph Report - next-app  (2026-11-10)

## Corpus Check
- 719 files · ~294,995 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .css 4, (none) 3, .ico 1)

## Summary
- 3871 nodes · 11020 edges · 164 communities (154 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 112 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7c9afdb1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- defineAbilityFor
- item-viewing-stats.ts
- event-store.ts
- auth/index.ts
- storage.ts
- getSession
- useProwlarrSearch.ts
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
- watch-later-actions.ts
- Torrent
- file-actions.ts
- interactive-search.ts
- UserManagement.tsx
- services/sonarr.ts
- download-managers/sorraa.ts
- storage-list.ts
- getCurrentUser
- ProwlarrSearch.tsx
- Torrent
- onyx-directory.ts
- SeasonList.tsx
- notifications-v2-actions.ts
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
- SystemUpdateService
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
- storage-onyx.ts
- media-status.ts
- emby-tracker.ts
- downloads/actions.ts
- TorrentFiltersBar.tsx
- torrent-parser.ts
- prowlarr-actions.ts
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
- NotificationsV2.tsx
- SeasonList.tsx
- InfiniteRequestList.tsx
- getCurrentUser
- LinkedAccounts.tsx
- StatsHeader.tsx
- TmdbService
- external-item-resolver.ts
- storage/route.ts
- media-server-brand.ts
- login/page.tsx
- useStorageItems.ts
- ThemeProvider.tsx
- QBittorrentCache
- RadarrService
- getSetting
- ImportProgressList.tsx
- download-managers/index.ts
- _components/types.ts
- request-access/page.tsx
- What was implemented
- UserStatsCard.tsx
- sync-plugin/route.ts
- downloads/page.tsx
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
- SettingsFormData
- download-status-actions.ts
- useUserActivity.ts
- dashboard/page.tsx
- dashboard/layout.tsx
- prowlarr.ts
- FtpService
- login/actions.ts
- SystemMessageBanner.tsx
- sync/route.ts
- emby/route.ts
- useSystemUpdate.ts
- package.json
- webhook-provider.ts
- bootstrap.ts
- services/jellyfin.ts
- MediaSyncService
- group-actions.ts
- MediaOverviewSection.tsx
- RecentHistory.tsx
- services/plex.ts
- QbitWatchPoller
- patch-allowed-origins.js
- watch-sync.ts
- system-update.ts
- StatsCharts.tsx
- me/page.tsx
- useEpisodeHighlight.ts
- services/emby.ts
- support-discord.ts
- recreate-containers.js
- RequestCardPoster.tsx
- upload/route.ts
- OnyxSettings.tsx
- Côté serveur
- DeleteStorageModal.tsx
- episodeImportBatcher
- useMediaSettingsTests.ts
- next-auth.d.ts
- scripts
- next
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
- `5. Updated Bootstrap` --references--> `OutboxWorker`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/notifications-v2/outbox/outbox-worker.ts
- `7. Updated Pollers` --references--> `seedExistingEvents()`  [INFERRED]
  NOTIFICATIONS_V2_IMPLEMENTATION.md → lib/notifications-v2/store/event-store.ts
- `Côté serveur` --references--> `isInWatchLater()`  [INFERRED]
  PERFORMANCE.md → app/dashboard/media/watch-later-actions.ts
- `Côté serveur` --references--> `getCurrentUser()`  [INFERRED]
  PERFORMANCE.md → lib/auth/index.ts
- `Côté serveur` --references--> `createAxiosClient()`  [INFERRED]
  PERFORMANCE.md → lib/http-client.ts

## Import Cycles
- None detected.

## Communities (164 total, 10 thin omitted)

### Community 0 - "defineAbilityFor"
Cohesion: 0.11
Nodes (29): GET(), DELETE(), GET(), InfiniteDiscoverList(), InfiniteDiscoverListProps, DiscoverPage(), SearchActionsProps, checkPermission() (+21 more)

### Community 1 - "item-viewing-stats.ts"
Cohesion: 0.12
Nodes (28): dynamic, maxDuration, POST(), dynamic, GET(), toMediaInfo(), yearOf(), dynamic (+20 more)

### Community 2 - "event-store.ts"
Cohesion: 0.11
Nodes (18): buildDedupKey(), parseDedupKey(), PERMANENT_DEDUP_EVENTS, seasonSegment(), assertEqual(), MOVIE_MEDIA, REQUESTER, runTests() (+10 more)

### Community 3 - "auth/index.ts"
Cohesion: 0.16
Nodes (15): handler, GET(), authOptions, embyProvider, jellyfinProvider, localProvider, plexProvider, checkRateLimit() (+7 more)

### Community 4 - "storage.ts"
Cohesion: 0.27
Nodes (11): SeasonsSection(), SeasonsSectionProps, StorageDetailsFooter(), StorageDetailsFooterProps, UserActivitySection(), UserActivitySectionProps, StorageDetailsModal(), StorageDetailsModalProps (+3 more)

### Community 5 - "getSession"
Cohesion: 0.07
Nodes (40): dynamic, error(), log(), POST(), dynamic, GET(), POST(), dynamic (+32 more)

### Community 6 - "useProwlarrSearch.ts"
Cohesion: 0.18
Nodes (21): ProwlarrCategory, ProwlarrIndexer, ProwlarrRelease, ProwlarrSearchSource, ProwlarrSortBy, ProwlarrSortOrder, buildTvQuery(), CATEGORIES (+13 more)

### Community 7 - "onyx-link/route.ts"
Cohesion: 0.14
Nodes (33): dynamic, GET(), publicOrigin(), clientIp(), DELETE(), GET(), POST(), findUserByOnyxId() (+25 more)

### Community 8 - "outbox-worker.ts"
Cohesion: 0.20
Nodes (14): notificationEvents, buildPosterUrl(), globalForWorker, claimDueDeliveries(), ClaimResult, enqueueDelivery(), EnqueueParams, isEventFullyDispatched() (+6 more)

### Community 9 - "RoleEditor.tsx"
Cohesion: 0.09
Nodes (35): startImpersonation(), RoleEditor(), RoleEditorProps, RoleManagement(), DefaultRoleSelector(), DefaultRoleSelectorProps, PermissionCheckbox(), PermissionCheckboxProps (+27 more)

### Community 10 - "media/actions.ts"
Cohesion: 0.10
Nodes (33): classifyLibraryError(), error(), fetchEmbyMedia(), fetchOnyxMedia(), fetchRecentlyWatchedItems(), fetchServerTrends(), fetchUserRecommendations(), getSeriesTmdbId() (+25 more)

### Community 11 - "AccountRequest"
Cohesion: 0.10
Nodes (31): markWelcomeAsSeen(), WelcomePopup(), WelcomePopupProps, loadServerInfo(), ServerInfo, ServerType, useAvailabilityServerName(), useIsOnyxAccount() (+23 more)

### Community 12 - "player-v1.ts"
Cohesion: 0.10
Nodes (51): dynamic, GET(), dynamic, POST(), dynamic, FEATURES, GET(), dynamic (+43 more)

### Community 13 - "EmbyService"
Cohesion: 0.11
Nodes (5): syncEmbyLike(), EmbyService, error(), log(), warn()

### Community 14 - "dashboard-actions.ts"
Cohesion: 0.11
Nodes (21): DashboardSearchBarProps, checkServicesHealth(), execPromise, getDashboardStats(), liveSearch(), MediaRequestLite, readLibraryStats(), TmdbSearchItem (+13 more)

### Community 15 - "_utils/activity-logs.ts"
Cohesion: 0.13
Nodes (30): ActivityLogRow(), ActivityLogRowProps, ActivityLogsPagination(), ActivityLogsPaginationProps, ActivityLogsTable(), ActivityLogsTableProps, ActivityLogsToolbar(), ActivityLogsToolbarProps (+22 more)

### Community 16 - "group-actions.ts"
Cohesion: 0.16
Nodes (23): AddMemberForm(), AddMemberFormProps, GroupEditForm(), GroupEditFormProps, GroupHeader(), GroupHeaderProps, MembersEmpty(), MembersList() (+15 more)

### Community 17 - "MotionDirector.tsx"
Cohesion: 0.09
Nodes (53): arrived(), BACKDROP, backdropHeight(), backdropImage(), calm(), clearNav(), clearNavLater(), depth() (+45 more)

### Community 18 - "getRealUser"
Cohesion: 0.07
Nodes (31): DELETE(), dynamic, GET(), PUT(), revalidate, dynamic, GET(), POST() (+23 more)

### Community 19 - "next"
Cohesion: 0.05
Nodes (61): dynamic, dynamic, POST(), dynamic, dynamic, GET(), dynamic, POST() (+53 more)

### Community 20 - "LoginForm.tsx"
Cohesion: 0.17
Nodes (21): CredentialsForm(), CredentialsFormProps, PlexOAuthButton(), PROVIDER_OPTIONS, ProviderSelector(), ProviderSelectorProps, log(), logError() (+13 more)

### Community 21 - "watch-later-actions.ts"
Cohesion: 0.09
Nodes (24): dynamic, POST(), dynamic, POST(), dynamic, POST(), dynamic, POST() (+16 more)

### Community 22 - "Torrent"
Cohesion: 0.16
Nodes (20): EnrichedTorrentInfo, MediaInfoCard(), TorrentDetailsHeader(), TorrentDetailsHeaderProps, TorrentInfoCard(), TorrentInfoCardProps, TorrentSidebar(), TorrentSidebarProps (+12 more)

### Community 23 - "file-actions.ts"
Cohesion: 0.11
Nodes (29): deleteSmbPath(), DeleteFileModal(), DeleteFileModalProps, FileManagerHeader(), FileManagerHeaderProps, FileManagerRow(), FileManagerRowProps, formatFileSize() (+21 more)

### Community 24 - "interactive-search.ts"
Cohesion: 0.07
Nodes (31): dynamic, GET(), parseNumber(), parseTarget(), POST(), getManagerKind(), canInteractiveSearch(), ChosenRelease (+23 more)

### Community 25 - "UserManagement.tsx"
Cohesion: 0.15
Nodes (24): UserManagement(), UserManagementProps, CreateUserModal(), CreateUserModalProps, EMPTY_FORM, NotificationsEditor(), NotificationsEditorProps, ProviderFilterTabs() (+16 more)

### Community 26 - "services/sonarr.ts"
Cohesion: 0.14
Nodes (9): RETRY, strictHttpsAgent, breakers, CircuitBreaker, createAxiosClient(), getKey(), inFlight, isRetryable() (+1 more)

### Community 27 - "download-managers/sorraa.ts"
Cohesion: 0.08
Nodes (37): dynamic, POST(), SorraaWebhookPayload, syncRequestStatuses(), ACTIVE_GRAB_STATUSES, availabilityFromSorraa(), best(), formatBytes() (+29 more)

### Community 28 - "storage-list.ts"
Cohesion: 0.09
Nodes (29): StorageSortDir, matchesDateFilter(), monthsAgo(), buildLastPlayedMap(), compareSortValues(), computeDates(), dateIndexes, fetchAllItems() (+21 more)

### Community 29 - "getCurrentUser"
Cohesion: 0.09
Nodes (23): dynamic, GET(), dynamic, POST(), requestSchema, dynamic, error(), GET() (+15 more)

### Community 30 - "ProwlarrSearch.tsx"
Cohesion: 0.14
Nodes (18): ProwlarrPanel(), ProwlarrPanelProps, ProwlarrEpisode, ProwlarrSeason, ProwlarrBulkBar(), ProwlarrBulkBarProps, ProwlarrPagination(), ProwlarrPaginationProps (+10 more)

### Community 31 - "Torrent"
Cohesion: 0.24
Nodes (15): TorrentFiltersBarProps, TorrentRowComponent(), TorrentRowProps, VisibleColumns, TorrentRowFooter(), TorrentRowFooterProps, TorrentRowHeader(), TorrentRowHeaderProps (+7 more)

### Community 32 - "onyx-directory.ts"
Cohesion: 0.05
Nodes (44): dynamic, GET(), hintOf(), linkOnyx(), newKey(), POST(), requireAdmin(), rotateKey() (+36 more)

### Community 33 - "SeasonList.tsx"
Cohesion: 0.12
Nodes (30): getSeasonDetails(), requestSeason(), requestSeasons(), SearchActions(), EpisodeCard(), EpisodeCardProps, SeasonBubbleProps, EpisodeSkeleton() (+22 more)

### Community 34 - "notifications-v2-actions.ts"
Cohesion: 0.19
Nodes (18): EvolutionApiSectionProps, EvolutionConfig, useNotificationsV2(), assertAdmin(), getDefaultWebhookPayload(), getNotificationsV2Config(), getUsersForNotifications(), pingEvolutionApi() (+10 more)

### Community 35 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 36 - "MediaCard.tsx"
Cohesion: 0.12
Nodes (24): LibraryProblem, CollectionPage(), EmptyLibrary(), InfiniteEmbyList(), InfiniteEmbyListProps, RETRY, SOURCE_NAME, getFramelessPosterUrl() (+16 more)

### Community 37 - "Changelog"
Cohesion: 0.10
Nodes (19): [0.9.60] - 2026-06-10, [0.9.676] - 2026-07-07, [0.9.677] - 2026-07-07, [0.9.678] - 2026-07-08, [0.9.680] - 2026-07-09, [0.9.683] - 2026-07-10, Added, Added (+11 more)

### Community 38 - "torrent/FilterModal.tsx"
Cohesion: 0.11
Nodes (19): FilterConfigBar(), FilterConfigBarProps, FilterModalFooter(), FilterModalFooterProps, FilterModalHeader(), FilterModalHeaderProps, PeriodSection(), PeriodSectionProps (+11 more)

### Community 39 - "StorageFilterBar.tsx"
Cohesion: 0.11
Nodes (28): FilterSelect(), FilterSelectOption, FilterSelectProps, ADDED_MODES, chipClass(), ChipLabel(), DateFilterControl(), ModeOption (+20 more)

### Community 40 - "[hash]/actions.ts"
Cohesion: 0.19
Nodes (20): error(), fetchRelatedRequests(), fetchTMDBInfo(), findIndexerIdForTracker(), formatBytes(), formatSpeed(), getProwlarrIndexersMap(), getTorrentDetails() (+12 more)

### Community 41 - "SettingsTabsContent.tsx"
Cohesion: 0.18
Nodes (20): SettingsTabButton(), SettingsTabButtonProps, SettingsTabsContent(), SettingsTabsContentProps, SettingsTabsNav(), SettingsTabsNavProps, SettingsTabs(), isSettingsTabId() (+12 more)

### Community 42 - "SonarrService"
Cohesion: 0.16
Nodes (4): DELETE(), findSonarrSeries(), cached(), SonarrService

### Community 43 - "QBittorrentService"
Cohesion: 0.14
Nodes (3): error(), log(), QBittorrentService

### Community 44 - "HistoryItem.tsx"
Cohesion: 0.18
Nodes (15): buildHref(), HistoryItem(), HistoryItemProps, HistoryItemMeta(), HistoryItemMetaProps, HistoryItemThumbnail(), HistoryItemThumbnailProps, TopItemCard() (+7 more)

### Community 45 - "template-renderer.ts"
Cohesion: 0.13
Nodes (21): DispatchResult, NotificationStore, Notify, WatchEntry, DEFAULT_TEMPLATES, TemplateVariants, TemplateRenderer, assertEqual() (+13 more)

### Community 46 - "StorageItem"
Cohesion: 0.19
Nodes (18): formatRuntime(), SERIES_STATUS, StorageDetailsHeader(), StorageDetailsHeaderProps, StorageMobileItemProps, PosterItem, StoragePoster(), StoragePosterProps (+10 more)

### Community 47 - "SystemUpdateService"
Cohesion: 0.23
Nodes (4): clearUpdateNotifications(), followsBranchTag(), SystemUpdateService, VersionService

### Community 48 - "ManageMediaModal.tsx"
Cohesion: 0.20
Nodes (18): MediaRequestRow(), MediaRequestRowProps, MediaRequestsSection(), MediaRequestsSectionProps, getStatusClasses(), MediaServiceStatusSection(), MediaServiceStatusSectionProps, STATUS_LABELS (+10 more)

### Community 49 - "NotificationEvent"
Cohesion: 0.10
Nodes (23): EventAccordionItem(), EventAccordionItemProps, EventRouteCard(), EventRouteCardProps, EventRouteConfig, EventRouteConfig, EventsSectionProps, EventUserSelector() (+15 more)

### Community 50 - "SupportCategoriesConfig.tsx"
Cohesion: 0.11
Nodes (19): DiscordMentionsManager(), MentionItem, parseMentions(), serializeMentions(), SupportCategoriesConfig(), SubTab, SupportManagement(), statusColors (+11 more)

### Community 51 - "TorrentModals.tsx"
Cohesion: 0.13
Nodes (18): AddTorrentModal(), AddTorrentModalProps, DeleteTorrentModal(), DeleteTorrentModalProps, SearchModal(), SearchModalProps, ShareLimitModalProps, ShareLimitType (+10 more)

### Community 52 - "MediaPageContent.tsx"
Cohesion: 0.17
Nodes (14): MediaActionsRowProps, MediaAvailabilityBadges(), MediaAvailabilityBadgesProps, MediaPageContentProps, MediaPrimaryActions(), MediaPrimaryActionsProps, MediaRelatedSliders(), MediaRelatedSlidersProps (+6 more)

### Community 53 - "NotificationItem.tsx"
Cohesion: 0.50
Nodes (5): NotificationItem(), NotificationItemProps, Notification, useNotifications(), NotificationsPage()

### Community 54 - "SettingsFormData"
Cohesion: 0.34
Nodes (13): EmbySettings(), JellyfinSettings(), LibrarySourceSettings(), Platform, LocalAuthSection(), PlexSettings(), RequestSettings(), MediaSettings() (+5 more)

### Community 55 - "BackupManagement.tsx"
Cohesion: 0.15
Nodes (18): BackupExportCard(), BackupExportCardProps, BackupImportCard(), BackupImportCardProps, PasswordInput(), PasswordInputColor, PasswordInputProps, RING_CLASSES (+10 more)

### Community 56 - "cn"
Cohesion: 0.11
Nodes (31): backdropUrlOf(), CalendarEvent, error(), getCalendarEvents(), log(), RadarrCalendarMovie, SonarrCalendarEpisode, TmdbEpisode (+23 more)

### Community 57 - "MediaActionsRow.tsx"
Cohesion: 0.14
Nodes (23): addToCalendar(), removeFromCalendar(), MediaActionsRow(), MenuItem(), MobileActionsMenu(), ManageMediaButton(), ManageMediaButtonProps, toggleSubscription() (+15 more)

### Community 58 - "QuickActions.tsx"
Cohesion: 0.13
Nodes (25): DASHBOARD_CARD, DASHBOARD_EYEBROW, DashboardSearchBar(), LibraryStatsCard(), LibraryStatsCardProps, LINKS, QuickNavCards(), ServerStatusCard() (+17 more)

### Community 59 - "StorageSettings.tsx"
Cohesion: 0.20
Nodes (13): testUnraidDebugAction(), LegacySmbMigration(), LegacySmbMigrationProps, StorageConnectionForm(), StorageConnectionFormProps, StorageProtocolSelector(), StorageProtocolSelectorProps, UnraidSettings() (+5 more)

### Community 60 - "fetch-stats-data.ts"
Cohesion: 0.17
Nodes (21): fetchStatsData(), statsResults, fetchOldestWatchEventYear(), fetchProviderIdToLocalUserMap(), fetchUserGroupMap(), fetchWatchHistory(), StatsScopedUser, AggregatedMedia (+13 more)

### Community 61 - "Navbar.tsx"
Cohesion: 0.07
Nodes (42): stopImpersonation(), MediaBackdrop(), MediaBackdropProps, MediaBackLink(), MediaHero(), ImpersonationBannerClient(), Props, NAVIGATION_ITEMS (+34 more)

### Community 62 - "storage-onyx.ts"
Cohesion: 0.14
Nodes (21): ViewingStat, OnyxStorageItem, buildRequestedDateMap(), DateMaps, toTimestamp(), datesOf(), deleted, fetchOnyxStoragePage() (+13 more)

### Community 63 - "media-status.ts"
Cohesion: 0.07
Nodes (33): GET(), MediaType, TmdbCatalogItem, GET(), TmdbGenre, TmdbSeason, dynamic, GET() (+25 more)

### Community 64 - "emby-tracker.ts"
Cohesion: 0.10
Nodes (36): getPrisma(), dotenv@^17.2.3, socket.io@^4.8.3, ws@^8.19.0, dotenv, socket.io, ws, activeSessions (+28 more)

### Community 65 - "downloads/actions.ts"
Cohesion: 0.30
Nodes (17): addTorrent(), checkAccess(), deleteStoragePath(), deleteTorrents(), getCategories(), getGlobalStats(), getTags(), getTorrents() (+9 more)

### Community 66 - "TorrentFiltersBar.tsx"
Cohesion: 0.16
Nodes (15): ColumnsDropdown(), ColumnsDropdownProps, SortDropdown(), SortDropdownProps, StatusFilterRow(), StatusFilterRowProps, TorrentActionBar(), TorrentActionBarProps (+7 more)

### Community 67 - "torrent-parser.ts"
Cohesion: 0.17
Nodes (18): extractAudio(), extractCodec(), extractEpisode(), extractLanguage(), extractPlatform(), extractQuality(), extractReleaseGroup(), extractSeason() (+10 more)

### Community 68 - "prowlarr-actions.ts"
Cohesion: 0.24
Nodes (16): checkPermission(), downloadMediaRelease(), downloadTorrent(), error(), getProwlarrIndexers(), getSonarrEpisodes(), searchMediaReleases(), searchProwlarr() (+8 more)

### Community 69 - "formatReleaseDate"
Cohesion: 0.29
Nodes (8): getStatusIcon(), getStatusText(), RequestStatusBadge(), RequestStatusBadgeProps, DOTS, MediaCardStatus(), MediaCardStatusProps, formatReleaseDate()

### Community 70 - "onyx.tsx"
Cohesion: 0.16
Nodes (20): requestAllSeasons(), requestSelectedSeasons(), PRIMARY_LABEL, RequestStatusButton(), RequestStatusButtonProps, SecondaryButton(), useRequestStatus(), Season (+12 more)

### Community 71 - "RequestCard.tsx"
Cohesion: 0.19
Nodes (12): RequestCard(), RequestCardProps, RequestCardMeta(), RequestCardMetaProps, RequestListItemsProps, PosterUrls, resolvePosterUrls(), getAwaitingReleaseInfo() (+4 more)

### Community 72 - "SystemMessageManagement.tsx"
Cohesion: 0.16
Nodes (13): BannerMessageSection(), BannerMessageSectionProps, PopupMessageSection(), PopupMessageSectionProps, SaveStatusAlert(), SaveStatusAlertProps, SystemMessageHeader(), SaveStatus (+5 more)

### Community 73 - "StorageManager.tsx"
Cohesion: 0.25
Nodes (14): BulkDeleteModal(), BulkDeleteModalProps, StatusIcon(), BulkDeleteResultModal(), BulkDeleteResultModalProps, DeleteStorageModal(), StorageManagerHeader(), StorageManagerHeaderProps (+6 more)

### Community 74 - "@tanstack/react-query"
Cohesion: 0.15
Nodes (15): bricolage, geistMono, metadata, RootLayout(), SupportChatbot(), AbilityProvider(), DeploymentGuard(), reloadOnce() (+7 more)

### Community 75 - "SetupForm.tsx"
Cohesion: 0.18
Nodes (12): SetupConfigureForm(), SetupModeToggle(), SetupModeToggleProps, SetupRestoreForm(), SetupRestoreFormProps, FormData, ServerType, useSetupForm() (+4 more)

### Community 76 - "media-filters-options.ts"
Cohesion: 0.11
Nodes (31): getFilterOptions(), getWatchProviders(), FilterModal(), FilterModalProps, DEFAULT_MEDIA_FILTERS, LANGUAGES, PROVIDER_PREVIEW_LIMIT, REGIONS (+23 more)

### Community 77 - "TorrentManager.tsx"
Cohesion: 0.15
Nodes (17): BatchAction, BatchActionsBar(), BatchActionsBarProps, TorrentList(), TorrentListProps, TorrentRow, TorrentManager(), useTorrentFilters() (+9 more)

### Community 78 - "LiveSessions.tsx"
Cohesion: 0.22
Nodes (12): formatSessionDisplay(), SessionDisplay, LiveSessionCard(), LiveSessionCardProps, LiveSessionsEmpty(), LiveSessionsHeader(), LiveSessionsHeaderProps, InterpolatedSession (+4 more)

### Community 79 - "evolution-provider.ts"
Cohesion: 0.19
Nodes (12): EvolutionProvider, isRetryable(), normalizeNumber(), summarizeError(), RetryOptions, sleep(), withRetry(), EvolutionConfig (+4 more)

### Community 80 - "sync-plugin/route.ts"
Cohesion: 0.18
Nodes (8): batchProcess(), log(), syncPlex(), warn(), error(), log(), PlexService, warn()

### Community 81 - "DownloadStatusModal.tsx"
Cohesion: 0.21
Nodes (13): DownloadStatusModal(), DownloadStatusModalProps, NothingDownloading(), MovieDownloadProgress(), SeasonDownloadRow(), SeasonDownloadRowProps, SeasonInfo, StatusBadge() (+5 more)

### Community 82 - "NotificationsV2.tsx"
Cohesion: 0.16
Nodes (14): EventsSection(), EvolutionApiSection(), NotificationsActionsBar(), NotificationsActionsBarProps, Delivery, NotificationEvent, NotificationsDashboard(), Stats (+6 more)

### Community 83 - "SeasonList.tsx"
Cohesion: 0.13
Nodes (17): BUBBLE, DROP_SIZE, LiquidParts, liquidSwitch(), RowLayout, TAIL_SIZES, TAILS, DashboardTemplate() (+9 more)

### Community 84 - "InfiniteRequestList.tsx"
Cohesion: 0.09
Nodes (28): MediaManagerButton(), MediaManagerButtonProps, FilterPillGroup(), FilterPillGroupProps, FilterPillOption, MediaTypeFilter, mediaTypeOptions, OwnershipFilter (+20 more)

### Community 85 - "getCurrentUser"
Cohesion: 0.16
Nodes (17): GET(), GET(), POST(), PATCH(), DELETE(), GET(), PATCH(), fixMissingTitlesAction() (+9 more)

### Community 86 - "LinkedAccounts.tsx"
Cohesion: 0.21
Nodes (13): AddMemberModal(), AddMemberModalProps, CreateGroupForm(), CreateGroupFormProps, GroupCard(), GroupCardProps, LinkedAccounts(), Candidate (+5 more)

### Community 87 - "StatsHeader.tsx"
Cohesion: 0.13
Nodes (20): SourceFilter(), StatsEmptyState(), StatsEmptyStateProps, StatsHeader(), StatsHeaderProps, PeriodButton(), PeriodButtonProps, StatsPeriodNav() (+12 more)

### Community 89 - "external-item-resolver.ts"
Cohesion: 0.23
Nodes (12): AccessDeniedFallback(), ExternalMediaFallback(), ExternalMediaFallbackProps, MediaPageContent(), dynamic, MediaDetailsPage(), ExternalItemResolution, fetchExternalItem() (+4 more)

### Community 90 - "storage/route.ts"
Cohesion: 0.19
Nodes (17): dynamic, error(), GET(), getStorageOnyx(), log(), maxDuration, parseSort(), VALID_SORT_DIRS (+9 more)

### Community 91 - "media-server-brand.ts"
Cohesion: 0.20
Nodes (11): SYNC_BUTTONS, SyncButtonConfig, UserSyncButtonsProps, SyncProvider, PlexOAuthButtonProps, ServerType, SetupConfigureFormProps, BRAND (+3 more)

### Community 92 - "login/page.tsx"
Cohesion: 0.20
Nodes (11): dynamic, POST(), BackgroundSlideshow(), dynamic, LoginPage(), metadata, dynamic, Home() (+3 more)

### Community 93 - "useStorageItems.ts"
Cohesion: 0.21
Nodes (13): EMPTY_PAGINATION, EMPTY_TOTALS, fetchStoragePage(), removeFromPages(), StoragePages, storageQueryKey(), translateStorageError(), useStorageItems() (+5 more)

### Community 94 - "ThemeProvider.tsx"
Cohesion: 0.24
Nodes (12): PREVIEWS, ThemeSwitcher(), ThemeContext, ThemeContextValue, ThemeProvider(), useTheme(), DEFAULT_THEME, isThemeId() (+4 more)

### Community 95 - "QBittorrentCache"
Cohesion: 0.10
Nodes (14): register(), CacheState, describeFailure(), g, normalizeTorrent(), OnCacheChange, QBittorrentCache, checkCompletedDownloads() (+6 more)

### Community 97 - "getSetting"
Cohesion: 0.09
Nodes (24): embyToTmdbCache, error(), GET(), log(), tmdbPosterCache, warn(), GET(), testSmbConnection() (+16 more)

### Community 98 - "ImportProgressList.tsx"
Cohesion: 0.23
Nodes (10): ImportProgressList(), SmoothBar(), MovieDownloadProgressProps, MediaDownloadProgressBar(), MediaDownloadProgressBarProps, DownloadStatus, ImportInfo, useDownloadStatus() (+2 more)

### Community 99 - "download-managers/index.ts"
Cohesion: 0.25
Nodes (10): ArrDownloadManager, getDownloadManager(), SETTING_KEYS, SorraaDownloadManager, AddRequestInput, AddRequestOutcome, DownloadManager, ManagerKind (+2 more)

### Community 100 - "_components/types.ts"
Cohesion: 0.19
Nodes (13): testProwlarrConnectionAction(), testQBittorrentConnectionAction(), testSorraaConnectionAction(), DownloadSettings(), Props, SettingsFormFooter(), SettingsFormFooterProps, initialFormData (+5 more)

### Community 101 - "request-access/page.tsx"
Cohesion: 0.18
Nodes (12): Step1(), Step1Props, FormData, Step2(), Step2Props, Step3(), Step3Props, FormData (+4 more)

### Community 102 - "What was implemented"
Cohesion: 0.15
Nodes (12): 1. New Database Tables (Migration), 3. Dispatcher, 5. Updated Bootstrap, 6. Updated Public API, 7. Updated Pollers, 8. Deprecated EvolutionListener, How it solves the original problems, Migration command (+4 more)

### Community 103 - "UserStatsCard.tsx"
Cohesion: 0.40
Nodes (5): formatDuration(), UserStat, UserStatsCard(), UserStatsCardProps, StatsDataResult

### Community 104 - "sync-plugin/route.ts"
Cohesion: 0.33
Nodes (6): dynamic, EmbyHistoryItem, error(), JellyfinPlayedItem, PlexHistoryItem, POST()

### Community 105 - "downloads/page.tsx"
Cohesion: 0.23
Nodes (9): DownloadsHeader(), DownloadsHeaderProps, SmbPanel(), SmbPanelProps, useDownloadsClient(), DownloadsClient(), DownloadsPermissions, DownloadsPage() (+1 more)

### Community 106 - "TorrentStatsBar.tsx"
Cohesion: 0.25
Nodes (11): QbitPanel(), QbitPanelProps, TorrentStatsBar(), TorrentStatsBarProps, TorrentStats(), GlobalStats, QUERY_KEY, useGlobalStats() (+3 more)

### Community 107 - "MediaCastSection.tsx"
Cohesion: 0.19
Nodes (11): CastList(), CastListProps, CastMember, MediaCastSection(), MediaCastSectionProps, CastMember, CrewMember, DEPT_TRANSLATIONS (+3 more)

### Community 108 - "media-page-data.ts"
Cohesion: 0.15
Nodes (22): EmbyApiEpisode, EmbyApiItem, EMPTY_PROGRESS, errorLog(), fetchMediaEmbyProgress(), log(), loadMediaPageData(), MediaPageData (+14 more)

### Community 109 - "logger.ts"
Cohesion: 0.07
Nodes (44): dynamic, EVENT_MAP, POST(), dynamic, EVENT_MAP, groupEpisodesBySeason(), handleImportEvent(), POST() (+36 more)

### Community 110 - "media/page.tsx"
Cohesion: 0.20
Nodes (11): LibraryPage, MediaFilterPills(), MediaFilterPillsProps, MediaTypeTabs(), MediaTypeTabsProps, dynamic, MediaPage(), RecentlyWatched() (+3 more)

### Community 111 - "start-all.js"
Cohesion: 0.09
Nodes (18): ACTION_MANIFEST, appProcess, fs, http, httpProxy, isStaleAction(), net, path (+10 more)

### Community 112 - "dependencies"
Cohesion: 0.04
Nodes (54): dependencies, archiver@^7.0.1, basic-ftp@^5.0.5, bcryptjs@^3.0.3, better-sqlite3@^12.9.0, @casl/ability@^6.8.0, @casl/react@^5.0.1, clsx@^2.1.1 (+46 more)

### Community 113 - "MediaSidebar.tsx"
Cohesion: 0.23
Nodes (9): MediaCollection, MediaCollectionCard(), MediaCollectionCardProps, MediaInfoTable(), MediaInfoTableProps, MediaSidebar(), MediaSidebarProps, MediaWatchProviders() (+1 more)

### Community 114 - "cache-service.ts"
Cohesion: 0.15
Nodes (15): CacheOptions, getDbClient(), invalidateCache(), invalidateTag(), l1, l2Get(), l2Set(), refreshing (+7 more)

### Community 115 - "InfiniteMediaList.tsx"
Cohesion: 0.23
Nodes (13): InfiniteScrollTrigger(), MediaGrid(), MediaGridEmpty(), MediaGridLoading(), MediaGridMoreLoading(), MediaGridProps, withMediaType(), withMediaTypeCache (+5 more)

### Community 116 - "useInfiniteMedia.ts"
Cohesion: 0.27
Nodes (10): buildURLParams(), getCacheKey(), loadScrollCache(), parseFiltersFromURL(), saveScrollCache(), ScrollCache, useInfiniteMedia(), mapGenres() (+2 more)

### Community 117 - "SettingsFormData"
Cohesion: 0.20
Nodes (13): ArrSection(), ArrSectionProps, AutomationSettings(), Props, EmbySettingsProps, JellyfinSettingsProps, LibrarySourceSettingsProps, LocalAuthSectionProps (+5 more)

### Community 118 - "download-status-actions.ts"
Cohesion: 0.06
Nodes (35): GET(), POST(), StuckItemResponse, checkDownloadStatus(), error(), formatBytes(), formatSpeed(), formatTime() (+27 more)

### Community 119 - "useUserActivity.ts"
Cohesion: 0.23
Nodes (10): UserActivityButton(), UserActivityButtonProps, ItemDetails, QUERY_KEY(), SeasonDetail, SeasonStat, useUserActivity(), UseUserActivityResult (+2 more)

### Community 120 - "dashboard/page.tsx"
Cohesion: 0.07
Nodes (52): RecentlyWatchedSection(), RecentlyWatchedSkeleton(), RecentRequestsSection(), RecentRequestsSkeleton(), RecommendationsSection(), RecommendationsSkeleton(), settle(), RequestItem() (+44 more)

### Community 121 - "dashboard/layout.tsx"
Cohesion: 0.43
Nodes (5): DashboardLayout(), dynamic, getDashboardConfig, IntentPrefetch(), SystemMessageDisplay()

### Community 122 - "prowlarr.ts"
Cohesion: 0.27
Nodes (5): error(), IndexerField, log(), ProwlarrIndexer, ProwlarrService

### Community 123 - "FtpService"
Cohesion: 0.18
Nodes (5): testStorageConnection(), error(), FtpService, log(), LocalService

### Community 124 - "login/actions.ts"
Cohesion: 0.31
Nodes (8): checkPlexAuthPin(), getPlexAuthPin(), startOnyxPairing(), OnyxLoginPanel(), Step, logError(), usePlexOAuth(), UsePlexOAuthResult

### Community 125 - "SystemMessageBanner.tsx"
Cohesion: 0.43
Nodes (5): SystemMessageBanner(), logError(), SystemMessageBanner, useSystemMessageBanner(), UseSystemMessageBannerResult

### Community 126 - "sync/route.ts"
Cohesion: 0.23
Nodes (11): error(), log(), POST(), warn(), getEmbyServiceForUser(), getJellyfinServiceForUser(), getPlexServiceForUser(), buildWhereClause() (+3 more)

### Community 127 - "emby/route.ts"
Cohesion: 0.70
Nodes (4): error(), log(), POST(), warn()

### Community 128 - "useSystemUpdate.ts"
Cohesion: 0.16
Nodes (16): MaintenanceSettings(), Props, ApiResponse, formatBytes(), formatDuration(), Stats, StuckImportsManager(), StuckItem (+8 more)

### Community 129 - "package.json"
Cohesion: 0.06
Nodes (41): eslintConfig, devDependencies, babel-plugin-react-compiler@1.0.0, cross-env@^10.1.0, drizzle-kit@^0.31.10, eslint@^9, eslint-config-next@16.1.1, tailwindcss@^4 (+33 more)

### Community 130 - "webhook-provider.ts"
Cohesion: 0.22
Nodes (9): buildPayload(), DEFAULT_WEBHOOK_PAYLOAD, getKeyValue(), KeyMap, KeyMapFn, parseKeys(), resolveUrl(), WebhookProvider (+1 more)

### Community 131 - "bootstrap.ts"
Cohesion: 0.19
Nodes (6): globalForV2, startNotificationsV2(), stopNotificationsV2(), OutboxWorker, AvailabilityPoller, getQbitWatchPoller()

### Community 132 - "services/jellyfin.ts"
Cohesion: 0.31
Nodes (4): error(), JellyfinService, log(), warn()

### Community 134 - "group-actions.ts"
Cohesion: 0.41
Nodes (10): addUsersToGroup(), addUserToGroup(), createUserGroup(), deleteUserGroup(), error(), getUserGroups(), removeUserFromGroup(), updateUserGroup() (+2 more)

### Community 135 - "MediaOverviewSection.tsx"
Cohesion: 0.29
Nodes (7): MediaCrewGrid(), MediaCrewGridProps, MediaKeyword, MediaKeywords(), MediaKeywordsProps, MediaOverviewSection(), MediaOverviewSectionProps

### Community 136 - "RecentHistory.tsx"
Cohesion: 0.36
Nodes (8): RecentHistory(), RecentHistoryProps, resolveSocketUrl(), useHistorySocket(), UseHistorySocketResult, compareHistoryItems(), compareHistoryItemsNewestLive(), processHistoryItem()

### Community 137 - "services/plex.ts"
Cohesion: 0.27
Nodes (8): insecureHttpsAgent, KEEP_ALIVE, keepAliveHttpAgent, PlexAccount, PlexSession, PlexUser, axios@^1.13.2, axios

### Community 139 - "patch-allowed-origins.js"
Cohesion: 0.22
Nodes (11): DATABASE_URL, entrypoint.sh script, collectRuntimeOrigins(), CONFIG_FILE, fs, main(), mergeOrigins(), patchRequiredServerFiles() (+3 more)

### Community 140 - "watch-sync.ts"
Cohesion: 0.33
Nodes (6): dynamic, GET(), EmbySession, error(), log(), syncActiveSessions()

### Community 141 - "system-update.ts"
Cohesion: 0.27
Nodes (6): ContainerUpdateStatus, docker, globalForCache, SystemUpdateStatus, ChangelogCategory, ChangelogVersion

### Community 142 - "StatsCharts.tsx"
Cohesion: 0.39
Nodes (5): ActivityChartProps, ActivityChart, ActivityData, StatsCharts(), StatsChartsProps

### Community 143 - "me/page.tsx"
Cohesion: 0.33
Nodes (8): dynamic, PeriodButton(), sanitizePlaybackDuration(), SourceBadge(), StatCard(), UserStatsPage(), UserStatsPageProps, WatchHistoryItem

### Community 144 - "useEpisodeHighlight.ts"
Cohesion: 0.48
Nodes (6): lift(), REDUCED_CLASSES, scrollSettled(), sleep(), useEpisodeHighlight(), whenArrived()

### Community 145 - "services/emby.ts"
Cohesion: 0.18
Nodes (8): mediaLastPlayed, getHttpsAgent(), serverIds, TmdbIndex, tmdbIndexes, getSetting(), main(), mapLimit()

### Community 146 - "support-discord.ts"
Cohesion: 0.33
Nodes (4): buildTicketEmbed(), DiscordEmbed, DiscordPayload, formatDiscordMentions()

### Community 147 - "recreate-containers.js"
Cohesion: 0.36
Nodes (8): cleanEndpointsConfig(), dockerAPI(), fs, http, log(), recreate(), safelyDeleteOldImage(), sleep()

### Community 148 - "RequestCardPoster.tsx"
Cohesion: 0.47
Nodes (4): MediaPoster(), MediaPosterProps, RequestCardPoster(), RequestCardPosterProps

### Community 149 - "upload/route.ts"
Cohesion: 0.70
Nodes (4): GET(), getUploadDir(), POST(), resolveDbPath()

### Community 150 - "OnyxSettings.tsx"
Cohesion: 0.16
Nodes (10): adminCall(), OnyxLinkCard(), OnyxSettings(), OnyxSettingsProps, OnyxStatus, randomKey(), api, ApiClient (+2 more)

### Community 151 - "Côté serveur"
Cohesion: 0.40
Nodes (4): Côté client, Côté serveur, Performance — conventions, revalidatePath()

### Community 157 - "useMediaSettingsTests.ts"
Cohesion: 0.60
Nodes (5): testEmbyConnection(), testJellyfinConnection(), testPlexConnection(), importPlexHistoryAction(), useMediaSettingsTests()

### Community 166 - "next-auth.d.ts"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 171 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 173 - "next"
Cohesion: 0.15
Nodes (8): SharePage(), ShareClient(), ShareClientProps, fileShares, config, allowedOrigins, nextConfig, next

### Community 177 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 231 - "scripts/verify-sorraa.ts"
Cohesion: 0.07
Nodes (24): signSorraaDelivery(), SORRAA_TIMESTAMP_TOLERANCE_S, verifySorraaDelivery(), accounts, Json, loggedOut, onyxUser(), startFakeOnyx() (+16 more)

## Knowledge Gaps
- **5 isolated node(s):** `DATABASE_URL`, `ADR-0102`, `ADR-0114`, `RFC-3339`, `ADR-0114`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 898 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `SupportCategoriesConfig.tsx` to `defineAbilityFor`, `auth/index.ts`, `useProwlarrSearch.ts`, `RoleEditor.tsx`, `AccountRequest`, `dashboard-actions.ts`, `group-actions.ts`, `MotionDirector.tsx`, `next`, `LoginForm.tsx`, `Torrent`, `file-actions.ts`, `UserManagement.tsx`, `ProwlarrSearch.tsx`, `Torrent`, `SeasonList.tsx`, `notifications-v2-actions.ts`, `MediaCard.tsx`, `torrent/FilterModal.tsx`, `StorageFilterBar.tsx`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `StorageItem`, `ManageMediaModal.tsx`, `NotificationEvent`, `TorrentModals.tsx`, `MediaPageContent.tsx`, `NotificationItem.tsx`, `SettingsFormData`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `TorrentFiltersBar.tsx`, `prowlarr-actions.ts`, `onyx.tsx`, `RequestCard.tsx`, `SystemMessageManagement.tsx`, `StorageManager.tsx`, `@tanstack/react-query`, `SetupForm.tsx`, `media-filters-options.ts`, `TorrentManager.tsx`, `LiveSessions.tsx`, `NotificationsV2.tsx`, `SeasonList.tsx`, `InfiniteRequestList.tsx`, `getCurrentUser`, `LinkedAccounts.tsx`, `StatsHeader.tsx`, `login/page.tsx`, `useStorageItems.ts`, `ThemeProvider.tsx`, `ImportProgressList.tsx`, `_components/types.ts`, `request-access/page.tsx`, `UserStatsCard.tsx`, `downloads/page.tsx`, `MediaCastSection.tsx`, `media/page.tsx`, `dependencies`, `InfiniteMediaList.tsx`, `useInfiniteMedia.ts`, `SettingsFormData`, `download-status-actions.ts`, `useUserActivity.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `login/actions.ts`, `SystemMessageBanner.tsx`, `useSystemUpdate.ts`, `package.json`, `group-actions.ts`, `RecentHistory.tsx`, `StatsCharts.tsx`, `me/page.tsx`, `useEpisodeHighlight.ts`, `RequestCardPoster.tsx`, `OnyxSettings.tsx`, `useMediaSettingsTests.ts`, `next`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **What connects `DATABASE_URL`, `ADR-0102`, `ADR-0114` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `defineAbilityFor` be split into smaller, more focused modules?**
  _Cohesion score 0.11379800853485064 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `InfiniteRequestList.tsx` to `defineAbilityFor`, `useSystemUpdate.ts`, `package.json`, `storage.ts`, `useProwlarrSearch.ts`, `RecentHistory.tsx`, `RoleEditor.tsx`, `AccountRequest`, `dashboard-actions.ts`, `_utils/activity-logs.ts`, `group-actions.ts`, `StatsCharts.tsx`, `me/page.tsx`, `RequestCardPoster.tsx`, `LoginForm.tsx`, `Torrent`, `OnyxSettings.tsx`, `DeleteStorageModal.tsx`, `UserManagement.tsx`, `ProwlarrSearch.tsx`, `Torrent`, `SeasonList.tsx`, `notifications-v2-actions.ts`, `MediaCard.tsx`, `torrent/FilterModal.tsx`, `StorageFilterBar.tsx`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `StorageItem`, `ManageMediaModal.tsx`, `NotificationEvent`, `SupportCategoriesConfig.tsx`, `TorrentModals.tsx`, `MediaPageContent.tsx`, `NotificationItem.tsx`, `SettingsFormData`, `BackupManagement.tsx`, `cn`, `MediaActionsRow.tsx`, `QuickActions.tsx`, `StorageSettings.tsx`, `Navbar.tsx`, `TorrentFiltersBar.tsx`, `formatReleaseDate`, `onyx.tsx`, `RequestCard.tsx`, `SystemMessageManagement.tsx`, `StorageManager.tsx`, `SetupForm.tsx`, `media-filters-options.ts`, `TorrentManager.tsx`, `LiveSessions.tsx`, `DownloadStatusModal.tsx`, `NotificationsV2.tsx`, `SeasonList.tsx`, `LinkedAccounts.tsx`, `StatsHeader.tsx`, `media-server-brand.ts`, `ThemeProvider.tsx`, `ImportProgressList.tsx`, `_components/types.ts`, `request-access/page.tsx`, `UserStatsCard.tsx`, `downloads/page.tsx`, `TorrentStatsBar.tsx`, `MediaCastSection.tsx`, `media/page.tsx`, `dependencies`, `InfiniteMediaList.tsx`, `SettingsFormData`, `useUserActivity.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `SystemMessageBanner.tsx`?**
  _High betweenness centrality (0.181) - this node is a cross-community bridge._
- **Should `item-viewing-stats.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12477718360071301 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `defineAbilityFor`, `item-viewing-stats.ts`, `package.json`, `auth/index.ts`, `getSession`, `group-actions.ts`, `onyx-link/route.ts`, `MediaOverviewSection.tsx`, `media/actions.ts`, `AccountRequest`, `player-v1.ts`, `watch-sync.ts`, `dashboard-actions.ts`, `StatsCharts.tsx`, `me/page.tsx`, `MotionDirector.tsx`, `getRealUser`, `next`, `RequestCardPoster.tsx`, `watch-later-actions.ts`, `upload/route.ts`, `Torrent`, `interactive-search.ts`, `UserManagement.tsx`, `LoginForm.tsx`, `download-managers/sorraa.ts`, `getCurrentUser`, `ProwlarrSearch.tsx`, `Torrent`, `onyx-directory.ts`, `SeasonList.tsx`, `MediaCard.tsx`, `SettingsTabsContent.tsx`, `HistoryItem.tsx`, `ManageMediaModal.tsx`, `TorrentModals.tsx`, `NotificationItem.tsx`, `BackupManagement.tsx`, `cn`, `QuickActions.tsx`, `Navbar.tsx`, `media-status.ts`, `downloads/actions.ts`, `onyx.tsx`, `RequestCard.tsx`, `@tanstack/react-query`, `SetupForm.tsx`, `LiveSessions.tsx`, `SeasonList.tsx`, `InfiniteRequestList.tsx`, `StatsHeader.tsx`, `external-item-resolver.ts`, `storage/route.ts`, `login/page.tsx`, `useStorageItems.ts`, `getSetting`, `_components/types.ts`, `request-access/page.tsx`, `sync-plugin/route.ts`, `downloads/page.tsx`, `MediaCastSection.tsx`, `logger.ts`, `media/page.tsx`, `dependencies`, `MediaSidebar.tsx`, `useInfiniteMedia.ts`, `download-status-actions.ts`, `dashboard/page.tsx`, `dashboard/layout.tsx`, `login/actions.ts`, `sync/route.ts`, `emby/route.ts`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Should `event-store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11396011396011396 - nodes in this community are weakly interconnected._