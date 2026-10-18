# MediKiosk developer setup files

Stack: React + Vite, Node.js + Express, MySQL 8. College/resume project; synthetic demo data only.

## Files
- `requirements.txt`: master dependency/prerequisite inventory. It is not executable.
- `setup.ps1`: checks tools and manifests, creates `server/.env` from `.env.example` if absent, and runs `npm ci` in root, server, and client.
- `run.ps1`: starts the app through the existing root `npm run dev`.

## First-time setup
Run PowerShell from the project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
```

Then:
1. Edit `server/.env`; set `DB_PASSWORD` as needed and replace `JWT_SECRET` with a unique random value.
2. Create the `medikiosk` database and apply `database/schema.sql` (see `database/README.md`).
3. Run `.\run.ps1`. Demo accounts and demo data are seeded automatically on first server start -- see `database/README.md` for the account list.

Expected URLs from the current project: frontend `http://localhost:5173`, backend `http://localhost:5000`.

Do not commit `server/.env` or real credentials. The scripts do not create/drop databases or execute SQL automatically.
