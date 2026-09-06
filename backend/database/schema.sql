-- BLUEWRITE database foundation — MySQL 8.4.x
CREATE DATABASE IF NOT EXISTS bluewrite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bluewrite_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NULL COMMENT 'One-way bcrypt hash; never store plaintext passwords',
  role ENUM('officer','admin') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  account_locked BOOLEAN NOT NULL DEFAULT FALSE,
  security_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL DEFAULT NULL,
  last_login_at DATETIME NULL DEFAULT NULL,
  last_login_ip VARCHAR(45) NULL DEFAULT NULL,
  password_changed_at DATETIME NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_users_username UNIQUE (username),
  INDEX idx_users_role (role),
  INDEX idx_users_locked_until (locked_until),
  INDEX idx_users_account_locked (account_locked),
  INDEX idx_users_security_review (security_review_required)
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS officers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  badge_number VARCHAR(30) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  `rank` VARCHAR(100) NULL,
  unit VARCHAR(150) NULL,
  department VARCHAR(150) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  status ENUM('Active','Disabled') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_officers_user UNIQUE (user_id),
  CONSTRAINT uq_officers_badge_number UNIQUE (badge_number),
  CONSTRAINT uq_officers_email UNIQUE (email),
  INDEX idx_officers_status (status),
  CONSTRAINT fk_officers_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_number VARCHAR(30) NOT NULL,
  officer_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(255) NULL,
  incident_type VARCHAR(100) NULL,
  incident_date DATE NULL,
  incident_time TIME NULL,
  location VARCHAR(500) NULL,
  summary TEXT NULL,
  narrative TEXT NULL,
  status ENUM('Draft','Submitted') NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_reports_report_number UNIQUE (report_number),
  INDEX idx_reports_officer_id (officer_id),
  INDEX idx_reports_status (status),
  INDEX idx_reports_incident_date (incident_date),
  INDEX idx_reports_created_at (created_at),
  CONSTRAINT fk_reports_officer FOREIGN KEY (officer_id) REFERENCES officers(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_reports_submission CHECK ((status = 'Draft' AND submitted_at IS NULL) OR (status = 'Submitted' AND submitted_at IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS report_people (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id BIGINT UNSIGNED NOT NULL,
  person_type ENUM('victim','complainant','witness','suspect','person_of_interest','other') NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  sex ENUM('male','female','other','unknown') NULL,
  date_of_birth DATE NULL,
  age SMALLINT UNSIGNED NULL,
  address VARCHAR(500) NULL,
  contact_number VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  identification_details VARCHAR(500) NULL,
  statement TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_report_people_report_id (report_id),
  INDEX idx_report_people_person_type (person_type),
  CONSTRAINT fk_report_people_report FOREIGN KEY (report_id) REFERENCES reports(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_report_people_age CHECK (age IS NULL OR age <= 130)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100) NULL,
  description VARCHAR(1000) NOT NULL,
  metadata JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_activity_logs_actor_user_id (actor_user_id),
  INDEX idx_activity_logs_action (action),
  INDEX idx_activity_logs_target_type (target_type),
  INDEX idx_activity_logs_created_at (created_at),
  CONSTRAINT fk_activity_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;