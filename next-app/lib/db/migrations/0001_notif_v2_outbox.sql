-- Notification V2 Outbox Tables Migration

-- notification_events table
CREATE TABLE IF NOT EXISTS "notification_events" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	"request_id" INTEGER REFERENCES "media_requests"("id") ON DELETE SET NULL,
	"tmdb_id" TEXT NOT NULL,
	"media_type" TEXT NOT NULL,
	"event" TEXT NOT NULL,
	"correlation_id" TEXT NOT NULL,
	"payload" TEXT NOT NULL,
	"status" TEXT DEFAULT 'pending' NOT NULL,
	"dedup_key" TEXT NOT NULL UNIQUE,
	"created_at" INTEGER NOT NULL,
	"dispatched_at" INTEGER
);

-- Indexes for notification_events
CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_dedup_key_unique" ON "notification_events" ("dedup_key");
CREATE INDEX IF NOT EXISTS "notification_events_request_event_idx" ON "notification_events" ("request_id", "event");
CREATE INDEX IF NOT EXISTS "notification_events_status_created_idx" ON "notification_events" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "notification_events_tmdb_type_idx" ON "notification_events" ("tmdb_id", "media_type");

-- notification_deliveries table
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	"event_id" INTEGER NOT NULL REFERENCES "notification_events"("id") ON DELETE CASCADE,
	"recipient" TEXT NOT NULL,
	"provider" TEXT DEFAULT 'evolution' NOT NULL,
	"status" TEXT DEFAULT 'pending' NOT NULL,
	"attempts" INTEGER DEFAULT 0 NOT NULL,
	"last_error" TEXT,
	"sent_at" INTEGER,
	"next_retry_at" INTEGER,
	"created_at" INTEGER NOT NULL
);

-- Indexes for notification_deliveries
CREATE INDEX IF NOT EXISTS "notification_deliveries_event_id_idx" ON "notification_deliveries" ("event_id");
CREATE INDEX IF NOT EXISTS "notification_deliveries_status_retry_idx" ON "notification_deliveries" ("status", "next_retry_at");
