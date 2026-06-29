import { sqliteTable, integer, text, uniqueIndex, index, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// ============================================================================
// ACCOUNT REQUESTS
// ============================================================================
export const accountRequests = sqliteTable('account_requests', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  firstName: text('first_name').notNull(),
  inviter: text('inviter'),
  status: text('status').notNull().default('PENDING'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
});

// ============================================================================
// DAILY TRACKER STATS
// ============================================================================
export const dailyTrackerStats = sqliteTable('daily_tracker_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: integer('date', { mode: 'timestamp_ms' }).notNull(),
  tracker: text('tracker').notNull(),
  totalUploaded: blob('total_uploaded', { mode: 'bigint' }).notNull().default(BigInt(0)),
  totalDownloaded: blob('total_downloaded', { mode: 'bigint' }).notNull().default(BigInt(0)),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
}, (table) => ({
  uniqueDateTracker: uniqueIndex('daily_tracker_stats_date_tracker_unique').on(table.date, table.tracker),
  dateIdx: index('daily_tracker_stats_date_idx').on(table.date),
}));

// ============================================================================
// TRACKER STATS LOGS
// ============================================================================
export const trackerStatsLogs = sqliteTable('tracker_stats_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tracker: text('tracker').notNull(),
  totalUploaded: blob('total_uploaded', { mode: 'bigint' }).notNull(),
  totalDownloaded: blob('total_downloaded', { mode: 'bigint' }).notNull(),
  uploadedDiff: blob('uploaded_diff', { mode: 'bigint' }).notNull().default(BigInt(0)),
  downloadedDiff: blob('downloaded_diff', { mode: 'bigint' }).notNull().default(BigInt(0)),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  timestampIdx: index('tracker_stats_logs_timestamp_idx').on(table.timestamp),
  trackerTimestampIdx: index('tracker_stats_logs_tracker_timestamp_idx').on(table.tracker, table.timestamp),
}));

// ============================================================================
// ROLES (doit être défini avant User car référencé)
// ============================================================================
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
});

// ============================================================================
// USERS
// ============================================================================
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
  password: text('password'),
  image: text('image'),
  embyUserId: text('emby_user_id').unique(),
  jellyfinUserId: text('jellyfin_user_id').unique(),
  plexUserId: text('plex_user_id').unique(),
  jellyseerrUserId: text('jellyseerr_user_id'),
  role: text('role').notNull().default('user'),
  roleId: text('role_id').references(() => roles.id),
  hasSeenWelcome: integer('has_seen_welcome', { mode: 'boolean' }).notNull().default(false),
  lastSeenSystemMessageVersion: text('last_seen_system_message_version'),
  telegramChatId: text('telegram_chat_id'),
  discordUserId: text('discord_user_id'),
  discordWebhook: text('discord_webhook'),
  customWebhook: text('custom_webhook'),
  whatsappNumber: text('whatsapp_number'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
});

// ============================================================================
// USER CALENDAR EVENTS
// ============================================================================
export const userCalendarEvents = sqliteTable('user_calendar_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(),
  tmdbId: text('tmdb_id').notNull(),
  title: text('title').notNull(),
  releaseDate: integer('release_date', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  uniqueUserTmdb: uniqueIndex('user_calendar_events_user_tmdb_unique').on(table.userId, table.tmdbId, table.mediaType),
  userReleaseIdx: index('user_calendar_events_user_release_idx').on(table.userId, table.releaseDate),
}));

// ============================================================================
// WATCH LATER
// ============================================================================
export const watchLater = sqliteTable('watch_later', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').notNull(),
  tmdbId: text('tmdb_id'),
  mediaType: text('media_type').notNull(),
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  isEmbyItem: integer('is_emby_item', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  uniqueUserMedia: uniqueIndex('watch_later_user_media_unique').on(table.userId, table.mediaId, table.mediaType),
}));

// ============================================================================
// ACCOUNTS (Next-Auth)
// ============================================================================
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  providerProviderAccountIdx: uniqueIndex('accounts_provider_provider_account_id_unique').on(table.provider, table.providerAccountId),
}));

// ============================================================================
// SESSIONS (Next-Auth)
// ============================================================================
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionToken: text('session_token').notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
});

// ============================================================================
// VERIFICATION TOKENS (Next-Auth)
// ============================================================================
export const verificationTokens = sqliteTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
}, (table) => ({
  identifierTokenIdx: uniqueIndex('verification_tokens_identifier_token_unique').on(table.identifier, table.token),
}));

// ============================================================================
// MEDIA REQUESTS
// ============================================================================
export const mediaRequests = sqliteTable('media_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  mediaType: text('media_type').notNull(),
  tmdbId: text('tmdb_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: integer('status').notNull().default(1),
  externalId: text('external_id'),
  metadata: text('metadata'),
  notes: text('notes'),
  requestedAt: integer('requested_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
  isOnEmby: integer('is_on_emby', { mode: 'boolean' }).notNull().default(false),
  embyItemId: text('emby_item_id'),
  requesterName: text('requester_name'),
  requesterEmail: text('requester_email'),
  requesterAvatar: text('requester_avatar'),
}, (table) => ({
  userStatusIdx: index('media_requests_user_status_idx').on(table.userId, table.status),
  mediaTypeStatusIdx: index('media_requests_media_type_status_idx').on(table.mediaType, table.status),
  tmdbIdx: index('media_requests_tmdb_idx').on(table.tmdbId),
}));

// ============================================================================
// WATCH EVENTS
// ============================================================================
export const watchEvents = sqliteTable('watch_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  embyUserId: text('emby_user_id').notNull(),
  itemId: text('item_id').notNull(),
  itemType: text('item_type'),
  itemName: text('item_name'),
  seriesName: text('series_name'),
  durationMinutes: integer('duration_minutes').notNull().default(0),
  plays: integer('plays').notNull().default(1),
  playedAt: integer('played_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
  client: text('client'),
  device: text('device'),
  episodeNumber: integer('episode_number'),
  ipAddress: text('ip_address'),
  playMethod: text('play_method'),
  seasonName: text('season_name'),
  seasonNumber: integer('season_number'),
  sessionId: text('session_id'),
  userName: text('user_name'),
  tmdbId: text('tmdb_id'),
}, (table) => ({
  uniqueEmbyItemPlayed: uniqueIndex('watch_events_emby_item_played_unique').on(table.embyUserId, table.itemId, table.playedAt),
}));

// ============================================================================
// SETTINGS
// ============================================================================
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  category: text('category').notNull().default('general'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
});

// ============================================================================
// AUDIT LOGS
// ============================================================================
export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity'),
  entityId: text('entity_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  details: text('details'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================================================
// PERMISSIONS
// ============================================================================
export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: text('action').notNull(),
  subject: text('subject').notNull(),
  conditions: text('conditions'), // JSON string
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
});

// ============================================================================
// MEDIA SUBSCRIPTIONS
// ============================================================================
export const mediaSubscriptions = sqliteTable('media_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tmdbId: text('tmdb_id').notNull(),
  mediaType: text('media_type').notNull(),
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  uniqueUserTmdb: uniqueIndex('media_subscriptions_user_tmdb_unique').on(table.userId, table.tmdbId, table.mediaType),
}));

// ============================================================================
// USER GROUPS
// ============================================================================
export const userGroups = sqliteTable('user_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
  roleId: text('role_id').references(() => roles.id),
});

// ============================================================================
// USER GROUP MEMBERS
// ============================================================================
export const userGroupMembers = sqliteTable('user_group_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userGroupId: text('user_group_id').notNull().references(() => userGroups.id, { onDelete: 'cascade' }),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  uniqueUserGroup: uniqueIndex('user_group_members_user_group_unique').on(table.userId, table.userGroupId),
}));

// ============================================================================
// NOTIFICATION EVENTS V2 (Outbox)
// ============================================================================
export const notificationEvents = sqliteTable('notification_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  requestId: integer('request_id').references(() => mediaRequests.id, { onDelete: 'set null' }),
  tmdbId: text('tmdb_id').notNull(),
  mediaType: text('media_type').notNull(),
  event: text('event').notNull(),
  correlationId: text('correlation_id').notNull(),
  payload: text('payload').notNull(), // JSON string
  status: text('status').notNull().default('pending'), // 'pending' | 'dispatched' | 'failed'
  dedupKey: text('dedup_key').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  dispatchedAt: integer('dispatched_at', { mode: 'timestamp_ms' }),
}, (table) => ({
  dedupKeyIdx: uniqueIndex('notification_events_dedup_key_unique').on(table.dedupKey),
  requestEventIdx: index('notification_events_request_event_idx').on(table.requestId, table.event),
  statusCreatedIdx: index('notification_events_status_created_idx').on(table.status, table.createdAt),
  tmdbTypeIdx: index('notification_events_tmdb_type_idx').on(table.tmdbId, table.mediaType),
}));

// ============================================================================
// NOTIFICATION DELIVERIES V2 (Outbox deliveries)
// ============================================================================
export const notificationDeliveries = sqliteTable('notification_deliveries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  eventId: integer('event_id').notNull().references(() => notificationEvents.id, { onDelete: 'cascade' }),
  recipient: text('recipient').notNull(), // phone number
  provider: text('provider').notNull().default('evolution'),
  status: text('status').notNull().default('pending'), // 'pending' | 'sent' | 'failed'
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  eventIdIdx: index('notification_deliveries_event_id_idx').on(table.eventId),
  statusRetryIdx: index('notification_deliveries_status_retry_idx').on(table.status, table.nextRetryAt),
  uniqueDelivery: uniqueIndex('notification_deliveries_unique_recipient').on(table.eventId, table.recipient, table.provider),
}));

// ============================================================================
// FILE SHARES
// ============================================================================
export const fileShares = sqliteTable('file_shares', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  filePath: text('file_path').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ============================================================================
// EPISODE BATCHES (Anti-spam notifications)
// ============================================================================
export const episodeBatches = sqliteTable('episode_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tmdbId: text('tmdb_id').notNull(),
  seasonNumber: integer('season_number').notNull(),
  episodes: text('episodes').notNull(), // JSON array [1,2,3]
  status: text('status').notNull().default('downloading'), // 'downloading' | 'importing' | 'available' | 'complete'
  downloadedEpisodes: text('downloaded_episodes'), // JSON array
  failedDownloadEpisodes: text('failed_download_episodes'), // JSON array
  importedEpisodes: text('imported_episodes'), // JSON array
  availableEpisodes: text('available_episodes'), // JSON array
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
}, (table) => ({
  tmdbSeasonIdx: index('episode_batches_tmdb_season_idx').on(table.tmdbId, table.seasonNumber),
  statusIdx: index('episode_batches_status_idx').on(table.status),
}));

// ============================================================================
// SUPPORT CATEGORIES
// ============================================================================
export const supportCategories = sqliteTable('support_categories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  discordWebhook: text('discord_webhook'),
  discordMentions: text('discord_mentions'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
});

// ============================================================================
// SUPPORT SUBCATEGORIES
// ============================================================================
export const supportSubcategories = sqliteTable('support_subcategories', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  categoryId: text('category_id').notNull().references(() => supportCategories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  discordWebhook: text('discord_webhook'),
  discordMentions: text('discord_mentions'),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
});

// ============================================================================
// SUPPORT TICKETS
// ============================================================================
export const supportTickets = sqliteTable('support_tickets', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name'),
  userEmail: text('user_email'),
  categoryId: text('category_id').notNull().references(() => supportCategories.id),
  subcategoryId: text('subcategory_id').references(() => supportSubcategories.id),
  message: text('message').notNull(),
  attachments: text('attachments'), // JSON array of image URLs
  status: text('status').notNull().default('open'), // 'open' | 'in_progress' | 'resolved' | 'closed'
  discordMessageId: text('discord_message_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$onUpdateFn(() => new Date()),
}, (table) => ({
  statusIdx: index('support_tickets_status_idx').on(table.status),
  userIdx: index('support_tickets_user_idx').on(table.userId),
  createdAtIdx: index('support_tickets_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// NOTIFICATIONS (Internes — UI Badge/Dropdown)
// ============================================================================
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'media_available' | 'new_ticket' | 'system_update'
  mediaId: text('media_id'),
  mediaType: text('media_type'),
  posterPath: text('poster_path'),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  link: text('link'),
  data: text('data'), // JSON string for extra metadata
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userReadIdx: index('notifications_user_read_idx').on(table.userId, table.isRead),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  roleRef: one(roles, { fields: [users.roleId], references: [roles.id] }),
  accounts: many(accounts),
  auditLogs: many(auditLogs),
  requests: many(mediaRequests),
    sessions: many(sessions),
  watchEvents: many(watchEvents),
  watchLater: many(watchLater),
  calendarEvents: many(userCalendarEvents),
  groupMemberships: many(userGroupMembers),
  subscriptions: many(mediaSubscriptions),
  notifications: many(notifications),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(permissions),
  users: many(users),
  groups: many(userGroups),
}));

export const permissionsRelations = relations(permissions, ({ one }) => ({
  role: one(roles, { fields: [permissions.roleId], references: [roles.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));


export const watchLaterRelations = relations(watchLater, ({ one }) => ({
  user: one(users, { fields: [watchLater.userId], references: [users.id] }),
}));

export const userCalendarEventsRelations = relations(userCalendarEvents, ({ one }) => ({
  user: one(users, { fields: [userCalendarEvents.userId], references: [users.id] }),
}));

export const mediaRequestsRelations = relations(mediaRequests, ({ one }) => ({
  user: one(users, { fields: [mediaRequests.userId], references: [users.id] }),
}));

export const watchEventsRelations = relations(watchEvents, ({ one }) => ({
  user: one(users, { fields: [watchEvents.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const mediaSubscriptionsRelations = relations(mediaSubscriptions, ({ one }) => ({
  user: one(users, { fields: [mediaSubscriptions.userId], references: [users.id] }),
}));

export const userGroupsRelations = relations(userGroups, ({ one, many }) => ({
  role: one(roles, { fields: [userGroups.roleId], references: [roles.id] }),
  members: many(userGroupMembers),
}));

export const userGroupMembersRelations = relations(userGroupMembers, ({ one }) => ({
  user: one(users, { fields: [userGroupMembers.userId], references: [users.id] }),
  group: one(userGroups, { fields: [userGroupMembers.userGroupId], references: [userGroups.id] }),
}));

export const notificationEventsRelations = relations(notificationEvents, ({ one, many }) => ({
  request: one(mediaRequests, { fields: [notificationEvents.requestId], references: [mediaRequests.id] }),
  deliveries: many(notificationDeliveries),
}));

export const notificationDeliveriesRelations = relations(notificationDeliveries, ({ one }) => ({
  event: one(notificationEvents, { fields: [notificationDeliveries.eventId], references: [notificationEvents.id] }),
}));

export const supportCategoriesRelations = relations(supportCategories, ({ many }) => ({
  subcategories: many(supportSubcategories),
  tickets: many(supportTickets),
}));

export const supportSubcategoriesRelations = relations(supportSubcategories, ({ one, many }) => ({
  category: one(supportCategories, { fields: [supportSubcategories.categoryId], references: [supportCategories.id] }),
  tickets: many(supportTickets),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  category: one(supportCategories, { fields: [supportTickets.categoryId], references: [supportCategories.id] }),
  subcategory: one(supportSubcategories, { fields: [supportTickets.subcategoryId], references: [supportSubcategories.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
