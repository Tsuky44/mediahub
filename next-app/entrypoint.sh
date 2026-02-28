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
else
    echo "ERROR: Prisma migrations failed!"
    
    # Auto-resolve the specific migration we know might fail due to the previous attempt
    MIGRATION_NAME="20260227100000_fix_user_group_members_id"
    echo "Attempting to auto-resolve potential failed migration '$MIGRATION_NAME'..."
    
    if npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"; then
        echo "Successfully marked '$MIGRATION_NAME' as rolled back. Retrying deploy..."
        if npx prisma migrate deploy; then
            echo "Prisma migrations completed successfully after resolution."
        else
            echo "ERROR: Prisma migrations failed again after resolution."
            echo "Listing prisma directory for debugging:"
            ls -la prisma/
            echo "CRITICAL ERROR: MIGRATION FAILED TWICE"
            tail -f /dev/null
        fi
    else
        echo "Failed to resolve migration. It might not be in a failed state or another error occurred."
        echo "Listing prisma directory for debugging:"
        ls -la prisma/
        echo "CRITICAL ERROR: MIGRATION FAILED AND COULD NOT BE RESOLVED"
        tail -f /dev/null
    fi
fi

echo "Starting application server..."
exec node server.js
