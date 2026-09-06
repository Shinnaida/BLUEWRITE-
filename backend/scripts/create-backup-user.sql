-- BLUEWRITE — Least-privilege backup user
-- Run this ONCE against the MySQL server as root (or another admin account):
--   mysql -u root -p < backend/scripts/create-backup-user.sql
-- (Adjust host part if backups will run from another machine: 'localhost' -> '<backup-host-ip>'.)
--
-- Privileges are the minimum mysqldump needs for --single-transaction dumps:
--   SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, PROCESS
-- No INSERT/UPDATE/DELETE/DROP — this account cannot modify data or schema.

CREATE USER IF NOT EXISTS 'bluewrite_backup'@'localhost' IDENTIFIED BY '<REPLACE_ME_WITH_A_LONG_RANDOM_PASSWORD>';

GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, PROCESS ON *.* TO 'bluewrite_backup'@'localhost';

-- Restrict to the BLUEWRITE schema only (replaces the global SELECT above if you prefer tighter scope):
-- REVOKE SELECT ON *.* FROM 'bluewrite_backup'@'localhost';
-- GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON bluewrite_db.* TO 'bluewrite_backup'@'localhost';
-- NOTE: PROCESS is global-only in MySQL and is required by newer mysqldump versions
-- unless you pass --no-tablespaces; the backup script already passes --no-tablespaces,
-- so the schema-scoped variant is safe to use.

FLUSH PRIVILEGES;

-- Verify:
-- SHOW GRANTS FOR 'bluewrite_backup'@'localhost';
