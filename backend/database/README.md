# BLUEWRITE Database

MySQL 8.4.x development foundation for `bluewrite_db`.

## Configuration

Copy `backend/.env.example` to `backend/.env` and configure:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=bluewrite_db
```

Never commit `.env` or place the password in source code/command examples.

## Tables and relationships

```text
users
 ├── officers
 │    └── reports
 │         └── report_people
 └── activity_logs
```

- `users`: local authentication identity, bcrypt password hash, role, active state, first-login flag, lockout state, and login/password timestamps.
- `officers`: one-to-one Officer profile linked to a user; badges are unique and accounts are Active or Disabled.
- `reports`: Officer-owned incident records; only Draft and Submitted statuses are valid.
- `report_people`: normalized people associated with a report.
- `activity_logs`: future server-generated read-only audit records; metadata is JSON and AI chats are not stored.

Foreign keys use restrictive deletion because officers, reports, and audit records should not be casually removed.

## Initialize and seed

From `backend/` with the MySQL client:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p bluewrite_db < database/seed.sql
```

`schema.sql` creates/selects `bluewrite_db` and creates tables in dependency order. `seed.sql` contains fictional development data and is safe to rerun against the supplied seed identifiers.

For an existing database created before secure local authentication fields were added, run the non-destructive migration once:

```bash
mysql -u root -p bluewrite_db < database/migrations/20260901_secure_local_authentication.sql
mysql -u root -p bluewrite_db < database/migrations/20260902_lan_login_security.sql
mysql -u root -p bluewrite_db < database/migrations/20260903_officer_email_verification.sql
```

The migration preserves existing accounts and hashes and does not force existing users to change their passwords.

The second migration adds non-destructive Officer lock, Administrator Security Review, and last-login-IP fields. Existing accounts default to unlocked with no review pending.

The third migration adds short-lived Officer email-login challenges. Only HMAC digests are stored; plaintext codes exist only long enough to send through SMTP.

## Development reset

**DEVELOPMENT ONLY — destroys `bluewrite_db`.**

```bash
mysql -u root -p < database/reset.sql
mysql -u root -p < database/schema.sql
mysql -u root -p bluewrite_db < database/seed.sql
```

Reset is never executed when the server starts.

## Report numbers

Seed reports use `BW-YYYY-XXXXXX`. Future report CRUD should generate the six-digit sequence server-side in a transaction and rely on the unique database constraint to prevent collisions.

## Connectivity

The application uses the single `mysql2/promise` pool in `src/config/db.js`. `GET /api/health` runs `SELECT 1 AS db_test` and reports only `connected` or `disconnected`; it does not expose credentials, connection details, or database contents.