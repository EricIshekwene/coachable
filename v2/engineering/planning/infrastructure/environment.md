# Environment Variables

Every environment variable the v2 server uses, which environment it belongs to, how to get it, and how to rotate it. A new contributor should be able to get from zero to a running local server in under 30 minutes by following the Quick Start section.

---

## Quick Start (local dev)

**Prerequisites:** Node.js 20+, PostgreSQL 16 (local install or Docker)

### 1. Clone and install

```bash
git clone <repo-url> coachable-v2
cd coachable-v2
npm install
cd server && npm install && cd ..
```

### 2. Create a local database

```bash
# Native Postgres
psql -U postgres -c "CREATE DATABASE coachable_dev;"

# Or Docker
docker run --name coachable-pg \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=coachable_dev \
  -p 5432:5432 -d postgres:16
```

### 3. Set up your .env

```bash
cp .env.example .env
```

Open `.env` and set these three values — everything else has a safe local default:

| Variable | What to set |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:dev@localhost:5432/coachable_dev` |
| `JWT_SECRET` | Any random string, e.g. `local-dev-secret` (does not need to be secure) |
| `RESEND_API_KEY` | Ask the project owner for the `coachable-dev` Resend key |

### 4. Start the server

```bash
cd server && node index.js
```

Migrations run automatically on startup. The server is ready when you see the port log.

### 5. Seed your local account

```bash
node server/scripts/seed-account.mjs
```

Creates one account with access to both the main app and the staff panel. Credentials are whatever you set in `SEED_DEMO_EMAIL` / `SEED_DEMO_PASSWORD`. **Set `SEED_API_URL=http://localhost:3001` in your `.env` before running** — the default target is the production URL.

---

## Variable Reference

### Core

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | all | yes | — | `development` locally, `production` in Railway |
| `PORT` | all | no | `3001` | Express listen port. Railway sets this automatically. |
| `DATABASE_URL` | all | yes | — | PostgreSQL connection string. |
| `JWT_SECRET` | all | prod: yes, dev: no | `dev-secret-change-me` | Signs auth tokens. Omitting in production crashes the server on startup. |

### Auth / Admin

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `ADMIN_HASH` | all | yes | — | bcrypt hash of the admin panel password. |
| `ADMIN_SECURITY_EMAIL` | all | no | `""` | Email address for admin security alerts. |
| `OWNER_USER_ID` | all | no | — | UUID of the staff/owner account. Required for staff routes to work. |

**Generating `ADMIN_HASH`:**
```bash
node --input-type=module -e "import bcrypt from 'bcrypt'; bcrypt.hash('YOUR_PASSWORD', 10).then(console.log)"
```
Copy the output hash. Never commit the plaintext password.

### Email (Resend)

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `RESEND_API_KEY` | all | no* | — | Resend API key for transactional email. |
| `FROM_EMAIL` | all | no | `Coachable <noreply@tcutss.com>` | From address on outgoing emails. |

*Email features (verification, invites, password reset) require this key. You can omit it locally if you don't need to test email flows — the server will start but email calls will fail.

**Dev vs. prod key:** local dev uses a separate Resend key named `coachable-dev`, scoped to the project owner's inbox. Production uses `Railway_Email`. Ask the project owner for the dev key — do not use the prod key locally.

### Frontend / CORS

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `CORS_ORIGINS` | all | yes | `http://localhost:5173` | Comma-separated list of allowed frontend origins. |
| `FRONTEND_URL` | all | no | `http://localhost:5173` | Public frontend URL, embedded in email links and redirects. |

### Logging

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `LOG_LEVEL` | all | no | `info` | pino log level. Valid values: `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Use `debug` locally when needed. Never set `debug` in production. |

### Feature Flags

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `REQUIRE_EMAIL_VERIFICATION` | all | no | `false` | Set to `"true"` to require email verification before login. |
| `COMMUNITY_REVIEW_TEAM_ID` | prod only | no | — | Team ID for the community play review feature. Omit to disable. |
| `DISABLE_RATE_LIMIT` | dev / CI only | no | `false` | Set to `"true"` to bypass rate limiting in tests. Never set in production. |

### Frontend (Vite)

| Variable | Environments | Required | Default | Description |
|---|---|---|---|---|
| `VITE_API_URL` | all | yes | `http://localhost:3001` | Backend API base URL, bundled into the React client at build time. |

`VITE_` variables are embedded in the client bundle and visible to anyone who downloads the app — **never put secrets here.**

### Seed Script

These only apply when running `server/scripts/seed-account.mjs`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `SEED_DEMO_EMAIL` | yes | `coach@example.com` | Email for the seeded account. |
| `SEED_DEMO_PASSWORD` | yes | `changeme` | Password for the seeded account. |
| `SEED_API_URL` | no | production Railway URL | Override to point the seed script at local or staging. **Always set this when seeding locally.** |

### Railway-Managed (do not edit)

Set by Railway's build system. Do not change these in the dashboard.

| Variable | Value | Description |
|---|---|---|
| `RAILWAY_ROOT_DIRECTORY` | `server` | Tells Railway to build from the `server/` subdirectory. |
| `NIXPACKS_START_CMD` | `node index.js` | Overrides the default start command. |

---

## Local Dev Database

Each developer runs their own local PostgreSQL instance. The Railway `coachable-v2-dev` environment is for shared staging (deployed PRs), not individual developer work.

**Why local, not shared:** a bad migration or test run cannot break another developer's environment. Schema stays in sync automatically — migrations run on startup, so `git pull` + `npm start` is all it takes after any schema change.

**If your local DB gets into a bad state:**
```bash
psql -U postgres -c "DROP DATABASE coachable_dev; CREATE DATABASE coachable_dev;"
cd server && node index.js   # migrations re-run on startup
node scripts/seed-account.mjs
```

---

## Railway Environments

| Environment | Purpose | Database |
|---|---|---|
| `coachable-v2-prod` | Live production | Production Postgres (Railway-managed) |
| `coachable-v2-dev` | Shared staging for PR review | Separate staging Postgres |
| Local | Individual developer work | Local Postgres per developer |

**Production vars required in Railway dashboard:**

| Variable | How to get it |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Auto-injected by Railway from the attached Postgres service |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_HASH` | bcrypt command above |
| `ADMIN_SECURITY_EMAIL` | Your email address |
| `OWNER_USER_ID` | UUID of the staff account — readable from the DB after first user is created |
| `RESEND_API_KEY` | `Railway_Email` key from the Resend dashboard |
| `FROM_EMAIL` | `Coachable <noreply@tcutss.com>` (or set explicitly) |
| `CORS_ORIGINS` | Deployed frontend URL |
| `FRONTEND_URL` | Deployed frontend URL |
| `REQUIRE_EMAIL_VERIFICATION` | `true` |

---

## Rotation Procedures

### JWT_SECRET

Rotating immediately signs out every logged-in user. This is acceptable — no grace period is needed.

1. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update `JWT_SECRET` in the Railway production dashboard
3. Redeploy the service
4. All active sessions are invalidated immediately

### ADMIN_HASH

1. Generate: `node --input-type=module -e "import bcrypt from 'bcrypt'; bcrypt.hash('NEW_PASSWORD', 10).then(console.log)"`
2. Update `ADMIN_HASH` in Railway
3. Redeploy

### RESEND_API_KEY

1. Create a new key in the Resend dashboard
2. Update `RESEND_API_KEY` in Railway
3. Redeploy and confirm emails are sending
4. Delete the old key from Resend (do this last)

### DATABASE_URL

Railway manages Postgres credentials. Follow Railway's credential rotation documentation. After rotating, update `DATABASE_URL` in the service environment and redeploy.

---

## R2 Object Storage (planned, not yet implemented)

R2 will host images embedded in outgoing emails (e.g. play thumbnails). It is not configured in any environment. When implemented, add a section here covering `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL`. Use separate buckets for dev and prod.

---

## Cross-Reference Notes

**Referenced by:** `security-and-code-quality.md` covers CI secrets (`CI_ADMIN_HASH`, `JWT_SECRET`, `DATABASE_URL`). When server integration tests go live (TODO 3.1), `CI_ADMIN_HASH` must be added to GitHub → Settings → Secrets and variables → Actions. Copy the value from the Railway production `ADMIN_HASH`.
