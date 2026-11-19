-- MediKiosk Database Schema (PostgreSQL)
-- Apply this file to a selected, empty PostgreSQL database.
-- Create/select the database separately; this file creates tables only.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient','doctor','triage','admin')),
  username VARCHAR(100) NOT NULL UNIQUE,
  login_identifier_type VARCHAR(16) NULL,
  login_identifier VARCHAR(254) NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (login_identifier_type, login_identifier)
);

-- Patient account identifiers are stored for account login.
-- ABHA/mobile/email ownership is not verified by this schema, and the system
-- does not provide application-layer encryption for these values. Use
-- values for testing and do not treat this as a production health system.
CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  sex VARCHAR(20) CHECK (sex IN ('male','female','other','prefer_not_to_say')),
  preferred_language VARCHAR(10) DEFAULT 'en',
  date_of_birth DATE NULL,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS patient_consent_preferences (
  patient_id INTEGER NOT NULL,
  purpose_key VARCHAR(32) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  notice_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_id, purpose_key),
  CONSTRAINT fk_patient_consent_preferences_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  patient_id INTEGER,
  language VARCHAR(10) DEFAULT 'en',
  ayush_mode BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','submitted','purged','expired')),
  voice_consent BOOLEAN DEFAULT FALSE,
  document_consent BOOLEAN DEFAULT FALSE,
  share_his_consent BOOLEAN DEFAULT FALSE,
  save_dashboard_consent BOOLEAN DEFAULT FALSE,
  current_node_id VARCHAR(100),
  graph_id VARCHAR(100),
  expires_at TIMESTAMP,
  kiosk_token_hash CHAR(64) NULL,
  doctor_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS session_slots (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  slot_id VARCHAR(100) NOT NULL,
  value TEXT,
  source VARCHAR(20) DEFAULT 'touch' CHECK (source IN ('touch','voice','text','document')),
  raw_text TEXT,
  confidence DECIMAL(4,3),
  confirmed_by VARCHAR(20) CHECK (confirmed_by IN ('touch','readback','patient_review')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('system','patient')),
  text TEXT,
  source VARCHAR(20) DEFAULT 'text' CHECK (source IN ('touch','voice','text','tts')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  doc_key VARCHAR(100),
  doc_type VARCHAR(50),
  doc_date DATE,
  provider VARCHAR(200),
  diagnoses_json JSONB,
  medications_json JSONB,
  labs_json JSONB,
  confidence DECIMAL(4,3),
  verified_by_patient BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS red_flags (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  rule_id VARCHAR(100),
  level VARCHAR(20) DEFAULT 'warning' CHECK (level IN ('warning','critical')),
  reason VARCHAR(500),
  alert_id VARCHAR(36),
  acknowledged_by INTEGER,
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS encounters (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER,
  session_id VARCHAR(36) NULL,
  token_no VARCHAR(20),
  language VARCHAR(10) DEFAULT 'en',
  ayush_mode BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_review','signed','cancelled')),
  red_flag_level VARCHAR(20) DEFAULT 'none' CHECK (red_flag_level IN ('none','warning','critical')),
  red_flag_reasons JSONB,
  summary_draft_json JSONB,
  summary_final_json JSONB,
  doctor_notes TEXT,
  fhir_bundle_json TEXT,
  his_status VARCHAR(20) DEFAULT 'pending' CHECK (his_status IN ('pending','sent','failed','not_shared')),
  signed_by INTEGER,
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_encounters_session_id FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS consents (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER,
  session_id VARCHAR(36),
  encounter_id INTEGER,
  purpose_key VARCHAR(100),
  granted BOOLEAN DEFAULT FALSE,
  notice_version VARCHAR(20) DEFAULT '1.0',
  language VARCHAR(10) DEFAULT 'en',
  action VARCHAR(20) DEFAULT 'grant' CHECK (action IN ('grant','deny','revoke')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_role VARCHAR(50),
  actor_id INTEGER,
  action VARCHAR(200),
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  metadata_json JSONB
);

CREATE TABLE IF NOT EXISTS his_records (
  id SERIAL PRIMARY KEY,
  encounter_id INTEGER,
  bundle_json TEXT,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_slots_session_id ON session_slots(session_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_status ON encounters(status);
CREATE INDEX IF NOT EXISTS idx_encounters_token_no ON encounters(token_no);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);