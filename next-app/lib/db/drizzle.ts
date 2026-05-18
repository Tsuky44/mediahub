import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { resolve, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

// Patch BigInt pour JSON.stringify / NextResponse.json()
// Nécessaire car les modèles ont des champs BigInt (DailyTrackerStat, TrackerStatsLog)
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
    ],
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
    name: 'file_shares',
    ddl: `CREATE TABLE IF NOT EXISTS "file_shares" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "file_path" TEXT NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
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
    ],
  },
  {
    name: 'daily_tracker_stats',
    ddl: `CREATE TABLE IF NOT EXISTS "daily_tracker_stats" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "date" INTEGER NOT NULL,
      "tracker" TEXT NOT NULL,
      "total_uploaded" BLOB NOT NULL DEFAULT (X'0000000000000000'),
      "total_downloaded" BLOB NOT NULL DEFAULT (X'0000000000000000'),
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS "daily_tracker_stats_date_tracker_unique" ON "daily_tracker_stats" ("date", "tracker");`,
      `CREATE INDEX IF NOT EXISTS "daily_tracker_stats_date_idx" ON "daily_tracker_stats" ("date");`,
    ],
  },
  {
    name: 'tracker_stats_logs',
    ddl: `CREATE TABLE IF NOT EXISTS "tracker_stats_logs" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      "tracker" TEXT NOT NULL,
      "total_uploaded" BLOB NOT NULL,
      "total_downloaded" BLOB NOT NULL,
      "uploaded_diff" BLOB NOT NULL DEFAULT (X'0000000000000000'),
      "downloaded_diff" BLOB NOT NULL DEFAULT (X'0000000000000000'),
      "timestamp" INTEGER NOT NULL
    );`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS "tracker_stats_logs_timestamp_idx" ON "tracker_stats_logs" ("timestamp");`,
      `CREATE INDEX IF NOT EXISTS "tracker_stats_logs_tracker_timestamp_idx" ON "tracker_stats_logs" ("tracker", "timestamp");`,
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
  { table: 'media_requests', column: 'is_on_emby', type: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'media_requests', column: 'emby_item_id', type: 'TEXT' },
  { table: 'media_requests', column: 'requester_name', type: 'TEXT' },
  { table: 'media_requests', column: 'requester_email', type: 'TEXT' },
  { table: 'media_requests', column: 'requester_avatar', type: 'TEXT' },
  { table: 'media_subscriptions', column: 'poster_path', type: 'TEXT' },
  { table: 'watch_later', column: 'tmdb_id', type: 'TEXT' },
  { table: 'watch_events', column: 'tmdb_id', type: 'TEXT' },
];

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!row;
}

function runMigrations(db: Database.Database): void {
  // 1) Créer la table de méta-migrations
  db.exec(`CREATE TABLE IF NOT EXISTS "_drizzle_meta" (
    "key" TEXT PRIMARY KEY NOT NULL,
    "value" TEXT,
    "applied_at" INTEGER NOT NULL
  );`);

  // 2) Créer toutes les tables manquantes + leurs indexes
  for (const t of TABLE_DEFINITIONS) {
    db.exec(t.ddl);
    if (t.indexes) {
      for (const idx of t.indexes) db.exec(idx);
    }
  }

  // 3) ALTER TABLE ADD COLUMN idempotents pour rattraper les DB legacy
  for (const patch of COLUMN_PATCHES) {
    try {
      db.exec(`ALTER TABLE "${patch.table}" ADD COLUMN "${patch.column}" ${patch.type};`);
    } catch {
      // Colonne déjà présente — ignoré
    }
  }

  // 4) Migration ponctuelle des BLOB BigInt (anciennes colonnes en INTEGER)
  for (const tableName of ['tracker_stats_logs', 'daily_tracker_stats'] as const) {
    try {
      const tableInfo = db
        .prepare(`PRAGMA table_info("${tableName}")`)
        .all() as Array<{ name: string; type: string }>;
      const uploadedCol = tableInfo.find((c) => c.name === 'total_uploaded');
      if (uploadedCol && uploadedCol.type.toUpperCase() !== 'BLOB') {
        console.log(`[Drizzle] Migrating ${tableName}: INTEGER bigint -> BLOB`);
        db.exec(`ALTER TABLE "${tableName}" RENAME TO "${tableName}_old";`);
        const def = TABLE_DEFINITIONS.find((d) => d.name === tableName)!;
        db.exec(def.ddl);
        if (def.indexes) for (const idx of def.indexes) db.exec(idx);
        db.exec(`DROP TABLE "${tableName}_old";`);
      }
    } catch (err) {
      console.warn(`[Drizzle] Skipped BLOB migration on ${tableName}:`, (err as Error).message);
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
      { table: 'daily_tracker_stats', columns: ['date', 'created_at', 'updated_at'] },
      { table: 'tracker_stats_logs', columns: ['timestamp'] },
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

  if (isDev) console.log('[Drizzle] Migrations applied successfully');
}

if (!isBuildPhase && !globalForDb.__mediahubDbInit) {
  try {
    runMigrations(sqlite);
    globalForDb.__mediahubDbInit = true;
  } catch (err) {
    console.error('[Drizzle] Migration error:', err);
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
