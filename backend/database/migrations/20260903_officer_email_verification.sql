-- BLUEWRITE Officer email login verification challenges
-- Stores only an HMAC digest of each one-time code; never plaintext codes.
USE bluewrite_db;

CREATE TABLE IF NOT EXISTS login_verification_challenges (
  id CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  code_digest CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts_remaining TINYINT UNSIGNED NOT NULL DEFAULT 5,
  send_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
  last_sent_at DATETIME NOT NULL,
  consumed_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_login_challenge_user (user_id),
  INDEX idx_login_challenge_expires (expires_at),
  CONSTRAINT fk_login_challenge_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;
