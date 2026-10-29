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
- Role-based access: Patient, Doctor, Staff, Admin

---

## Architecture

```
Patient Kiosk (React) → REST API (Express) → MySQL (XAMPP)
Doctor Portal (React) → REST API (Express) → MySQL (XAMPP)
Staff Console          → REST API (Express) → MySQL (XAMPP)
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

### Staff Accounts

| Role    | Username | Password    |
|---------|----------|-------------|
| Doctor  | doctor   | Doctor@123  |
| Staff  | staff   | Staff@123  |
| Admin   | admin    | Admin@123   |

Staff accounts are used to access the doctor queue, staff dashboard, and admin panels.

### Patient Registration

Patients create their own accounts through the registration flow:

1. Visit `/register` to create a new patient account
2. Choose a login ID type: ABHA number, mobile number, or email address
3. Provide basic profile information (name, date of birth, sex, preferred language)
4. Set a password (minimum 10 characters)
5. Complete consent preferences for voice, document, HIS sharing, and dashboard storage
6. Sign in with the same login ID and password at `/login`

**Important:** This is an academic prototype. Login identifiers are validated for format but ownership is NOT verified through OTP or government health identity services. Use synthetic data for demonstrations only.

All accounts are **demo accounts with synthetic data only**.

---

## API Documentation

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | /api/auth/login                   | Login                    |
| POST   | /api/auth/logout                  | Logout                   |
| GET    | /api/auth/me                      | Current user             |
| POST   | /api/auth/register                | Register patient account |
| POST   | /api/sessions                     | Create session           |
| GET    | /api/sessions/:id                 | Get session + slots      |
| PATCH  | /api/sessions/:id                 | Update session           |
| DELETE | /api/sessions/:id                 | Purge session            |
| POST   | /api/auth/consent-preferences     | Save account consent preferences |
| POST   | /api/consents/:id/revoke          | Revoke consent           |
| GET    | /api/dialogue/:sessionId/next     | Get next question        |
| POST   | /api/dialogue/:sessionId/answer   | Save answer              |
| GET    | /api/staff/alerts                | Get red flag alerts      |
| POST   | /api/staff/alerts/:id/acknowledge| Acknowledge alert        |
| POST   | /api/documents/extract            | Upload & extract doc     |
| POST   | /api/documents/:id/verify         | Patient verify doc       |
| DELETE | /api/documents/:id                | Delete extracted document |
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
| /login                    | Sign-in for patients and staff (supports username, ABHA, mobile, email) |
| /register                 | Patient account registration with identifier selection |
| /register/consent         | Initial consent preferences for new accounts |
| /me                       | Patient dashboard        |
| /me/consent               | Manage consent preferences |
| /kiosk/complaint          | Complaint selection      |
| /kiosk/interview          | Adaptive interview       |
| /kiosk/documents          | Document upload          |
| /kiosk/review             | Patient review           |
| /kiosk/done               | Completion + purge proof |
| /doctor                   | Doctor queue             |
| /doctor/encounter/:id     | Encounter view           |
| /staff                   | Staff dashboard         |
| /his                      | Mock HIS viewer          |
| /admin/audit              | Audit logs               |
| /admin/purge-proof        | Purge proof              |

---

## Testing

Run the following commands from the repository root:

- Backend tests: `npm test`
- Frontend tests (single run): `npm --prefix client test -- --run`
- Production frontend build: `npm run build`

Note: `npm test` runs the backend test suite only. Frontend tests must be run separately.

---

## Limitations

- OCR is mock only (no real document text extraction)
- Voice uses browser Web Speech API (Chrome recommended)
- No real ABHA integration
- No real HIS/ABDM integration
- Patient identifiers (ABHA, mobile, email) are validated for format but ownership is NOT verified through OTP or government health identity services. Use synthetic data for demonstrations only.
- No production-grade encryption for patient identifiers
- Patient account data persists in the database between sessions (not anonymous)

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
Do not enter real patient names, identifiers, contact details, prescriptions, lab reports, or other medical information.

---

## GitHub and Hosting Notes

### GitHub repository safety

- Keep actual environment files, database passwords, JWT secrets, and other credentials out of GitHub. Commit the example environment file only.
- Use synthetic demo data only. Do not upload real patient information or real medical documents.
- The root `.gitignore` excludes `.env`, dependency folders, build output, logs, and uploads.

### Hosting preparation

Provider-specific hosting configuration is not included in this repository. Deployment requires additional configuration and verification.

- Provision a MySQL database and apply `database/schema.sql` to the intended database.
- Configure the backend environment using `.env.example`, including database connection settings, a unique strong `JWT_SECRET`, and the correct `CORS_ORIGIN`.
- The Vite `/api` proxy targets `http://localhost:5000` for local development only. A hosted deployment must route `/api` to the backend through an appropriate proxy, or implement a configurable frontend API URL and matching CORS settings.
- Before deployment, run the backend tests with `npm test`, the frontend tests with `npm --prefix client test -- --run`, and the frontend production build with `npm run build`.
- Verify the health endpoint at `/api/health` after the backend is reachable.

### Deployment limitations

MediKiosk is an academic and portfolio prototype using synthetic demo data. It is not a production clinical service. Mock OCR and HIS functionality, missing real ABHA/ABDM integration, and unverified patient identifiers remain limitations.
