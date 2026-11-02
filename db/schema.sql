-- CivicTrack Nagpur Schema (MySQL 8)
CREATE DATABASE IF NOT EXISTS civictrack;
USE civictrack;

CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS wards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  zone_id INT NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,   -- approximate centroid
  longitude DECIMAL(9,6) NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('citizen','officer') NOT NULL,
  ward_id INT NULL,                  -- officers only
  is_head BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  sla_days INT NOT NULL,
  severity_weight INT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ward_id INT NOT NULL,
  category_id INT NOT NULL,
  locality VARCHAR(150) NOT NULL,
  description VARCHAR(500) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  status ENUM('Open','In Progress','Pending Confirmation','Closed','Reopened') NOT NULL DEFAULT 'Open',
  parent_id INT NULL,                -- set when merged as duplicate
  affected_count INT NOT NULL DEFAULT 1,
  priority_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  reopen_count INT NOT NULL DEFAULT 0,
  closed_unverified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,        -- when officer marked resolved
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (parent_id) REFERENCES complaints(id) ON DELETE SET NULL,
  INDEX idx_ward_status (ward_id, status),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_by INT NULL,               -- NULL = system job
  note VARCHAR(500),
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS config (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  type ENUM('before','after') NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaint_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Read-only user for Power BI Desktop
CREATE USER IF NOT EXISTS 'powerbi_ro'@'%' IDENTIFIED BY 'PowerBI@123';
GRANT SELECT ON civictrack.* TO 'powerbi_ro'@'%';
FLUSH PRIVILEGES;

