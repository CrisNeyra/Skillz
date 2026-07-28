#!/usr/bin/env bash
# Postgres backup helper for Railway / self-hosted.
# Usage: DATABASE_URL=postgres://... ./scripts/backup_postgres.sh
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL required}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/skillz-$STAMP.sql.gz"

echo "Backing up to $FILE"
pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "OK $(du -h "$FILE" | cut -f1)"
echo "Restore drill: gunzip -c $FILE | psql \$DATABASE_URL"
