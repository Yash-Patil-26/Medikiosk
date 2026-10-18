# Database setup

1. Create the database and apply the schema:
   ```sql
   CREATE DATABASE IF NOT EXISTS medikiosk;
   USE medikiosk;
   SOURCE schema.sql;
   ```
2. Demo accounts and the one demo patient record are **seeded automatically**
   the first time the server starts (`server/src/config/seed.js`, called
   from `server/src/server.js`). It is idempotent — safe to restart the
   server repeatedly, it only inserts a demo user if that username doesn't
   already exist.

Demo accounts created by the automatic seed:

| Username | Password | Role |
|---|---|---|
| doctor | Doctor@123 | doctor |
| triage | Triage@123 | triage |
| admin | Admin@123 | admin |
| patient | Patient@123 | patient |

There is no separate `seed.sql` to run — an earlier version of this file
existed as a hand-written reference but had drifted out of sync with the
schema and the real seeding code, so it was removed rather than left
misleading. If you need to reset demo data, delete the relevant rows (or
drop and recreate the database from `schema.sql`) and restart the server.
