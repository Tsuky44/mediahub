# Notifications V2 — Implementation Summary

## What was implemented

### 1. New Database Tables (Migration)
**File:** `lib/db/migrations/0001_notif_v2_outbox.sql`

- **`notification_events`**: Stores each event with UNIQUE constraint on `dedup_key`
  - `id`, `request_id`, `tmdb_id`, `media_type`, `event`, `correlation_id`, `payload`, `status`, `dedup_key`, `created_at`, `dispatched_at`
  - Key constraint: `UNIQUE(dedup_key)` guarantees 0 doublon at DB level

- **`notification_deliveries`**: Outbox pattern - one row per recipient
  - `id`, `event_id`, `recipient`, `provider`, `status`, `attempts`, `last_error`, `sent_at`, `next_retry_at`, `created_at`
  - Indexed by `(status, next_retry_at)` for efficient worker polling

### 2. Store Layer
**Files:** `lib/notifications-v2/store/`

- **`dedup-key.ts`**: Builds unique keys like `req:42:MEDIA_GRABBED` for atomic dedup
- **`event-store.ts`**: `recordEvent()` with INSERT OR IGNORE, `markEventDispatched()`, `seedExistingEvents()`
- **`delivery-store.ts`**: `enqueueDelivery()`, `claimDueDeliveries()`, `markDeliverySent()`, `scheduleRetry()`, `markDeliveryFailed()`
- **`recipient-resolver.ts`**: Pure function to resolve recipients from config + user DB
- **`index.ts`**: Re-exports all store functions

### 3. Dispatcher
**File:** `lib/notifications-v2/dispatcher.ts`

Orchestrates the flow:
1. Load config
2. `recordEvent()` with atomic dedup (UNIQUE constraint)
3. If duplicate → return early
4. Resolve recipients from config
5. `enqueueDeliveries()` in outbox
6. Return result

Key method: `dispatch(event, payload)` — the entry point for all notifications.

### 4. Outbox Worker
**File:** `lib/notifications-v2/outbox/outbox-worker.ts`

Background worker that:
- Polls every 5 seconds for pending deliveries
- Claims batch of 10 pending deliveries
- Sends via EvolutionProvider
- On success: `markDeliverySent()`
- On failure: `scheduleRetry()` with exponential backoff
- After max attempts: `markDeliveryFailed()`
- When all deliveries done: `markEventDispatched()`

### 5. Updated Bootstrap
**File:** `lib/notifications-v2/bootstrap.ts`

- Removed: `EvolutionListener` (old immediate-send pattern)
- Added: `OutboxWorker` (reliable background processing)
- Guards: process ID check for dev hot-reload safety

### 6. Updated Public API
**File:** `lib/notifications-v2/index.ts`

`Notify.*` helpers now use `dispatch()` directly instead of `notificationBus.emit()`:
- This prevents "event dropped because no listener ready" issue
- Events are immediately persisted to DB

### 7. Updated Pollers

**AvailabilityPoller** (`lib/notifications-v2/pollers/availability-poller.ts`):
- Removed: JSON `seen_available_ids` in settings table
- Now uses: `dispatch()` which handles dedup via `notification_events` table
- Uses: `seedExistingEvents()` at startup to prevent spam

**RealtimeOrchestrator** (`lib/notifications-v2/realtime/realtime-orchestrator.ts`):
- Removed: In-memory `lastEmittedAt` Map for dedup
- Removed: `notifications_v2_progress_states` JSON in settings
- Now uses: `getLastProgressEventState()` reads from `notification_events` table
- Uses: `dispatch()` for each progress transition

### 8. Deprecated EvolutionListener
**File:** `lib/notifications-v2/listeners/evolution-listener.ts`

- Marked as DEPRECATED
- Now just forwards to `dispatch()` for backward compatibility
- Bootstrap no longer starts it

## How it solves the original problems

| Problem | Solution |
|---------|----------|
| Notifs envoyées 2× | UNIQUE(dedup_key) in DB → infaillible même après restart |
| Notifs jamais envoyées | Outbox pattern: pending deliveries persist in DB until sent |
| Events perdus avant listener prêt | `Notify.*` → `dispatch()` direct (pas via bus) |
| Retry fragile | Backoff exponentiel stocké en DB (`next_retry_at`) |
| États en JSON (race conditions) | Tout en DB avec transactions SQLite |

## Testing checklist

After migration is applied:
1. `pnpm drizzle-kit migrate` (or run SQL manually)
2. Restart app → check logs for "[NotifV2] Bootstrap complete"
3. Request a media → should see "Event recorded" + "Enqueued X deliveries"
4. Check DB: `SELECT * FROM notification_events` → 1 row per event
5. Check DB: `SELECT * FROM notification_deliveries` → 1 row per recipient, status='sent'
6. Request same media again → should see "Duplicate event detected. Skipping."
7. Stop Evolution API → deliveries should go to 'pending' + retry
8. Restart app → pending deliveries should be processed

## Migration command

```bash
cd next-app
# Option 1: Using drizzle-kit (if available)
pnpm drizzle-kit migrate

# Option 2: Manual SQL execution
sqlite3 data/db/dev.db < lib/db/migrations/0001_notif_v2_outbox.sql
```

## Rollback (if needed)

```sql
DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS notification_events;
```
