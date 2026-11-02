import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Patch BigInt pour JSON.stringify / NextResponse.json() (valeurs bigint éventuelles)
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

// ---------------------------------------------------------------------------
// Résolution déterministe du chemin de la DB
// On résout par rapport au cwd du process Node, mais une variable d'env
// MEDIAHUB_DB_PATH (chemin absolu) prend toujours le pas pour éviter toute
// surprise selon le répertoire de lancement.
// ---------------------------------------------------------------------------
function resolveDbPath(): string {
  const explicit = process.env.MEDIAHUB_DB_PATH;
  if (explicit) return resolve(explicit);
  const databaseUrl = process.env.DATABASE_URL || 'file:./data/db/dev.db';
  const rawPath = databaseUrl.replace(/^file:/, '');
  return resolve(rawPath.startsWith('/') || rawPath.includes(':') ? rawPath : `./${rawPath}`);
}

const dbPath = resolveDbPath();

// S'assurer que le répertoire de la DB existe
const dbDir = dirname(dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Singleton via globalThis pour survivre au hot-reload Next.js dev.
// Sans ça, chaque rebuild crée une nouvelle connexion SQLite, ce qui
// provoque des "database is locked" et des fuites de WAL.
// ---------------------------------------------------------------------------
type GlobalDb = {
  __mediahubSqlite?: Database.Database;
  __mediahubDrizzle?: BetterSQLite3Database<typeof schema>;
  __mediahubDbInit?: boolean;
};
const globalForDb = globalThis as unknown as GlobalDb;

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

const sqlite: Database.Database = isBuildPhase
  ? (null as unknown as Database.Database)
  : (globalForDb.__mediahubSqlite ?? (() => {
      const instance = new Database(dbPath);
      instance.pragma('journal_mode = WAL');
      instance.pragma('synchronous = NORMAL');
      instance.pragma('foreign_keys = ON');
      instance.pragma('busy_timeout = 10000');
      instance.pragma('temp_store = MEMORY');
      // Lectures plus rapides : cache de pages de 32 Mo + I/O mappées en mémoire (256 Mo max)
      instance.pragma('cache_size = -32000');
      instance.pragma('mmap_size = 268435456');
      globalForDb.__mediahubSqlite = instance;
      return instance;
    })())

// ---------------------------------------------------------------------------
// Auto-migration synchrone au démarrage.
// Tout est idempotent : CREATE TABLE IF NOT EXISTS + ALTER TABLE try/catch.
// On miroite ici le schéma défini dans schema.ts pour que tout déploiement
// (DB neuve OU legacy Prisma) converge vers le même état.
// ---------------------------------------------------------------------------

const TABLE_DEFINITIONS: ReadonlyArray<{ name: string; ddl: string; indexes?: string[] }> = [
  {
    name: 'roles',
    ddl: `CREATE TABLE IF NOT EXISTS "roles" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "is_system" INTEGER NOT NULL DEFAULT 0,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'users',
    ddl: `CREATE TABLE IF NOT EXISTS "users" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "email_verified" INTEGER,
      "password" TEXT,
      "image" TEXT,
      "emby_user_id" TEXT UNIQUE,
      "jellyfin_user_id" TEXT UNIQUE,
      "plex_user_id" TEXT UNIQUE,
      "onyx_user_id" TEXT UNIQUE,
      "jellyseerr_user_id" TEXT,
      "role" TEXT NOT NULL DEFAULT 'user',
      "role_id" TEXT REFERENCES "roles"("id"),
      "has_seen_welcome" INTEGER NOT NULL DEFAULT 0,
      "last_seen_system_message_version" TEXT,
      "telegram_chat_id" TEXT,
      "discord_user_id" TEXT,
      "discord_webhook" TEXT,
      "custom_webhook" TEXT,
      "whatsapp_number" TEXT,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
    // Les DB legacy reçoivent onyx_user_id par ALTER (sans UNIQUE) : l'index le garantit.
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "users_onyx_user_id_unique" ON "users" ("onyx_user_id");`,
    ],
  },
  {
    name: 'account_requests',
    ddl: `CREATE TABLE IF NOT EXISTS "account_requests" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "first_name" TEXT NOT NULL,
      "inviter" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'accounts',
    ddl: `CREATE TABLE IF NOT EXISTS "accounts" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "provider_account_id" TEXT NOT NULL,
      "refresh_token" TEXT,
      "access_token" TEXT,
      "expires_at" INTEGER,
      "token_type" TEXT,
      "scope" TEXT,
      "id_token" TEXT,
      "session_state" TEXT
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_unique" ON "accounts" ("provider", "provider_account_id");`,
    ],
  },
  {
    name: 'sessions',
    ddl: `CREATE TABLE IF NOT EXISTS "sessions" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "session_token" TEXT NOT NULL UNIQUE,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "expires" INTEGER NOT NULL
    );`,
  },
  {
    name: 'verification_tokens',
    ddl: `CREATE TABLE IF NOT EXISTS "verification_tokens" (
      "identifier" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "expires" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_unique" ON "verification_tokens" ("identifier", "token");`,
    ],
  },
  {
    name: 'media_requests',
    ddl: `CREATE TABLE IF NOT EXISTS "media_requests" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
      "media_type" TEXT NOT NULL,
      "tmdb_id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "status" INTEGER NOT NULL DEFAULT 1,
      "external_id" TEXT,
      "metadata" TEXT,
      "notes" TEXT,
      "requested_at" INTEGER NOT NULL,
      "processed_at" INTEGER,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL,
      "is_on_emby" INTEGER NOT NULL DEFAULT 0,
      "emby_item_id" TEXT,
      "requester_name" TEXT,
      "requester_email" TEXT,
      "requester_avatar" TEXT
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "media_requests_user_status_idx" ON "media_requests" ("user_id", "status");`,
      `CREATE INDEX IF NOT EXISTS "media_requests_media_type_status_idx" ON "media_requests" ("media_type", "status");`,
      `CREATE INDEX IF NOT EXISTS "media_requests_tmdb_idx" ON "media_requests" ("tmdb_id");`,
      `CREATE INDEX IF NOT EXISTS "media_requests_requested_at_idx" ON "media_requests" ("requested_at");`,
    ],
  },
  {
    name: 'notifications',
    ddl: `CREATE TABLE IF NOT EXISTS "notifications" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "media_id" TEXT,
      "media_type" TEXT,
      "poster_path" TEXT,
      "is_read" INTEGER NOT NULL DEFAULT 0,
      "link" TEXT,
      "data" TEXT,
      "created_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "is_read");`,
    ],
  },
  {
    name: 'watch_later',
    ddl: `CREATE TABLE IF NOT EXISTS "watch_later" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "media_id" TEXT NOT NULL,
      "tmdb_id" TEXT,
      "media_type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "poster_path" TEXT,
      "is_emby_item" INTEGER NOT NULL DEFAULT 0,
      "created_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "watch_later_user_media_unique" ON "watch_later" ("user_id", "media_id", "media_type");`,
    ],
  },
  {
    name: 'user_calendar_events',
    ddl: `CREATE TABLE IF NOT EXISTS "user_calendar_events" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "media_type" TEXT NOT NULL,
      "tmdb_id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "release_date" INTEGER NOT NULL,
      "created_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "user_calendar_events_user_tmdb_unique" ON "user_calendar_events" ("user_id", "tmdb_id", "media_type");`,
      `CREATE INDEX IF NOT EXISTS "user_calendar_events_user_release_idx" ON "user_calendar_events" ("user_id", "release_date");`,
    ],
  },
  {
    name: 'watch_events',
    ddl: `CREATE TABLE IF NOT EXISTS "watch_events" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER REFERENCES "users"("id"),
      "emby_user_id" TEXT NOT NULL,
      "item_id" TEXT NOT NULL,
      "item_type" TEXT,
      "item_name" TEXT,
      "series_name" TEXT,
      "duration_minutes" INTEGER NOT NULL DEFAULT 0,
      "plays" INTEGER NOT NULL DEFAULT 1,
      "played_at" INTEGER NOT NULL,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL,
      "client" TEXT,
      "device" TEXT,
      "episode_number" INTEGER,
      "ip_address" TEXT,
      "play_method" TEXT,
      "season_name" TEXT,
      "season_number" INTEGER,
      "session_id" TEXT,
      "user_name" TEXT,
      "tmdb_id" TEXT
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "watch_events_emby_item_played_unique" ON "watch_events" ("emby_user_id", "item_id", "played_at");`,
      // Stats : filtrage par période + tri chronologique
      `CREATE INDEX IF NOT EXISTS "watch_events_played_at_idx" ON "watch_events" ("played_at");`,
    ],
  },
  {
    name: 'media_last_played',
    ddl: `CREATE TABLE IF NOT EXISTS "media_last_played" (
      "item_id" TEXT PRIMARY KEY NOT NULL,
      "item_type" TEXT,
      "last_played_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'settings',
    ddl: `CREATE TABLE IF NOT EXISTS "settings" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "key" TEXT NOT NULL UNIQUE,
      "value" TEXT,
      "category" TEXT NOT NULL DEFAULT 'general',
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'audit_logs',
    ddl: `CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER REFERENCES "users"("id"),
      "action" TEXT NOT NULL,
      "entity" TEXT,
      "entity_id" TEXT,
      "ip_address" TEXT,
      "user_agent" TEXT,
      "details" TEXT,
      "created_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");`,
    ],
  },
  {
    name: 'permissions',
    ddl: `CREATE TABLE IF NOT EXISTS "permissions" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "action" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "conditions" TEXT,
      "role_id" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE
    );`,
  },
  {
    name: 'media_subscriptions',
    ddl: `CREATE TABLE IF NOT EXISTS "media_subscriptions" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "tmdb_id" TEXT NOT NULL,
      "media_type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "poster_path" TEXT,
      "created_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "media_subscriptions_user_tmdb_unique" ON "media_subscriptions" ("user_id", "tmdb_id", "media_type");`,
    ],
  },
  {
    name: 'user_groups',
    ddl: `CREATE TABLE IF NOT EXISTS "user_groups" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL,
      "role_id" TEXT REFERENCES "roles"("id")
    );`,
  },
  {
    name: 'user_group_members',
    ddl: `CREATE TABLE IF NOT EXISTS "user_group_members" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "user_group_id" TEXT NOT NULL REFERENCES "user_groups"("id") ON DELETE CASCADE,
      "joined_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "user_group_members_user_group_unique" ON "user_group_members" ("user_id", "user_group_id");`,
    ],
  },
  {
    name: 'episode_batches',
    ddl: `CREATE TABLE IF NOT EXISTS "episode_batches" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "tmdb_id" TEXT NOT NULL,
      "season_number" INTEGER NOT NULL,
      "episodes" TEXT NOT NULL,
      "status" TEXT DEFAULT 'downloading' NOT NULL,
      "downloaded_episodes" TEXT,
      "failed_download_episodes" TEXT,
      "imported_episodes" TEXT,
      "available_episodes" TEXT,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "episode_batches_tmdb_season_idx" ON "episode_batches" ("tmdb_id", "season_number");`,
      `CREATE INDEX IF NOT EXISTS "episode_batches_status_idx" ON "episode_batches" ("status");`,
    ],
  },
  {
    name: 'file_shares',
    ddl: `CREATE TABLE IF NOT EXISTS "file_shares" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "file_path" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "password" TEXT,
      "expires_at" INTEGER,
      "created_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'notification_events',
    ddl: `CREATE TABLE IF NOT EXISTS "notification_events" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "request_id" INTEGER REFERENCES "media_requests"("id") ON DELETE SET NULL,
      "tmdb_id" TEXT NOT NULL,
      "media_type" TEXT NOT NULL,
      "event" TEXT NOT NULL,
      "correlation_id" TEXT NOT NULL,
      "payload" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "dedup_key" TEXT NOT NULL UNIQUE,
      "created_at" INTEGER NOT NULL,
      "dispatched_at" INTEGER
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_dedup_key_unique" ON "notification_events" ("dedup_key");`,
      `CREATE INDEX IF NOT EXISTS "notification_events_request_event_idx" ON "notification_events" ("request_id", "event");`,
      `CREATE INDEX IF NOT EXISTS "notification_events_status_created_idx" ON "notification_events" ("status", "created_at");`,
      `CREATE INDEX IF NOT EXISTS "notification_events_tmdb_type_idx" ON "notification_events" ("tmdb_id", "media_type");`,
    ],
  },
  {
    name: 'notification_deliveries',
    ddl: `CREATE TABLE IF NOT EXISTS "notification_deliveries" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "event_id" INTEGER NOT NULL REFERENCES "notification_events"("id") ON DELETE CASCADE,
      "recipient" TEXT NOT NULL,
      "provider" TEXT NOT NULL DEFAULT 'evolution',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "last_error" TEXT,
      "sent_at" INTEGER,
      "next_retry_at" INTEGER,
      "created_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "notification_deliveries_event_id_idx" ON "notification_deliveries" ("event_id");`,
      `CREATE INDEX IF NOT EXISTS "notification_deliveries_status_retry_idx" ON "notification_deliveries" ("status", "next_retry_at");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "notification_deliveries_unique_recipient" ON "notification_deliveries" ("event_id", "recipient", "provider");`,
    ],
  },
  {
    name: 'support_categories',
    ddl: `CREATE TABLE IF NOT EXISTS "support_categories" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "discord_webhook" TEXT,
      "discord_mentions" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'support_subcategories',
    ddl: `CREATE TABLE IF NOT EXISTS "support_subcategories" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "category_id" TEXT NOT NULL REFERENCES "support_categories"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "discord_webhook" TEXT,
      "discord_mentions" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
  },
  {
    name: 'support_tickets',
    ddl: `CREATE TABLE IF NOT EXISTS "support_tickets" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
      "user_name" TEXT,
      "user_email" TEXT,
      "category_id" TEXT NOT NULL REFERENCES "support_categories"("id"),
      "subcategory_id" TEXT REFERENCES "support_subcategories"("id"),
      "message" TEXT NOT NULL,
      "attachments" TEXT,
      "status" TEXT NOT NULL DEFAULT 'open',
      "discord_message_id" TEXT,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets" ("status");`,
      `CREATE INDEX IF NOT EXISTS "support_tickets_user_idx" ON "support_tickets" ("user_id");`,
      `CREATE INDEX IF NOT EXISTS "support_tickets_created_at_idx" ON "support_tickets" ("created_at");`,
    ],
  },
];

// Colonnes potentiellement absentes des DB legacy : ALTER TABLE ADD COLUMN
// idempotent (try/catch). On garde une liste explicite pour suivre les
// évolutions de schéma sans casser les déploiements existants.
const COLUMN_PATCHES: ReadonlyArray<{ table: string; column: string; type: string }> = [
  { table: 'users', column: 'email_verified', type: 'INTEGER' },
  { table: 'users', column: 'discord_user_id', type: 'TEXT' },
  { table: 'users', column: 'discord_webhook', type: 'TEXT' },
  { table: 'users', column: 'custom_webhook', type: 'TEXT' },
  { table: 'users', column: 'whatsapp_number', type: 'TEXT' },
  { table: 'users', column: 'telegram_chat_id', type: 'TEXT' },
  { table: 'users', column: 'last_seen_system_message_version', type: 'TEXT' },
  { table: 'users', column: 'has_seen_welcome', type: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'users', column: 'jellyfin_user_id', type: 'TEXT' },
  { table: 'users', column: 'plex_user_id', type: 'TEXT' },
  { table: 'users', column: 'onyx_user_id', type: 'TEXT' },
  { table: 'media_requests', column: 'is_on_emby', type: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'media_requests', column: 'emby_item_id', type: 'TEXT' },
  { table: 'media_requests', column: 'requester_name', type: 'TEXT' },
  { table: 'media_requests', column: 'requester_email', type: 'TEXT' },
  { table: 'media_requests', column: 'requester_avatar', type: 'TEXT' },
  { table: 'media_subscriptions', column: 'poster_path', type: 'TEXT' },
  { table: 'watch_later', column: 'tmdb_id', type: 'TEXT' },
  { table: 'watch_events', column: 'tmdb_id', type: 'TEXT' },
  { table: 'support_tickets', column: 'attachments', type: 'TEXT' },
  { table: 'notifications', column: 'data', type: 'TEXT' },
  { table: 'support_categories', column: 'discord_mentions', type: 'TEXT' },
  { table: 'support_subcategories', column: 'discord_mentions', type: 'TEXT' },
  { table: 'file_shares', column: 'password', type: 'TEXT' },
];

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!row;
}

function runMigrations(db: Database.Database): void {
  // 1) Créer la table de méta-migrations
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS "_drizzle_meta" (
      "key" TEXT PRIMARY KEY NOT NULL,
      "value" TEXT,
      "applied_at" INTEGER NOT NULL
    );`);
  } catch (err) {
    console.warn('[Drizzle] _drizzle_meta creation skipped:', (err as Error).message);
  }

  // 2) Créer toutes les tables manquantes (sans les indexes d'abord)
  for (const t of TABLE_DEFINITIONS) {
    try {
      db.exec(t.ddl);
    } catch (err) {
      console.warn(`[Drizzle] Table ${t.name} creation skipped:`, (err as Error).message);
    }
  }

  // 3) ALTER TABLE ADD COLUMN idempotents pour rattraper les DB legacy
  for (const patch of COLUMN_PATCHES) {
    try {
      db.exec(`ALTER TABLE "${patch.table}" ADD COLUMN "${patch.column}" ${patch.type};`);
    } catch {
      // Colonne déjà présente — ignoré silencieusement
    }
  }

  // 4) Créer les indexes (isolé pour ne pas bloquer si doublons existants)
  for (const t of TABLE_DEFINITIONS) {
    if (t.indexes) {
      for (const idx of t.indexes) {
        try {
          db.exec(idx);
        } catch (err) {
          // Index déjà présent ou données en conflit — on logue mais on continue
          console.warn(`[Drizzle] Index on ${t.name} skipped:`, (err as Error).message);
        }
      }
    }
  }

  // 5) Migration one-shot : aligner les timestamps en millisecondes.
  //    Les tables créées par Drizzle (avant ce patch) stockaient en SECONDES
  //    alors que tout le reste (legacy Prisma) est en MILLISECONDES.
  //    On normalise en ms (multiplie par 1000 si valeur < 10^11 ~= année 5138 en s).
  const SEC_TO_MS_KEY = 'timestamps_normalized_to_ms_v1';
  const alreadyApplied = db
    .prepare(`SELECT value FROM "_drizzle_meta" WHERE key = ?`)
    .get(SEC_TO_MS_KEY) as { value: string } | undefined;

  if (!alreadyApplied) {
    const SEC_THRESHOLD = 100_000_000_000; // 10^11 ms = ~1973 ; toute valeur < c'est en secondes
    const tablesToFix: Array<{ table: string; columns: string[] }> = [
      { table: 'notification_events', columns: ['created_at', 'dispatched_at'] },
      { table: 'notification_deliveries', columns: ['created_at', 'sent_at', 'next_retry_at'] },
    ];

    const tx = db.transaction(() => {
      for (const { table, columns } of tablesToFix) {
        if (!tableExists(db, table)) continue;
        for (const col of columns) {
          // Mise à jour conditionnelle : on multiplie par 1000 uniquement les
          // valeurs encore en secondes (sinon idempotent).
          db.prepare(
            `UPDATE "${table}" SET "${col}" = "${col}" * 1000
             WHERE "${col}" IS NOT NULL AND "${col}" < ?`,
          ).run(SEC_THRESHOLD);
        }
      }
      db.prepare(
        `INSERT INTO "_drizzle_meta" (key, value, applied_at) VALUES (?, ?, ?)`,
      ).run(SEC_TO_MS_KEY, 'ok', Date.now());
    });

    try {
      tx();
      console.log('[Drizzle] Timestamps normalized to milliseconds');
    } catch (err) {
      console.error('[Drizzle] Timestamp normalization failed:', err);
    }
  }

  // 6) Migration one-shot : fix notification deliveries unique index
  //    L'index unique notification_deliveries_unique_recipient est nécessaire
  //    pour éviter les doublons et permettre le dispatch des notifications.
  const NOTIF_DELIVERIES_INDEX_KEY = 'notification_deliveries_unique_index_v1';
  const notifIndexApplied = db
    .prepare(`SELECT value FROM "_drizzle_meta" WHERE key = ?`)
    .get(NOTIF_DELIVERIES_INDEX_KEY) as { value: string } | undefined;

  if (!notifIndexApplied) {
    const tx = db.transaction(() => {
      // Vérifier si l'index existe déjà
      const indexExists = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='notification_deliveries' AND name='notification_deliveries_unique_recipient'`)
        .get();

      if (!indexExists) {
        console.log('[Drizzle] Creating notification_deliveries_unique_recipient index...');

        // Supprimer les doublons avant de créer l'index
        const duplicates = db.prepare(`
          SELECT event_id, recipient, provider, COUNT(*) as count
          FROM notification_deliveries
          GROUP BY event_id, recipient, provider
          HAVING count > 1
        `).all() as Array<{ event_id: number; recipient: string; provider: string; count: number }>;

        if (duplicates.length > 0) {
          console.log(`[Drizzle] Removing ${duplicates.length} duplicate delivery groups...`);
          for (const dup of duplicates) {
            db.prepare(`
              DELETE FROM notification_deliveries
              WHERE id NOT IN (
                SELECT MIN(id)
                FROM notification_deliveries
                WHERE event_id = ? AND recipient = ? AND provider = ?
              )
              AND event_id = ? AND recipient = ? AND provider = ?
            `).run(dup.event_id, dup.recipient, dup.provider, dup.event_id, dup.recipient, dup.provider);
          }
        }

        // Créer l'index unique
        db.prepare(`CREATE UNIQUE INDEX notification_deliveries_unique_recipient ON notification_deliveries (event_id, recipient, provider)`).run();
        console.log('[Drizzle] notification_deliveries_unique_recipient index created');

        // Corriger les events en attente sans deliveries
        const pendingEvents = db.prepare(`
          SELECT id, event
          FROM notification_events
          WHERE status = 'pending'
          AND id NOT IN (SELECT DISTINCT event_id FROM notification_deliveries)
          ORDER BY id DESC
        `).all() as Array<{ id: number; event: string }>;

        if (pendingEvents.length > 0) {
          console.log(`[Drizzle] Fixing ${pendingEvents.length} pending events without deliveries...`);

          // Récupérer le numéro WhatsApp par défaut (user 1)
          const user = db.prepare(`SELECT whatsapp_number FROM users WHERE id = 1`).get() as { whatsapp_number: string } | undefined;
          const defaultRecipient = user?.whatsapp_number || '33675199234';

          for (const e of pendingEvents) {
            try {
              db.prepare(`
                INSERT INTO notification_deliveries (event_id, recipient, provider, status, attempts, created_at, next_retry_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(e.id, defaultRecipient, 'evolution', 'pending', 0, Date.now(), Date.now());

              db.prepare(`UPDATE notification_events SET status = 'dispatched' WHERE id = ?`).run(e.id);
            } catch (err) {
              console.warn(`[Drizzle] Failed to fix event ${e.id}:`, (err as Error).message);
            }
          }
        }
      } else {
        console.log('[Drizzle] notification_deliveries_unique_recipient index already exists');
      }

      // Marquer la migration comme appliquée
      db.prepare(
        `INSERT INTO "_drizzle_meta" (key, value, applied_at) VALUES (?, ?, ?)`,
      ).run(NOTIF_DELIVERIES_INDEX_KEY, 'ok', Date.now());
    });

    try {
      tx();
      console.log('[Drizzle] Notification deliveries index migration completed');
    } catch (err) {
      console.error('[Drizzle] Notification deliveries index migration failed:', err);
    }
  }

  if (isDev) console.log('[Drizzle] Migrations applied successfully');
}

// Migration des tables manquantes (support_* ajoutées après la v0.9)
// On vérifie explicitement car __mediahubDbInit peut être true sur une
// vieille version du schéma (DB initialisée avant l'ajout des tables support).
if (!isBuildPhase) {
  const supportTables = ['support_categories', 'support_subcategories', 'support_tickets'];
  const missing = supportTables.filter((t) => !tableExists(sqlite, t));

  if (missing.length > 0 || !globalForDb.__mediahubDbInit) {
    try {
      runMigrations(sqlite);
      globalForDb.__mediahubDbInit = true;
      if (missing.length > 0) {
        console.log('[Drizzle] Created missing tables:', missing.join(', '));
      }
    } catch (err) {
      console.error('[Drizzle] Migration error:', err);
    }
  }
}

// Créer l'instance Drizzle (singleton)
export const db: BetterSQLite3Database<typeof schema> = isBuildPhase
  ? (null as unknown as BetterSQLite3Database<typeof schema>)
  : (globalForDb.__mediahubDrizzle ?? (() => {
      const instance = drizzle(sqlite, { schema });
      globalForDb.__mediahubDrizzle = instance;
      return instance;
    })())

// Export du client SQLite brut si nécessaire
export { sqlite };

// Helper pour obtenir la DB (compat avec l'ancien pattern getPrisma)
export function getDB() {
  return db;
}

if (isDev) {
  console.log('[Drizzle] Database initialized at:', dbPath);
}
