-- MediKiosk Seed Data
-- Run AFTER schema.sql
-- All accounts are DEMO accounts with synthetic data only

USE medikiosk;

-- Demo users (passwords are bcrypt hashed)
-- doctor: Doctor@123
-- triage: Triage@123
-- admin: Admin@123
-- patient: Patient@123

INSERT INTO users (role, username, password_hash, display_name) VALUES
('doctor',  'doctor',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dr. Demo Sharma'),
('triage',  'triage',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Triage Staff Demo'),
('admin',   'admin',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin Demo'),
('patient', 'patient', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Patient');

-- NOTE: The server automatically seeds demo users on first startup with properly
-- hashed passwords (Doctor@123, Triage@123, Admin@123, Patient@123).
-- See server/src/config/seed.js for the actual seeding logic.
-- Manual seeding above uses placeholder hashes and is optional.

-- Demo patient record
INSERT INTO patients (name_encrypted, dob_encrypted, sex, phone_encrypted, phone_hash, preferred_language, user_id)
VALUES ('DEMO_PATIENT_ENCRYPTED', 'DEMO_DOB_ENCRYPTED', 'male', 'DEMO_PHONE_ENCRYPTED', 'DEMO_PHONE_HASH', 'en', 4);

-- Demo encounter
INSERT INTO encounters (patient_id, token_no, language, status, red_flag_level, summary_draft_json, created_at)
VALUES (1, 'T001', 'en', 'pending', 'none', '{"chiefComplaint":"Demo encounter - synthetic data only"}', NOW());

-- Demo audit log
INSERT INTO audit_logs (actor_role, actor_id, action, resource_type, resource_id, metadata_json)
VALUES ('admin', 3, 'SEED_DATA_LOADED', 'system', '0', '{"note":"Demo seed data loaded"}');
