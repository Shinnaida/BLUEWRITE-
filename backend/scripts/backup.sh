#!/usr/bin/env bash
# BLUEWRITE — Database backup script
# Creates a timestamped, gzip-compressed logical backup of the BLUEWRITE MySQL
# database using the least-privilege 'bluewrite_backup' account, then GPG-encrypts it.
#
# Usage:  npm run backup          (from backend/)
#         ./scripts/backup.sh
#
# Configuration is read from backend/.env (the same file the app uses) plus
# optional overrides from scripts/backup.env (never committed).

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

# ── Config ────────────────────────────────────────────────────────────────
# Base DB settings come from backend/.env (same convention as the app).
# Optional overrides live in scripts/backup.env (BACKUP_DIR, GPG_KEY, MYSQLDUMP_BIN...).
if [[ -f .env ]]; then set -a; source <(grep -E '^(DB_HOST|DB_PORT|DB_NAME)=' .env); set +a; fi
if [[ -f scripts/backup.env ]]; then set -a; source scripts/backup.env; set +a; fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-bluewrite_db}"
BACKUP_USER="${BACKUP_USER:-bluewrite_backup}"
BACKUP_PASSWORD="${BACKUP_DB_PASSWORD:?BACKUP_DB_PASSWORD is required — set it in scripts/backup.env}"
BACKUP_DIR="${BACKUP_DIR:-$BACKEND_DIR/backups}"
MYSQLDUMP_BIN="${MYSQLDUMP_BIN:-$(command -v mysqldump || echo '/c/Program Files/MySQL/MySQL Server 8.4/bin/mysqldump.exe')}"
GPG_KEY="${GPG_KEY:-}"   # recipient key id/email; empty = no encryption (not recommended)
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%F_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/bluewrite-$STAMP.sql.gz"
OUT_FILE="$DUMP_FILE"

echo "[backup] database : $DB_NAME @ $DB_HOST"
echo "[backup] output   : $OUT_FILE"

# ── Dump (single transaction = consistent snapshot, no table locks) ──────
MYSQL_PWD="$BACKUP_PASSWORD" "$MYSQLDUMP_BIN" \
  --no-tablespaces \
  --single-transaction \
  --routines --triggers --events \
  --default-character-set=utf8mb4 \
  -h "$DB_HOST" -P "$DB_PORT" -u "$BACKUP_USER" \
  "$DB_NAME" | gzip > "$DUMP_FILE"

# Fail if the dump came out empty (pipe would otherwise mask mysqldump errors)
if [[ ! -s "$DUMP_FILE" ]]; then
  echo "[backup] ERROR: dump file is empty — backup FAILED" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

# ── Encrypt (GPG public-key encryption; private key kept off this machine) ─
if [[ -n "$GPG_KEY" ]]; then
  OUT_FILE="$DUMP_FILE.gpg"
  gpg --batch --yes --trust-model always --recipient "$GPG_KEY" \
    --output "$OUT_FILE" --encrypt "$DUMP_FILE"
  shred -u "$DUMP_FILE" 2>/dev/null || rm -f "$DUMP_FILE"
  echo "[backup] encrypted: $OUT_FILE"
fi

# ── Retention: delete backups older than RETENTION_DAYS ───────────────────
find "$BACKUP_DIR" -name 'bluewrite-*.sql.gz*' -mtime "+$RETENTION_DAYS" -delete

echo "[backup] done: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
