-- BLUEWRITE secure local authentication migration
-- Non-destructive: preserves all users, Officer profiles, reports, logs, and password hashes.
USE bluewrite_db;

ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active,
  ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER must_change_password,
  ADD COLUMN locked_until DATETIME NULL DEFAULT NULL AFTER failed_login_attempts,
  ADD COLUMN last_login_at DATETIME NULL DEFAULT NULL AFTER locked_until,
  ADD COLUMN password_changed_at DATETIME NULL DEFAULT NULL AFTER last_login_at,
  ADD INDEX idx_users_locked_until (locked_until);

-- Existing accounts retain access. Only accounts created after this migration are
-- explicitly marked must_change_password = TRUE by the Officer creation service.
