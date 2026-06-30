# Coachable v2 Build Process

This is the plain-English, command-by-command process for starting and building Coachable v2.

The big idea: v2 is not a cleanup of v1. It is a new app in a new repo. The old app stays live until v2 is ready. The v2 app is built from the planning docs in this folder.

This guide assumes you are on Windows PowerShell.

Whenever you see angle brackets like `<YOUR_GITHUB_REPO_URL>`, replace that whole value with your real value.

Example:

```powershell
git clone <YOUR_GITHUB_REPO_URL> coachable-v2
```

Becomes something like:

```powershell
git clone https://github.com/yourname/coachable-v2.git coachable-v2
```

---

## 1. Before You Start

Do this once before the real build begins.

### 1.1 Install the required tools

Install these:

1. Git for Windows
2. Node.js 20+
3. PostgreSQL 16 or Docker Desktop
4. VS Code or Cursor
5. GitHub account
6. Railway account
7. Resend account
8. Stripe account, later

### 1.2 Check your tools

Open PowerShell and run:

```powershell
git --version
node --version
npm --version
```

You want:

- Git to print a version.
- Node to be version 20 or higher.
- npm to print a version.

If any command says it is not recognized, that tool is not installed correctly.

### 1.3 Create a work folder

Use one clean folder for the v2 repo.

```powershell
cd C:\Users\ericl\Desktop
mkdir coachable-v2-work
cd coachable-v2-work
```

---

## 2. Read The Source Docs First

Before writing code, read the docs that already exist in this planning folder.

From PowerShell:

```powershell
cd C:\Users\ericl\Desktop\coachable\v2
code v2.md
code TODO.md
code INDEX.md
code CLAUDE.md
code engineering\planning\architecture\proposed-file-structure.md
```

If `code` does not work, open the files manually in your editor.

Read these in this order:

1. `v2.md`
2. `TODO.md`
3. `INDEX.md`
4. `CLAUDE.md`
5. `engineering/planning/architecture/proposed-file-structure.md`

Main rule:

Do not start with random pages. Start with foundation, then database, then backend, then frontend shell, then shared UI, then product pages.

---

## 3. Create The New GitHub Repo

This is the first real build step.

### 3.1 Create the empty GitHub repo

In GitHub:

1. Go to GitHub.
2. Click New repository.
3. Name it something like `coachable-v2`.
4. Keep it empty.
5. Do not add a README from GitHub.
6. Copy the repo URL.

Example repo URL:

```text
https://github.com/YOUR_ACCOUNT/coachable-v2.git
```

### 3.2 Clone the new repo

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work
git clone <YOUR_GITHUB_REPO_URL> coachable-v2
cd coachable-v2
```

### 3.3 Create the main branches

Use `main` for production and `stage` for testing.

```powershell
git checkout -b main
git checkout -b stage
git push -u origin stage
git checkout main
git push -u origin main
git checkout stage
```

Daily work should usually go to `stage` first.

---

## 4. Scaffold The Frontend App

Use Vite with React and TypeScript.

### 4.1 Create the Vite app in the repo root

Make sure you are inside the new repo:

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
```

Then create the app:

```powershell
npm create vite@latest . -- --template react-ts
npm install
```

If Vite asks whether to continue in the current folder, say yes.

### 4.2 Install frontend dependencies

Start with the basics:

```powershell
npm install react-router-dom @tanstack/react-query lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom typescript eslint
```

You may add more dependencies later only when a feature needs them.

### 4.3 Start the frontend

```powershell
npm run dev
```

You should see a local URL, usually:

```text
http://localhost:5173
```

Open that in your browser.

Stop the server with:

```powershell
Ctrl+C
```

---

## 5. Scaffold The Backend App

The backend lives inside `server/`.

### 5.1 Create backend folders

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
mkdir server
mkdir server\config
mkdir server\db
mkdir server\db\migrations
mkdir server\middleware
mkdir server\routes
mkdir server\lib
mkdir server\tests
mkdir server\tests\helpers
```

### 5.2 Create backend package

```powershell
cd server
npm init -y
npm install express cors dotenv pg jsonwebtoken bcrypt pino
npm install -D vitest supertest nodemon
cd ..
```

### 5.3 Add backend scripts

Open:

```powershell
code server\package.json
```

Set the scripts section to include:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "vitest run"
  }
}
```

### 5.4 Create the first server file

Create:

```text
server/index.js
```

Basic starter content:

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
```

### 5.5 Enable ES modules for the server

Open:

```powershell
code server\package.json
```

Add:

```json
"type": "module"
```

### 5.6 Start the backend

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\server
npm run dev
```

Open:

```text
http://localhost:3001/api/health
```

You should see:

```json
{"ok":true}
```

Stop the server with:

```powershell
Ctrl+C
```

Reference docs:

- `engineering/planning/architecture/proposed-file-structure.md`
- `engineering/backend-code-standards.md`

Done means:

- Frontend starts.
- Backend starts.
- `/api/health` works.

---

## 6. Move The Planning Docs Into The New Repo

The current planning docs live here:

```text
C:\Users\ericl\Desktop\coachable\v2
```

In the new repo, they should live here:

```text
docs\v2
```

### 6.1 Create the docs folder

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
mkdir docs
```

### 6.2 Copy the v2 docs

```powershell
Copy-Item -Recurse -Force "C:\Users\ericl\Desktop\coachable\v2" "C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\docs\v2"
```

### 6.3 Copy the AI navigation file to repo root

```powershell
Copy-Item -Force "C:\Users\ericl\Desktop\coachable\v2\CLAUDE.md" "C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\CLAUDE.md"
```

### 6.4 Create or copy the docs index

```powershell
Copy-Item -Force "C:\Users\ericl\Desktop\coachable\v2\INDEX.md" "C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\docs\INDEX.md"
```

### 6.5 Confirm no markdown files are inside source folders

```powershell
Get-ChildItem -Recurse -Include *.md src,server
```

This should print nothing.

If it prints files, move those files into `docs/`.

Reference docs:

- `v2.md`
- `INDEX.md`
- `CLAUDE.md`

Done means:

- `docs/v2/` exists.
- `CLAUDE.md` exists at repo root.
- `docs/INDEX.md` exists.
- No `.md` files are inside `src/` or `server/`.

---

## 7. Commit The First Scaffold

### 7.1 Check what changed

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
git status
```

### 7.2 Add files

```powershell
git add -- .
```

### 7.3 Commit

```powershell
git commit -m "Scaffold v2 app"
```

### 7.4 Push to stage

```powershell
git push origin stage
```

---

## 8. Set Up Environment Variables

Environment variables are settings and secrets the app reads from `.env`.

### 8.1 Create root `.env`

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
New-Item -ItemType File -Path .env
New-Item -ItemType File -Path .env.example
```

Add this to `.env.example`:

```text
VITE_API_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:dev@localhost:5432/coachable_dev
JWT_SECRET=local-dev-secret
ADMIN_HASH=
RESEND_API_KEY=
FROM_EMAIL=Coachable <noreply@tcutss.com>
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=debug
REQUIRE_EMAIL_VERIFICATION=false
```

Copy it to `.env`:

```powershell
Copy-Item -Force .env.example .env
```

### 8.2 Make sure `.env` is ignored by git

Open:

```powershell
code .gitignore
```

Make sure it includes:

```text
.env
.env.local
```

### 8.3 Create a JWT secret for production later

Do not paste this into code. Use it later in Railway.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 8.4 Create an admin password hash later

Use this when you are ready to set `ADMIN_HASH`.

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\server
node --input-type=module -e "import bcrypt from 'bcrypt'; bcrypt.hash('YOUR_ADMIN_PASSWORD_HERE', 10).then(console.log)"
```

Copy the output hash into Railway later. Do not commit the password.

Reference docs:

- `engineering/planning/infrastructure/environment.md`

Done means:

- `.env.example` documents required values.
- `.env` exists locally.
- `.env` is not committed.

---

## 9. Set Up Local PostgreSQL

You need a local database for development.

Use either local PostgreSQL or Docker. Docker is often easier.

### Option A: Docker

Start a PostgreSQL container:

```powershell
docker run --name coachable-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=coachable_dev -p 5432:5432 -d postgres:16
```

Check it is running:

```powershell
docker ps
```

Stop it later:

```powershell
docker stop coachable-pg
```

Start it again later:

```powershell
docker start coachable-pg
```

### Option B: Local PostgreSQL install

If you installed PostgreSQL directly:

```powershell
psql -U postgres -c "CREATE DATABASE coachable_dev;"
```

### 9.1 Confirm your database URL

Your local `.env` should contain:

```text
DATABASE_URL=postgresql://postgres:dev@localhost:5432/coachable_dev
```

If your local Postgres password is different, update the password part.

Reference docs:

- `engineering/database.md`
- `engineering/planning/infrastructure/environment.md`

Done means:

- You have a local `coachable_dev` database.
- The backend can connect to it.

---

## 10. Build The Migration System

The database uses numbered migration files. Do not run v1 `schema.sql` directly.

### 10.1 Create the migration runner

Create:

```text
server/db/migrate.js
server/db/pool.js
server/db/migrations/001_initial.sql
```

### 10.2 Install dotenv in server if not already installed

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\server
npm install dotenv pg
```

### 10.3 Add `pool.js`

Use this shape:

```js
import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

### 10.4 Add `migrate.js`

The migration runner should:

1. Connect to Postgres.
2. Create `schema_migrations` if it does not exist.
3. Read every file in `server/db/migrations`.
4. Run files that have not been applied yet.
5. Save each applied filename.
6. Stop loudly if a migration fails.

When writing this file, follow:

- `engineering/database.md`

### 10.5 Start with a tiny test migration

In `server/db/migrations/001_initial.sql`, start simple:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Later you will expand this into the full schema from `engineering/database.md`.

### 10.6 Run migrations

From the repo root:

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
node server/db/migrate.js
```

If it succeeds, it should apply `001_initial.sql`.

### 10.7 Check the database

If using Docker:

```powershell
docker exec -it coachable-pg psql -U postgres -d coachable_dev
```

Inside psql:

```sql
\dt
SELECT filename, applied_at FROM schema_migrations ORDER BY filename;
\q
```

Reference docs:

- `engineering/database.md`
- `engineering/audits/api-review.md`
- `engineering/audits/query-performance.md`

Done means:

- `node server/db/migrate.js` works.
- A fresh database can be built from migrations.
- `schema_migrations` records what ran.

---

## 11. Set Up Tests, Lint, And CI

Do this early so broken code gets caught.

### 11.1 Add frontend test script

Open root `package.json`:

```powershell
code package.json
```

Make sure scripts include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:frontend": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

### 11.2 Add server test script

Open:

```powershell
code server\package.json
```

Make sure scripts include:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "vitest run",
    "test:server": "vitest run"
  }
}
```

### 11.3 Run checks locally

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
npm run lint
npm run typecheck
npm run test:frontend
cd server
npm run test:server
cd ..
```

If a command fails, fix it before moving on.

### 11.4 Install Husky

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
npm install -D husky
npx husky init
```

Open:

```powershell
code .husky\pre-push
```

Use:

```sh
npm test
npm run lint
npm audit --audit-level=high
```

### 11.5 Create GitHub Actions workflow

Create folders:

```powershell
mkdir .github
mkdir .github\workflows
```

Create:

```text
.github/workflows/ci.yml
```

Use the workflow from:

```text
engineering/planning/infrastructure/security-and-code-quality.md
```

Make sure branches include both:

```yaml
branches: [main, stage]
```

### 11.6 Add Dependabot

Create:

```text
.github/dependabot.yml
```

Use:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/server"
    schedule:
      interval: "weekly"
```

### 11.7 Enable GitHub secret scanning

In GitHub:

1. Open the repo.
2. Go to Settings.
3. Go to Security.
4. Go to Code security and analysis.
5. Enable Secret scanning.

### 11.8 Add CI secrets later

In GitHub:

1. Repo Settings.
2. Secrets and variables.
3. Actions.
4. New repository secret.

Add later:

```text
CI_ADMIN_HASH
```

Reference docs:

- `engineering/planning/infrastructure/security-and-code-quality.md`
- `engineering/planning/testing/test-suite-plan.md`
- `engineering/planning/testing/ui-testing-standards.md`
- `engineering/planning/testing/server-testing-standards.md`

Done means:

- Local tests run.
- Local lint runs.
- GitHub Actions runs on push.
- Dependabot is enabled.
- Secret scanning is enabled.

---

## 12. Set Up Railway Deployment

Railway hosts the dev and production environments.

### 12.1 Create the Railway project

In Railway:

1. New Project.
2. Name it `coachable-v2`.

### 12.2 Create dev service

In Railway:

1. Add service.
2. Deploy from GitHub repo.
3. Select the v2 repo.
4. Select branch `stage`.
5. Name it `coachable-v2-dev`.

### 12.3 Add dev Postgres

In Railway:

1. Add service.
2. Database.
3. PostgreSQL.
4. Name it `Postgres (dev)`.
5. Link it to `coachable-v2-dev`.

### 12.4 Configure dev service variables

In Railway service variables for `coachable-v2-dev`, add:

```text
RAILWAY_ROOT_DIRECTORY=server
NODE_ENV=development
JWT_SECRET=<GENERATE_A_REAL_SECRET>
ADMIN_HASH=<YOUR_BCRYPT_ADMIN_HASH>
CORS_ORIGINS=https://dev.coachableplays.com
FRONTEND_URL=https://dev.coachableplays.com
REQUIRE_EMAIL_VERIFICATION=false
```

Railway should provide:

```text
DATABASE_URL
PORT
```

Do not manually invent the production database URL.

### 12.5 Create prod service

Repeat the service setup:

1. Add service.
2. Deploy from GitHub repo.
3. Select branch `main`.
4. Name it `coachable-v2-prod`.

### 12.6 Add prod Postgres

1. Add PostgreSQL.
2. Name it `Postgres (prod)`.
3. Link it to `coachable-v2-prod`.

### 12.7 Configure prod variables

In Railway variables for `coachable-v2-prod`, add:

```text
RAILWAY_ROOT_DIRECTORY=server
NODE_ENV=production
JWT_SECRET=<GENERATE_A_DIFFERENT_REAL_SECRET>
ADMIN_HASH=<YOUR_BCRYPT_ADMIN_HASH>
CORS_ORIGINS=https://coachableplays.com
FRONTEND_URL=https://coachableplays.com
REQUIRE_EMAIL_VERIFICATION=true
```

### 12.8 Enable CI deploy gating

In Railway for each web service:

1. Settings.
2. Deployments.
3. Enable "Wait for CI checks before deploying."

### 12.9 Set up dev domain

In Railway:

1. Open `coachable-v2-dev`.
2. Networking.
3. Custom domain.
4. Add `dev.coachableplays.com`.

In your DNS provider:

1. Add a CNAME record.
2. Host/name: `dev`.
3. Value: Railway-generated domain.

Reference docs:

- `engineering/planning/infrastructure/railway-setup.md`
- `engineering/planning/infrastructure/environment.md`

Done means:

- `stage` deploys to dev.
- `main` deploys to prod.
- Dev and prod have separate databases.
- Railway waits for CI before deploying.

---

## 13. Build Backend Features

Build backend features before pages that depend on them.

Recommended route order:

1. Health check
2. Auth
3. Email verification
4. Teams
5. Onboarding
6. Plays
7. Play canvas
8. Folders
9. Playbooks
10. Users and settings
11. Notifications
12. Feature flags
13. Admin and staff
14. Billing infrastructure

### 13.1 For every backend route, follow this checklist

1. Read the related doc.
2. Create or update the route file in `server/routes/`.
3. Create or update the query file in `server/db/`.
4. Add validation in `server/lib/validate.js`.
5. Add auth middleware if needed.
6. Add role checks if needed.
7. Return a consistent JSON shape.
8. Add tests.
9. Run the server.
10. Test the endpoint manually.

### 13.2 Example: create a route file

For plays:

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
New-Item -ItemType File -Path server\routes\plays.js
New-Item -ItemType File -Path server\db\plays.js
```

### 13.3 Example: test a health endpoint manually

Start server:

```powershell
cd server
npm run dev
```

In another PowerShell window:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

### 13.4 Example: test a POST endpoint manually

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3001/api/auth/signup `
  -ContentType "application/json" `
  -Body '{"email":"coach@example.com","password":"changeme","name":"Coach"}'
```

### 13.5 Run backend tests

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\server
npm test
```

Reference docs:

- `engineering/backend-code-standards.md`
- `engineering/audits/api-review.md`
- `engineering/planning/permissions.md`
- `billing.md`

Done means:

- Every important route has tests.
- Every protected route has auth.
- Every DB query uses parameters, not string concatenation.
- Server errors return clear error codes.

---

## 14. Build Frontend Routing And State

Build the app shell before individual pages.

### 14.1 Create route files

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
New-Item -ItemType File -Path src\App.tsx -Force
mkdir src\auth
mkdir src\app
mkdir src\admin
New-Item -ItemType File -Path src\auth\AuthRoutes.tsx
New-Item -ItemType File -Path src\app\AppRoutes.tsx
New-Item -ItemType File -Path src\admin\AdminRoutes.tsx
```

### 14.2 Create context folders

```powershell
mkdir src\context
New-Item -ItemType File -Path src\context\AuthContext.tsx
New-Item -ItemType File -Path src\context\FeatureFlagContext.tsx
New-Item -ItemType File -Path src\context\NotificationsContext.tsx
```

### 14.3 Create API helper folder

```powershell
mkdir src\utils
mkdir src\utils\api
New-Item -ItemType File -Path src\utils\api\apiFetch.ts
New-Item -ItemType File -Path src\utils\api\auth.ts
New-Item -ItemType File -Path src\utils\api\plays.ts
New-Item -ItemType File -Path src\utils\api\teams.ts
```

### 14.4 Start frontend while building

```powershell
npm run dev
```

### 14.5 Run frontend checks

```powershell
npm run lint
npm run typecheck
npm run test:frontend
```

Reference docs:

- `engineering/planning/routing.md`
- `engineering/planning/state-management.md`
- `engineering/planning/api-standards.md`
- `engineering/frontend-code-standards.md`

Done means:

- Public routes work.
- Protected routes redirect to login.
- Login uses `returnTo`.
- Auth state is stored in the right place.
- API functions return `{ data, error }`.

---

## 15. Build The Design System

Shared UI components go in `src/ui/`.

### 15.1 Create UI folder

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
mkdir src\ui
New-Item -ItemType File -Path src\ui\index.ts
```

### 15.2 Create the first components

```powershell
New-Item -ItemType File -Path src\ui\Button.tsx
New-Item -ItemType File -Path src\ui\Input.tsx
New-Item -ItemType File -Path src\ui\Modal.tsx
New-Item -ItemType File -Path src\ui\Toast.tsx
New-Item -ItemType File -Path src\ui\Spinner.tsx
New-Item -ItemType File -Path src\ui\EmptyState.tsx
```

### 15.3 Export components from the barrel file

Open:

```powershell
code src\ui\index.ts
```

Example:

```ts
export { Button } from "./Button";
export type { ButtonProps } from "./Button";

export { Input } from "./Input";
export type { InputProps } from "./Input";
```

### 15.4 Create design system catalogue page

```powershell
mkdir src\admin\pages
New-Item -ItemType File -Path src\admin\pages\AdminDesignSystem.tsx
```

Every shared component should be visible on this page.

### 15.5 Run checks

```powershell
npm run lint
npm run typecheck
npm run test:frontend
```

Reference docs:

- `design/component-specs.md`
- `design/color-semantics.md`
- `design/general-formatting-standards.md`
- `design/accessibility-standards.md`
- `design/mobile/mobile-formatting-standards.md`
- `design/desktop/desktop-formatting-standards.md`

Done means:

- Shared components exist.
- Components use named exports.
- Components use documented props.
- Components use `--ui-*` CSS variables.
- Components appear in the design system catalogue.

---

## 16. Port Slate From v1

Slate is the only big thing copied from v1.

### 16.1 Create Slate folder

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
mkdir src\slate
```

### 16.2 Copy Slate code from v1

The exact v1 source folder may differ. Check the old repo first.

Example:

```powershell
Copy-Item -Recurse -Force "C:\Users\ericl\Desktop\coachable\src\features\slate\*" "C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\src\slate"
```

If v1 Slate is split across multiple folders, also check:

```text
C:\Users\ericl\Desktop\coachable\src\canvas
C:\Users\ericl\Desktop\coachable\src\animation
```

Move those into:

```text
src\slate\canvas
src\slate\animation
```

### 16.3 Install Slate dependencies

Check old v1 `package.json` for dependencies used by Slate. Common examples:

```powershell
npm install konva react-konva
```

Only install what Slate actually needs.

### 16.4 Mount Slate through one root component

Outside code should import Slate through:

```text
src/slate/Slate.tsx
```

Do not import random internal Slate files from app pages.

### 16.5 Test Slate

```powershell
npm run dev
```

Then manually check:

1. Editor opens.
2. Field renders.
3. Players can be moved.
4. Animation still works.
5. Save and load work once backend is connected.
6. Mobile layout follows the mobile Slate plan.

Reference docs:

- `engineering/planning/architecture/proposed-file-structure.md`
- `design/slate/slate-ux-standards.md`
- `engineering/planning/features/mobile-slate-plan.md`

Done means:

- Slate works in v2.
- Slate stays inside `src/slate/`.
- Outside pages use only the Slate root.

---

## 17. Build Product Pages

Build pages after routing, backend, and shared components exist.

### 17.1 Create page folders

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
mkdir src\app\pages
mkdir src\auth
mkdir src\marketing
mkdir src\shared-pages
mkdir src\staff
```

### 17.2 Build pages in this order

Auth:

```powershell
New-Item -ItemType File -Path src\auth\Login.tsx
New-Item -ItemType File -Path src\auth\Signup.tsx
New-Item -ItemType File -Path src\auth\ForgotPassword.tsx
New-Item -ItemType File -Path src\auth\ResetPassword.tsx
New-Item -ItemType File -Path src\auth\VerifyEmail.tsx
New-Item -ItemType File -Path src\auth\Onboarding.tsx
```

App:

```powershell
New-Item -ItemType File -Path src\app\pages\Plays.tsx
New-Item -ItemType File -Path src\app\pages\PlayNew.tsx
New-Item -ItemType File -Path src\app\pages\PlayView.tsx
New-Item -ItemType File -Path src\app\pages\PlayEdit.tsx
New-Item -ItemType File -Path src\app\pages\Playbooks.tsx
New-Item -ItemType File -Path src\app\pages\Team.tsx
New-Item -ItemType File -Path src\app\pages\Settings.tsx
New-Item -ItemType File -Path src\app\pages\Profile.tsx
New-Item -ItemType File -Path src\app\pages\Notifications.tsx
```

Public:

```powershell
New-Item -ItemType File -Path src\marketing\Landing.tsx
New-Item -ItemType File -Path src\shared-pages\SharedPlay.tsx
New-Item -ItemType File -Path src\shared-pages\SharedFolder.tsx
New-Item -ItemType File -Path src\shared-pages\PlatformPlayView.tsx
```

### 17.3 For every page, follow this checklist

1. Read the page design doc.
2. Read the routing doc.
3. Read the permissions doc.
4. Build the simplest useful page.
5. Add loading state.
6. Add empty state.
7. Add error state.
8. Add role-based visibility.
9. Add tests.
10. Run locally and click through.

### 17.4 Create page tests

Example for Plays:

```powershell
mkdir src\app\pages\tests
mkdir src\app\pages\tests\plays.browse
New-Item -ItemType File -Path src\app\pages\tests\plays.browse\roles.test.tsx
New-Item -ItemType File -Path src\app\pages\tests\plays.browse\flow.test.tsx
```

### 17.5 Run frontend tests

```powershell
npm run test:frontend
```

Reference docs:

- `design/pages/auth-pages.md`
- `design/pages/onboarding-flow.md`
- `design/pages/plays-page.md`
- `design/pages/playbooks-page.md`
- `design/pages/team-management.md`
- `design/pages/settings-pages.md`
- `design/pages/player-experience.md`
- `design/public-pages.md`
- `engineering/planning/routing.md`
- `engineering/planning/permissions.md`

Done means:

- Pages follow the specs.
- Pages use shared UI.
- Pages work on mobile and desktop.
- Pages have tests.

---

## 18. How To Work On One Feature At A Time

Use this process every time.

### 18.1 Pick one small task

Good:

```text
Build login page
Build plays list API
Build team invite code rotation
```

Bad:

```text
Build all auth
Build the whole app
Finish admin
```

### 18.2 Read the right docs

Example for login:

```powershell
code docs\v2\design\pages\auth-pages.md
code docs\v2\engineering\planning\routing.md
code docs\v2\engineering\planning\api-standards.md
code docs\v2\engineering\frontend-code-standards.md
```

### 18.3 Write down "done means"

Create a tiny checklist in your issue, PR, or notes:

```text
Done means:
- Login form renders.
- Email and password are required.
- Invalid login shows a friendly error.
- Successful login goes to returnTo or /app/plays.
- Tests cover success and failure.
```

### 18.4 Build, test, commit

```powershell
npm run lint
npm run typecheck
npm run test:frontend
cd server
npm test
cd ..
git status
git add -- .
git commit -m "Build login page"
git push origin stage
```

---

## 19. Daily Build Routine

Use this at the start and end of each work session.

### 19.1 Start of session

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
git checkout stage
git pull origin stage
code docs\v2\TODO.md
```

Pick the earliest unfinished task that other work depends on.

### 19.2 During the session

Run checks often:

```powershell
npm run lint
npm run typecheck
npm run test:frontend
```

For backend work:

```powershell
cd server
npm test
cd ..
```

Run the app:

Terminal 1:

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2\server
npm run dev
```

Terminal 2:

```powershell
cd C:\Users\ericl\Desktop\coachable-v2-work\coachable-v2
npm run dev
```

### 19.3 End of session

```powershell
git status
git diff
npm run lint
npm run typecheck
npm run test:frontend
cd server
npm test
cd ..
git add -- .
git commit -m "<CLEAR_DESCRIPTION_OF_THE_WORK>"
git push origin stage
```

Example commit message:

```powershell
git commit -m "Add auth route guards"
```

---

## 20. Recommended First 10 Work Sessions

### Session 1: New Repo Scaffold

Goal:

- New repo exists.
- Frontend starts.
- Backend starts.
- Docs copied.
- Health check works.

Commands:

```powershell
git clone <YOUR_GITHUB_REPO_URL> coachable-v2
cd coachable-v2
npm create vite@latest . -- --template react-ts
npm install
mkdir server
cd server
npm init -y
npm install express cors dotenv pg
cd ..
mkdir docs
Copy-Item -Recurse -Force "C:\Users\ericl\Desktop\coachable\v2" ".\docs\v2"
Copy-Item -Force "C:\Users\ericl\Desktop\coachable\v2\CLAUDE.md" ".\CLAUDE.md"
```

### Session 2: CI And Quality Checks

Goal:

- Lint works.
- Tests work.
- GitHub Actions runs.
- Dependabot exists.

Commands:

```powershell
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom husky
npx husky init
mkdir .github
mkdir .github\workflows
New-Item -ItemType File -Path .github\workflows\ci.yml
New-Item -ItemType File -Path .github\dependabot.yml
```

### Session 3: Environment And Railway

Goal:

- `.env.example` exists.
- Local database works.
- Railway dev and prod services exist.

Commands:

```powershell
New-Item -ItemType File -Path .env.example
Copy-Item .env.example .env
docker run --name coachable-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=coachable_dev -p 5432:5432 -d postgres:16
```

Railway setup is mostly done through the Railway website.

### Session 4: Database Migrations

Goal:

- Migration runner exists.
- `001_initial.sql` exists.
- Local migration works.

Commands:

```powershell
mkdir server\db\migrations
New-Item -ItemType File -Path server\db\pool.js
New-Item -ItemType File -Path server\db\migrate.js
New-Item -ItemType File -Path server\db\migrations\001_initial.sql
node server\db\migrate.js
```

### Session 5: Auth Backend

Goal:

- Signup.
- Login.
- `/api/auth/me`.
- Email verification base.

Commands:

```powershell
New-Item -ItemType File -Path server\routes\auth.js
New-Item -ItemType File -Path server\routes\verification.js
New-Item -ItemType File -Path server\db\users.js
New-Item -ItemType File -Path server\middleware\auth.js
cd server
npm test
cd ..
```

### Session 6: Frontend Routing And Auth Shell

Goal:

- App routes.
- Auth routes.
- Route guards.
- Auth context.

Commands:

```powershell
npm install react-router-dom
New-Item -ItemType File -Path src\App.tsx -Force
mkdir src\auth
mkdir src\context
New-Item -ItemType File -Path src\auth\AuthRoutes.tsx
New-Item -ItemType File -Path src\auth\guards.tsx
New-Item -ItemType File -Path src\context\AuthContext.tsx
```

### Session 7: Design Tokens And First UI Components

Goal:

- CSS tokens.
- Button.
- Input.
- Modal.
- Toast.
- Design system page.

Commands:

```powershell
mkdir src\ui
New-Item -ItemType File -Path src\ui\index.ts
New-Item -ItemType File -Path src\ui\Button.tsx
New-Item -ItemType File -Path src\ui\Input.tsx
New-Item -ItemType File -Path src\ui\Modal.tsx
New-Item -ItemType File -Path src\ui\Toast.tsx
mkdir src\admin\pages
New-Item -ItemType File -Path src\admin\pages\AdminDesignSystem.tsx
```

### Session 8: Onboarding And Teams

Goal:

- Team create.
- Join team.
- Solo path.
- Active team.

Commands:

```powershell
New-Item -ItemType File -Path server\routes\teams.js
New-Item -ItemType File -Path server\routes\onboarding.js
New-Item -ItemType File -Path server\db\teams.js
New-Item -ItemType File -Path src\auth\Onboarding.tsx
New-Item -ItemType File -Path src\utils\api\teams.ts
```

### Session 9: Plays Backend And List Page

Goal:

- Plays API.
- Plays list page.
- PlayCard.
- Basic folder support.

Commands:

```powershell
New-Item -ItemType File -Path server\routes\plays.js
New-Item -ItemType File -Path server\routes\folders.js
New-Item -ItemType File -Path server\db\plays.js
New-Item -ItemType File -Path server\db\folders.js
New-Item -ItemType File -Path src\app\pages\Plays.tsx
New-Item -ItemType File -Path src\ui\PlayCard.tsx
New-Item -ItemType File -Path src\ui\FolderCard.tsx
New-Item -ItemType File -Path src\utils\api\plays.ts
```

### Session 10: Slate Port

Goal:

- Copy Slate.
- Install Slate dependencies.
- Mount editor routes.
- Confirm editor opens.

Commands:

```powershell
mkdir src\slate
Copy-Item -Recurse -Force "C:\Users\ericl\Desktop\coachable\src\features\slate\*" ".\src\slate"
npm install konva react-konva
npm run dev
```

Adjust the copy command if the v1 Slate files are in a different folder.

---

## 21. Final Launch Path

Do not launch until every item below is done.

### 21.1 Production database and backups

In Railway:

1. Confirm `coachable-v2-prod` has its own Postgres.
2. Confirm daily backups are enabled.
3. Run a restore test on dev before real launch.

Useful check:

```powershell
railway status
```

If Railway CLI is not installed:

```powershell
npm install -g @railway/cli
railway login
```

### 21.2 Run production checks locally

```powershell
npm run lint
npm run typecheck
npm run test:frontend
npm run build
cd server
npm test
cd ..
```

### 21.3 Merge stage into main

Only do this when `stage` is stable.

```powershell
git checkout main
git pull origin main
git merge stage
git push origin main
```

Railway prod should deploy from `main` after CI passes.

### 21.4 Cut over the domain

In Railway:

1. Add `coachableplays.com` to `coachable-v2-prod`.
2. Verify v2 prod works on the Railway URL first.
3. Remove `coachableplays.com` from the v1 Railway service.
4. Confirm `coachableplays.com` now loads v2.

Reference docs:

- `engineering/planning/infrastructure/railway-setup.md`
- `engineering/planning/infrastructure/ops-setup.md`
- `engineering/database.md`
- `engineering/audits/security-hardening.md`
- `engineering/audits/email-deliverability.md`

---

## 22. What Not To Do

Do not:

- Edit v1 production code while building v2 unless it is a separate emergency fix.
- Copy all of v1 into v2.
- Run the old v1 schema directly as the v2 database.
- Put markdown files inside `src/` or `server/`.
- Build page-specific versions of shared UI components.
- Skip tests because the app is early.
- Add Stripe charging at launch.
- Connect local dev to the production database.
- Put secrets into frontend `VITE_` variables.
- Show raw backend errors to users.
- Push straight to `main` during normal development.

---

## 23. Short Version

If you forget everything else, follow this:

1. Read `TODO.md`.
2. Work from the top down.
3. Build in the new v2 repo, not v1.
4. Set up CI and deployment before major features.
5. Build database and backend foundations before pages.
6. Build shared UI before full screens.
7. Port only Slate from v1.
8. Test every feature.
9. Keep docs updated.
10. Push to `stage`, then promote to `main` when stable.
