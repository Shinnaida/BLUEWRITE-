#!/usr/bin/env bash
# BLUEWRITE — Database restore script
# Restores a BLUEWRITE backup (plain .sql.gz or GPG-encrypted .sql.gz.gpg) into a
# target database. Defaults to the sandbox database bluewrite_restore_test so a
# restore test can never clobber the live schema by accident.
#
# Usage:
#   npm run restore -- backups/bluewrite-2026-09-06_120000.sql.gz[.gpg]
#   ./scripts/restore.sh <backup-file> [target-db]
#
# The target database must already exist (created empty). Set RESTORE_DB_USER /
# RESTORE_DB_PASSWORD in scripts/backup.env (an admin account — the backup user
# is read-only by design and cannot restore).

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

if [[ -f .env ]]; then set -a; source <(grep -E '^(DB_HOST|DB_PORT)=' .env); set +a; fi
if [[ -f scripts/backup.env ]]; then set -a; source scripts/backup.env; set +a; fi

BACKUP_FILE="${1:?Usage: restore.sh <backup-file[.gz[.gpg]]> [target-db]}"
TARGET_DB="${2:-bluewrite_restore_test}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
RESTORE_USER="${RESTORE_DB_USER:?RESTORE_DB_USER is required — set it in scripts/backup.env}"
RESTORE_PASSWORD="${RESTORE_DB_PASSWORD:?RESTORE_DB_PASSWORD is required — set it in scripts/backup.env}"
MYSQL_BIN="${MYSQL_BIN:-$(command -v mysql || echo '/c/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe')}"
GPG_KEY="${GPG_KEY:-}"

[[ -f "$BACKUP_FILE" ]] || { echo "[restore] ERROR: backup file not found: $BACKUP_FILE" >&2; exit 1; }

# Safety: refuse to point this at the live database name from .env
if [[ "$TARGET_DB" == "${DB_NAME:-bluewrite_db}" ]]; then
  echo "[restore] ERROR: refusing to restore over the live database '$TARGET_DB'." >&2
  echo "[restore] Pass an explicit sandbox name, e.g.: ./scripts/restore.sh <file> bluewrite_restore_test" >&2
  exit 1
fi

echo "[restore] target: $TARGET_DB @ $DB_HOST:$DB_PORT"

WORK="$BACKUP_FILE"
# Decrypt if needed (requires the private key on this machine for restore tests)
if [[ "$WORK" == *.gpg ]]; then
  [[ -n "$GPG_KEY" ]] || { echo "[restore] NOTE: GPG_KEY not set — attempting decryption with default key." >&2; }
  DECRYPTED="${WORK%.gpg}"
  gpg --batch --yes --output "$DECRYPTED" --decrypt "$WORK"
  WORK="$DECRYPTED"
fi

# Load into the target database
if [[ "$WORK" == *.gz ]]; then
  gzip -dc "$WORK" | MYSQL_PWD="$RESTORE_PASSWORD" "$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$RESTORE_USER" "$TARGET_DB"
else
  MYSQL_PWD="$RESTORE_PASSWORD" "$MYSQL_BIN" -h "$DB_HOST" -P "$DB_PORT" -u "$RESTORE_USER" "$TARGET_DB" < "$WORK"
fi

# Clean decrypted intermediate
if [[ -n "${DECRYPTED:-}" && -f "${DECRYPTED:-}" ]]; then shred -u "$DECRYPTED" 2>/dev/null || rm -f "$DECRYPTED"; fi

echo "[restore] done. Verify with:"
echo "  $MYSQL_BIN -h $DB_HOST -P $DB_PORT -u $RESTORE_USER -p -e \"SELECT COUNT(*) FROM $TARGET_DB.reports; SELECT COUNT(*) FROM $TARGET_DB.officers; SELECT COUNT(*) FROM $TARGET_DB.activity_logs;\""
