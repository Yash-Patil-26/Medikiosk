-- MediKiosk Database Schema
-- Run this in phpMyAdmin > SQL tab
-- Database: medikiosk

CREATE DATABASE IF NOT EXISTS medikiosk CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medikiosk;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('patient','doctor','triage','admin') NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(150),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  abha_hash VARCHAR(255),
  abha_last4 VARCHAR(4),
  name_encrypted VARCHAR(500),
  dob_encrypted VARCHAR(500),
  sex ENUM('male','female','other','prefer_not_to_say'),
  phone_encrypted VARCHAR(500),
  phone_hash VARCHAR(255),
  preferred_language VARCHAR(10) DEFAULT 'en',
  user_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  patient_id INT,
  language VARCHAR(10) DEFAULT 'en',
  ayush_mode TINYINT(1) DEFAULT 0,
  status ENUM('active','submitted','purged','expired') DEFAULT 'active',
  voice_consent TINYINT(1) DEFAULT 0,
  document_consent TINYINT(1) DEFAULT 0,
  share_his_consent TINYINT(1) DEFAULT 0,
  save_dashboard_consent TINYINT(1) DEFAULT 0,
  current_node_id VARCHAR(100),
  graph_id VARCHAR(100),
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS session_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  slot_id VARCHAR(100) NOT NULL,
  value TEXT,
  source ENUM('touch','voice','text','document') DEFAULT 'touch',
  raw_text TEXT,
  confidence DECIMAL(4,3),
  confirmed_by ENUM('touch','readback','patient_review') DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(100),
  role ENUM('system','patient') NOT NULL,
  text TEXT,
  source ENUM('touch','voice','text','tts') DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  doc_key VARCHAR(100),
  doc_type VARCHAR(50),
  doc_date DATE,
  provider VARCHAR(200),
  diagnoses_json JSON,
  medications_json JSON,
  labs_json JSON,
  confidence DECIMAL(4,3),
  verified_by_patient TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS red_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  rule_id VARCHAR(100),
  level ENUM('warning','critical') DEFAULT 'warning',
  reason VARCHAR(500),
  alert_id VARCHAR(36),
  acknowledged_by INT,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS encounters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  token_no VARCHAR(20),
  language VARCHAR(10) DEFAULT 'en',
  ayush_mode TINYINT(1) DEFAULT 0,
  status ENUM('pending','in_review','signed','cancelled') DEFAULT 'pending',
  red_flag_level ENUM('none','warning','critical') DEFAULT 'none',
  red_flag_reasons JSON,
  summary_draft_json JSON,
  summary_final_json JSON,
  doctor_notes TEXT,
  fhir_bundle_json LONGTEXT,
  his_status ENUM('pending','sent','failed') DEFAULT 'pending',
  signed_by INT,
  signed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS consents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT,
  session_id VARCHAR(36),
  encounter_id INT,
  purpose_key VARCHAR(100),
  granted TINYINT(1) DEFAULT 0,
  notice_version VARCHAR(20) DEFAULT '1.0',
  language VARCHAR(10) DEFAULT 'en',
  action ENUM('grant','revoke') DEFAULT 'grant',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  actor_role VARCHAR(50),
  actor_id INT,
  action VARCHAR(200),
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  metadata_json JSON
);

CREATE TABLE IF NOT EXISTS his_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  encounter_id INT,
  bundle_json LONGTEXT,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
);
