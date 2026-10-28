# Database setup

## Local development (XAMPP/phpMyAdmin)

1. Start MySQL in the XAMPP Control Panel.
2. Open phpMyAdmin at `http://localhost/phpmyadmin`.
3. Create a database named `medikiosk`.
4. Select the `medikiosk` database, open its **SQL** tab, and apply the contents of `database/schema.sql`.

**Important:** `database/schema.sql` creates tables only. It does not create or select a database. Apply it only to a new, empty database. Do not re-import the full schema into an existing populated database to upgrade it.

## Managed hosting database setup

1. Provision a MySQL database using your hosting provider.
2. Identify the database name supplied by the provider and configure the backend's database connection variables accordingly.
3. Open a SQL editor for that specific database, or connect a MySQL client directly to it.
4. Apply the contents of `database/schema.sql` to that selected, empty database.

The schema file must run against the database you intend the application to use. Do not rely on a hard-coded database name or run the schema against an existing database as a substitute for a migration. Keep database credentials private and never commit `server/.env`.

## Demo accounts and production seeding

In local development, the server runs `server/src/config/seed.js` after connecting to MySQL when `NODE_ENV` is not `production`. The seed function creates demo accounts and a synthetic demo patient record, and avoids inserting a user again if that username already exists.

The fixed demo credentials below are **for local demonstration only**:

| Username | Password | Role |
|---|---|---|
| doctor | Doctor@123 | doctor |
| triage | Triage@123 | triage |
| admin | Admin@123 | admin |
| patient | Patient@123 | patient |

When `NODE_ENV=production`, automatic demo-account seeding is disabled. Do not rely on these demo accounts for a public deployment. This repository does not yet provide a dedicated, secure production staff-account bootstrap workflow, so staff access must be addressed before exposing a hosted instance.

There is no active `database/seed.sql` in the project to run. Use synthetic demonstration data only; do not enter real patient identifiers, contact details, or medical records into this academic prototype.

## Database Migration Safety

Both migration scripts reject target database names that do not end in `_test`. This name check alone does not guarantee that the database is isolated.
Set `DB_NAME` and `MEDIKIOSK_MIGRATION_DB` to the same database name. Each script checks that the connected database matches the target, and the target database name must end in `_test`.
Run these scripts only against a dedicated test database. Never run them against `medikiosk`, shared, staging, production, or any database containing data you need to preserve.
Verify your backup and target database before making schema changes.
