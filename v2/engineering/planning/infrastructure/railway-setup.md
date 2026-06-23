# Railway Setup — Coachable v2

This doc captures every Railway configuration decision for v2 so the setup can be done in one sitting.

---

## Project structure

- **Railway plan:** Pro
- **Railway project:** `coachable-v2` — a new project in the same account, completely separate from the v1 `coachable-api` project
- **v1 stays live** in `coachable-api` (`resplendent-inspiration` service) until cutover. No changes to v1 during v2 development.

### Services inside `coachable-v2`

| Service | Purpose |
|---|---|
| `coachable-v2-dev` | Web server, deploys from `stage` branch |
| `Postgres (dev)` | PostgreSQL DB for `coachable-v2-dev` |
| `coachable-v2-prod` | Web server, deploys from `main` branch |
| `Postgres (prod)` | PostgreSQL DB for `coachable-v2-prod` |

Each web service connects only to its own Postgres — dev DB never touches prod DB.

---

## Branch → deploy mapping

| Git branch | Railway service | Trigger |
|---|---|---|
| `stage` | `coachable-v2-dev` | After CI passes |
| `main` | `coachable-v2-prod` | After CI passes |

**Workflow:** Push code to `stage` daily. Merge `stage` → `main` when ready to promote. Railway deploys automatically on CI green.

**CI change required:** `security-and-code-quality.md` currently gates CI on `branches: [main]` only. Update to `branches: [main, stage]` so pushes to `stage` also trigger CI before the dev service deploys.

---

## Deploy gating

Both services deploy **only after CI passes** — Railway watches the GitHub Actions status check. The dev URL (`dev.coachableplays.com`) always reflects code that passes lint and tests. A broken push never deploys.

This is configured in Railway per-service under: **Settings → Deployments → Wait for CI checks before deploying → Enabled**.

---

## Monorepo configuration

v2 keeps the same monorepo structure as v1: `server/` is a subdirectory of the repo root, with its own `package.json`. Railway must be told where the server root is.

**Set on both `coachable-v2-dev` and `coachable-v2-prod`:**

```
RAILWAY_ROOT_DIRECTORY = server
```

This tells Railway to run `npm install` and `npm start` from `server/` rather than the repo root.

**Deploy command** (in Railway service settings): leave as Railway's default (`npm start`) — v2 `server/package.json` must have a `start` script.

---

## Domains

| Environment | Domain |
|---|---|
| Dev | `dev.coachableplays.com` |
| Prod (pre-cutover) | Railway-generated `.up.railway.app` URL |
| Prod (post-cutover) | `coachableplays.com` |

`dev.coachableplays.com` is set up at project creation. It's a real subdomain — clean for mobile testing and internal links.

**DNS record for dev:** Add a CNAME on `dev.coachableplays.com` pointing at the Railway-generated domain for `coachable-v2-dev`. Then add `dev.coachableplays.com` as a custom domain in Railway service settings.

---

## Cutover plan

When v2 prod is ready to replace v1:

1. Add `coachableplays.com` as a custom domain on `coachable-v2-prod` in Railway
2. Verify v2 prod is serving correctly at the Railway-generated URL
3. Remove `coachableplays.com` from v1 (`resplendent-inspiration`) in Railway
4. Railway routes `coachableplays.com` to v2 prod instantly — no DNS propagation delay because the DNS record already points at Railway's infrastructure

This is reversible: if v2 prod has a critical issue post-cutover, re-add `coachableplays.com` to v1 in Railway to roll back.

---

## Environment variables

All env vars for `coachable-v2-dev` and `coachable-v2-prod` are documented in `v2/environment.md` (TODO 1.4). Set them in Railway after the services are created.

**Key vars that must be set before the first deploy:**

- `DATABASE_URL` — Railway auto-injects this when you link the Postgres service to the web service
- `JWT_SECRET` — generate fresh for v2; do not reuse v1's value
- `NODE_ENV` — `development` for dev service, `production` for prod service
- `CORS_ORIGINS` — `https://dev.coachableplays.com` for dev, `https://coachableplays.com` for prod

See `v2/environment.md` for the complete list.

---

## Setup checklist

Do these in order. Takes one sitting.

**1. Create the Railway project**
- [ ] Log into Railway → New Project → name it `coachable-v2`

**2. Create the dev services**
- [ ] Add service → Deploy from GitHub repo → select v2 repo → branch `stage` → name it `coachable-v2-dev`
- [ ] Add service → Database → PostgreSQL → name it `Postgres (dev)`
- [ ] Link `Postgres (dev)` to `coachable-v2-dev` (Railway auto-injects `DATABASE_URL`)

**3. Configure `coachable-v2-dev`**
- [ ] Settings → Variables → add `RAILWAY_ROOT_DIRECTORY = server`
- [ ] Settings → Variables → add all vars from `v2/environment.md` for the dev environment
- [ ] Settings → Deployments → enable "Wait for CI checks before deploying"

**4. Set up `dev.coachableplays.com`**
- [ ] Railway: Settings → Networking → Custom Domain → add `dev.coachableplays.com`
- [ ] DNS registrar: add CNAME `dev.coachableplays.com` → Railway-generated domain for `coachable-v2-dev`
- [ ] Verify Railway shows the domain as active

**5. Create the prod services**
- [ ] Add service → Deploy from GitHub repo → select v2 repo → branch `main` → name it `coachable-v2-prod`
- [ ] Add service → Database → PostgreSQL → name it `Postgres (prod)`
- [ ] Link `Postgres (prod)` to `coachable-v2-prod`

**6. Configure `coachable-v2-prod`**
- [ ] Settings → Variables → add `RAILWAY_ROOT_DIRECTORY = server`
- [ ] Settings → Variables → add all vars from `v2/environment.md` for the prod environment
- [ ] Settings → Deployments → enable "Wait for CI checks before deploying"

**7. Update CI to run on `stage`**
- [ ] In `.github/workflows/ci.yml`, update `branches: [main]` to `branches: [main, stage]`

**8. Verify first deploy**
- [ ] Push a commit to `stage` → confirm CI runs → confirm `coachable-v2-dev` deploys → hit `dev.coachableplays.com` and confirm the health check responds

---

## Cross-Reference Notes

**Depends on:**
- `v2/environment.md` (TODO 1.4) — complete env var list; must exist before step 3 and 6
- `.github/workflows/ci.yml` (TODO 1.3) — must exist and pass before Railway CI gating is meaningful
- `v2/engineering/planning/infrastructure/security-and-code-quality.md` — CI branches setting needs updating (step 7)

**Referenced by:**
- `v2/engineering/planning/infrastructure/ops-setup.md` (TODO 4.3) — Railway health check path configured here
- `v2/database.md` (TODO 2.2) — backup strategy depends on which Railway plan the DB is on (Pro)
