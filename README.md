# MediKiosk — AI-Assisted Pre-Consultation Clinical Information System

> **DEMO — SYNTHETIC DATA ONLY**
> This is a student project prototype. It is NOT a medical device and does NOT provide autonomous diagnosis or treatment advice.

---

## Problem Statement

Doctors in OPD settings have limited time per patient. Patients often provide unstructured verbal history and carry old prescriptions or lab reports that are difficult to review quickly. MediKiosk solves this by collecting structured patient history before consultation via a kiosk interface.

---

## Objectives

- Collect structured patient history via voice and touch
- Digitize previous medical documents via OCR
- Detect deterministic red flags (no autonomous diagnosis)
- Generate a physician-verifiable structured summary
- Produce FHIR-oriented JSON output
- Maintain full audit trail and session purge proof

---

## Features

- Voice + Touch dual-mode input
- Adaptive graph-driven interview (SOCRATES-style)
- Medical document upload and extraction (mock OCR)
- Deterministic red-flag detection from JSON rules
- Doctor verification and sign-off workflow
- FHIR-style JSON bundle generation
- Mock HIS integration
- Session purge with proof
- Full audit logging
- Multilingual UI (English, Hindi, Marathi)
- Accessibility controls (high contrast, large text, audio guided)
- Role-based access: Patient, Doctor, Triage, Admin

---

## Architecture

```
Patient Kiosk (React) → REST API (Express) → MySQL (XAMPP)
Doctor Portal (React) → REST API (Express) → MySQL (XAMPP)
Triage Console        → REST API (Express) → MySQL (XAMPP)
Admin Panel           → REST API (Express) → MySQL (XAMPP)
                                ↓
                         Mock HIS Viewer
```

---

## Technology Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, React Router DOM |
| Icons     | Lucide React                            |
| i18n      | react-i18next                           |
| HTTP      | Axios                                   |
| Backend   | Node.js, Express.js (ES Modules)        |
| Auth      | JWT (httpOnly cookie), bcryptjs         |
| Security  | Helmet, CORS, express-rate-limit        |
| Upload    | Multer (memory storage)                 |
| Validation| Zod                                     |
| Database  | MySQL 8.0 via XAMPP, mysql2 driver      |

---

## Folder Structure

```
medikiosk/
├── client/               # React frontend
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Route pages
│       ├── context/      # AuthContext, KioskContext
│       ├── hooks/        # useIdleTimer, useTTS
│       ├── services/     # Axios API client
│       └── i18n/         # en/hi/mr translations
├── server/               # Express backend
│   └── src/
│       ├── config/       # DB connection, seed
│       ├── middleware/   # JWT auth
│       ├── routes/       # All API routes
│       ├── services/     # Business logic
│       ├── providers/    # OCR mock provider
│       └── utils/        # Audit logger
├── database/
│   ├── schema.sql        # All CREATE TABLE statements
├── content/
│   ├── questions/        # Interview question graphs (JSON)
│   ├── redflags.json     # Deterministic red-flag rules
│   ├── ddi.json          # Demo drug interaction table
│   └── ayush.json        # AYUSH mode fields
├── .env.example
└── package.json          # Root scripts
```

---

## Database Setup (XAMPP)

### Step 1 — Install XAMPP
Download from https://www.apachefriends.org and install.

### Step 2 — Start MySQL
Open XAMPP Control Panel → Start **MySQL** (Apache is optional).

### Step 3 — Open phpMyAdmin
Navigate to: http://localhost/phpmyadmin

### Step 4 — Create Database
Click **New** → Name: `medikiosk` → Create

### Step 5 — Run Schema
Select `medikiosk` database → Click **SQL** tab → Paste contents of `database/schema.sql` → Go

### Step 6 — Demo accounts (automatic)
The server automatically seeds demo accounts and the synthetic demo patient record on first startup through `server/src/config/seed.js`. Passwords are hashed by the server. There is no separate `database/seed.sql` file to run.

---

## Environment Variables

Copy `.env.example` to `server/.env`:

```bash
copy .env.example server\.env
```

Key variables:

| Variable     | Default                  | Description              |
|--------------|--------------------------|--------------------------|
| PORT         | 5000                     | Backend port             |
| DB_HOST      | localhost                | MySQL host               |
| DB_NAME      | medikiosk                | Database name            |
| DB_USER      | root                     | MySQL user               |
| DB_PASSWORD  | (empty)                  | MySQL password           |
| JWT_SECRET   | change_this_secret       | JWT signing secret       |
| CORS_ORIGIN  | http://localhost:5173    | Frontend origin          |
| OCR_PROVIDER | mock                     | OCR provider (mock only) |

---

## Installation

```bash
# 1. Clone / extract project
cd medikiosk

# 2. Install all dependencies
npm install
npm --prefix server install
npm --prefix client install

# 3. Configure environment
copy .env.example server\.env
# Edit server\.env if needed (DB password etc.)

# 4. Set up database in phpMyAdmin (see above)
```

---

## Running the Project

```bash
npm run dev
```

This starts both:
- Frontend: http://localhost:5173
- Backend:  http://localhost:5000

---

## Demo Accounts

| Role    | Username | Password    |
|---------|----------|-------------|
| Doctor  | doctor   | Doctor@123  |
| Triage  | triage   | Triage@123  |
| Admin   | admin    | Admin@123   |
| Patient | patient  | Patient@123 |

All accounts are **demo accounts with synthetic data only**.

---

## API Documentation

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | /api/auth/login                   | Login                    |
| POST   | /api/auth/logout                  | Logout                   |
| GET    | /api/auth/me                      | Current user             |
| POST   | /api/patients                     | Create patient           |
| POST   | /api/sessions                     | Create session           |
| GET    | /api/sessions/:id                 | Get session + slots      |
| PATCH  | /api/sessions/:id                 | Update session           |
| DELETE | /api/sessions/:id                 | Purge session            |
| POST   | /api/consents                     | Record consent           |
| POST   | /api/consents/:id/revoke          | Revoke consent           |
| GET    | /api/dialogue/:sessionId/next     | Get next question        |
| POST   | /api/dialogue/:sessionId/answer   | Save answer              |
| GET    | /api/triage/alerts                | Get red flag alerts      |
| POST   | /api/triage/alerts/:id/acknowledge| Acknowledge alert        |
| POST   | /api/documents/extract            | Upload & extract doc     |
| POST   | /api/documents/:id/verify         | Patient verify doc       |
| POST   | /api/encounters                   | Create encounter         |
| GET    | /api/encounters                   | List encounters          |
| GET    | /api/encounters/:id/summary       | Get summary              |
| PATCH  | /api/encounters/:id/summary       | Edit summary             |
| POST   | /api/encounters/:id/sign          | Doctor sign-off          |
| GET    | /api/encounters/:id/fhir          | Get FHIR bundle          |
| POST   | /api/his/records                  | Push to mock HIS         |
| GET    | /api/his/records                  | View HIS records         |
| GET    | /api/admin/audit                  | Audit logs               |
| GET    | /api/admin/purge-proof            | Purge proof records      |

---

## Application Routes

| Path                      | Description              |
|---------------------------|--------------------------|
| /                         | Landing page             |
| /login                    | Staff login              |
| /kiosk/identify           | Patient identification   |
| /kiosk/consent            | Consent screen           |
| /kiosk/complaint          | Complaint selection      |
| /kiosk/interview          | Adaptive interview       |
| /kiosk/documents          | Document upload          |
| /kiosk/review             | Patient review           |
| /kiosk/done               | Completion + purge proof |
| /doctor                   | Doctor queue             |
| /doctor/encounter/:id     | Encounter view           |
| /triage                   | Triage dashboard         |
| /his                      | Mock HIS viewer          |
| /admin/audit              | Audit logs               |
| /admin/purge-proof        | Purge proof              |
| /me                       | Patient dashboard        |

---

## Testing

```bash
npm test
```

---

## Limitations

- OCR is mock only (no real document text extraction)
- Voice uses browser Web Speech API (Chrome recommended)
- No real ABHA integration
- No real HIS/ABDM integration
- Demo OTP is always `123456`
- Encryption is placeholder (not production-grade)

---

## Future Scope

- Real OCR via Gemini Vision API
- Real ASR via Sarvam AI
- ABDM FHIR compliance
- Real ABHA verification
- Multi-doctor scheduling
- Prescription history timeline
- Telemedicine integration

---

## Safety Disclaimer

MediKiosk is a student project prototype using synthetic data only.
It is NOT a medical device.
It does NOT provide autonomous diagnosis or treatment recommendations.
Red flags only indicate "Priority for staff review."
No real patient data is used or stored.
