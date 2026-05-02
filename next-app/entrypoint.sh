#!/bin/sh
# entrypoint.sh

# Print commands for debugging
set -x

echo "Starting MediaHub entrypoint script..."
echo "User: $(whoami) (ID: $(id -u))"
echo "Current directory: $(pwd)"

# Ensure DATABASE_URL is set
export DATABASE_URL=${DATABASE_URL:-"file:./db.sqlite"}
echo "Using DATABASE_URL: $DATABASE_URL"

# Check if database file exists
if [ -f "./db.sqlite" ]; then
    echo "Database file exists."
    ls -l ./db.sqlite
else
    echo "Database file does not exist (yet)."
fi

echo "Running Prisma migrations..."
# Try to deploy migrations
if npx prisma migrate deploy; then
    echo "Prisma migrations completed successfully."
    echo "Ensuring schema is fully synced with database (for non-migrated changes)..."
    npx prisma db push --accept-data-loss --skip-generate || echo "Warning: db push failed, but continuing since migrations passed."
else
    echo "ERROR: Prisma migrations failed!"
    
    # List of migrations that might need resolution (idempotent migrations)
    # We try to mark them as rolled back so they can be re-applied
    MIGRATIONS_TO_RESOLVE="20260227100000_fix_user_group_members_id 20260307140000_fix_schema_drift"
    
    RESOLVED_ANY=false
    
    for MIGRATION_NAME in $MIGRATIONS_TO_RESOLVE; do
        echo "Checking potential failed migration '$MIGRATION_NAME'..."
        if npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"; then
            echo "Successfully marked '$MIGRATION_NAME' as rolled back."
            RESOLVED_ANY=true
        else
            echo "Migration '$MIGRATION_NAME' could not be resolved (likely not in failed state)."
        fi
    done

    echo "Retrying deploy..."
    if npx prisma migrate deploy; then
        echo "Prisma migrations completed successfully after resolution."
    else
        echo "ERROR: Prisma migrations failed again. Attempting forced schema push..."
        echo "WARNING: This might cause data loss if columns are removed, but it will sync the database schema."
        
        # Emergency cleanup script before push
        echo "Running emergency database cleanup script..."
        node scripts/emergency-fix-db.js || echo "Cleanup script failed, but continuing..."
        
        # Added --skip-generate because we are in a production container where we can't easily regenerate the client
        # and the client should have been generated during the build stage anyway.
        if npx prisma db push --accept-data-loss --skip-generate; then
             echo "Prisma db push completed successfully. Database schema is now in sync."
             
             # Mark all migrations as resolved since we pushed the schema
             echo "Marking all pending migrations as resolved..."
             npx prisma migrate resolve --applied 20260227100000_fix_user_group_members_id || true
             npx prisma migrate resolve --applied 20260307140000_fix_schema_drift || true
        else
             echo "CRITICAL ERROR: Both migration and db push failed."
             echo "Listing prisma directory for debugging:"
             ls -la prisma/
             tail -f /dev/null
        fi
    fi
fi

# Enable WAL mode for better SQLite concurrency
echo "Enabling SQLite WAL mode for better concurrency..."
node scripts/enable-wal.js || echo "Warning: Failed to enable WAL mode, continuing anyway..."

echo "Starting application server..."
exec node server.js
