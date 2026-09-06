-- BLUEWRITE LAN login security enhancements
-- Non-destructive: existing accounts remain unlocked and usable.
USE bluewrite_db;

ALTER TABLE users
  ADD COLUMN account_locked BOOLEAN NOT NULL DEFAULT FALSE AFTER must_change_password,
  ADD COLUMN security_review_required BOOLEAN NOT NULL DEFAULT FALSE AFTER account_locked,
  ADD COLUMN last_login_ip VARCHAR(45) NULL DEFAULT NULL AFTER last_login_at,
  ADD INDEX idx_users_account_locked (account_locked),
  ADD INDEX idx_users_security_review (security_review_required);
