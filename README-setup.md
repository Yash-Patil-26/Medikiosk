# MediKiosk developer setup files

Stack: React + Vite, Node.js + Express, MySQL 8. College/resume project; synthetic demo data only.

## Files
- `requirements.txt`: master dependency/prerequisite inventory. It is not executable.
- `setup.ps1`: checks tools and manifests, creates `server/.env` from `.env.example` if absent, and runs `npm ci` in root, server, and client.
- `run.ps1`: starts the app through the existing root `npm run dev`.

## Before first setup
The current `server/package.json` and `client/package.json` each contain an unused `"medikiosk": "file:.."` dependency. `setup.ps1` intentionally stops until those declarations are removed and the matching lockfiles are regenerated. Do not bypass this check.

After correcting those manifests/lockfiles, run PowerShell from the project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
```

Then:
1. Edit `server/.env`; set `DB_PASSWORD` as needed and replace `JWT_SECRET` with a unique random value.
2. Create the `medikiosk` database and review/apply `database/schema.sql`.
3. Apply `database/seed.sql` only if you want the included synthetic demo data. The backend also has an automatic seed routine; review it before first startup.
4. Run `Set-ExecutionPolicy -Scope Process Bypass` if needed, then `.un.ps1`.

Expected URLs from the current project: frontend `http://localhost:5173`, backend `http://localhost:5000`.

Do not commit `server/.env` or real credentials. The scripts do not create/drop databases or execute SQL automatically.
