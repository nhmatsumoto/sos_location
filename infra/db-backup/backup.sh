#!/bin/sh
set -e

# Configuration
BACKUP_DIR="/backups"
DB_NAME="sos_location"
DB_USER="sos_location_user"
DB_HOST="postgres"
# PGPASSWORD should be provided via environment variables

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql"

echo "Starting backup to ${FILENAME}..."
mkdir -p "${BACKUP_DIR}"

pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -F c -f "${FILENAME}"

echo "Backup completed successfully."

# Cleanup old backups (keep last 7 days)
find "${BACKUP_DIR}" -type f -name "${DB_NAME}_backup_*.sql" -mtime +7 -delete

if [ "$1" = "once" ]; then
    echo "Single run mode: exiting."
    exit 0
fi

# Periodic mode (if kept running as a service)
echo "Sleeping for 1 hour before next backup..."
sleep 3600
exec "$0"
