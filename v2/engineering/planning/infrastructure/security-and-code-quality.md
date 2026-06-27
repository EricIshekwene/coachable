# Security and Code Quality Overview

This covers how to use external tools to automatically review and validate code at every stage of the git workflow — pre-push on your local machine, post-push in CI, and on pull requests if collaborators join. Budget constraint is under $30/month total.

---

## What we are trying to catch

1. **Security vulnerabilities** — SQL injection, XSS, hardcoded secrets, insecure JWT handling, missing auth middleware on new routes
2. **Broken tests** — a push that makes any test suite fail should be blocked before it reaches `stage` or `main`
3. **Code quality regressions** — obvious bugs, unused imports, type errors, dead code
4. **AI-friendliness** — code that lacks enough structure or naming for Claude to navigate it confidently when you ask for changes
5. **Dependency vulnerabilities** — packages with known CVEs pulled in by npm installs

---

## Three stages of enforcement

```
Stage 1: Pre-push (local, your machine, runs before git push succeeds)
Stage 2: CI (GitHub Actions, runs after every push and on every PR)
Stage 3: PR review bots (optional, only relevant when collaborators join)
```

Each stage catches different things and has different cost characteristics.

---

## Stage 1 — Pre-push hooks (local, free)

Git hooks in `.husky/pre-push` run on your machine before any push leaves. No cloud cost.

**What to run:**

```bash
#!/bin/sh
# .husky/pre-push

npm test                         # all Vitest suites must pass
npm run lint                     # ESLint must pass
npm audit --audit-level=high     # block on high/critical dependency CVEs
```

If any step fails, the push is blocked. You see the failure in your terminal before anything reaches GitHub.

**Prerequisite:** All tests must be passing before Husky is installed. Wire the hook with all three commands from day 1 — do not start with lint-only and add test later. Fix any failing tests first, then wire.

**Tool for managing hooks:** [Husky](https://typicode.github.io/husky/) makes git hooks shareable. Hooks live in `.husky/` in the repo (committed to git) instead of `.git/hooks/` (per-machine only). When a collaborator clones the repo, `npm install` automatically installs the hooks via Husky's `prepare` script.

**Windows note:** Husky works on Windows via Git Bash (included with Git for Windows). No special config needed. The hook file uses `#!/bin/sh` and runs correctly in Git Bash.

**Setup steps (first-time install):**
1. `npm install --save-dev husky`
2. `npx husky init` — creates `.husky/pre-push` and adds `"prepare": "husky"` to `package.json`
3. Replace the generated hook content with the three commands above

**Cost:** Free. Runs entirely on your local machine.

**Con:** Can be bypassed with `git push --no-verify`. This is acceptable when solo — you choose when to skip. Becomes a gap if collaborators join, which is why Stage 2 exists.

---

## Stage 2 — GitHub Actions CI (automated, post-push)

GitHub Actions runs on every push to `stage` or `main`, and on every PR. The free tier is 2,000 minutes/month for private repos. At ~2 minutes per run, that is ~1,000 pushes before hitting the limit.

**Required `package.json` scripts (root):**
```json
"test:frontend": "vitest run",
"typecheck": "tsc --noEmit",
"size": "size-limit"
```

**Required `server/package.json` scripts:**
```json
"test:server": "vitest run"
```

These are separate so a server test failure does not hide a lint failure and vice versa in CI output.

**Workflow file (`.github/workflows/ci.yml`):**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-lint:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: coachable_test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: coachable_test
        ports: ["5432:5432"]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: cd server && npm ci

      - name: Run migrations on test DB
        run: node server/db/migrate.js
        env:
          DATABASE_URL: postgres://coachable_test:test@localhost:5432/coachable_test

      - name: Lint
        run: npm run lint

      - name: TypeScript type check
        run: npm run typecheck

      - name: Docs convention check
        run: |
          if find src/ server/ -name "*.md" | grep -q .; then
            echo "❌ .md files found in src/ or server/ — move to docs/"
            find src/ server/ -name "*.md"
            exit 1
          fi

      - name: Frontend tests
        run: npm run test:frontend

      # Uncomment when server integration tests exist (TODO 3.1)
      # - name: Server integration tests
      #   run: npm run test:server
      #   env:
      #     DATABASE_URL: postgres://coachable_test:test@localhost:5432/coachable_test
      #     JWT_SECRET: ci-test-secret
      #     ADMIN_HASH: ${{ secrets.CI_ADMIN_HASH }}

      # Uncomment when build pipeline exists (TODO: bundle size baseline)
      # - name: Bundle size check
      #   run: npm run build && npm run size
```

**`ADMIN_HASH` in CI:**
- The server reads `process.env.ADMIN_HASH` (bcrypt hash of the admin password). In CI this is provided via a GitHub secret named `CI_ADMIN_HASH`.
- **How to set it up:** Copy the `ADMIN_HASH` value from the Railway production dashboard → paste it as `CI_ADMIN_HASH` in GitHub repo Settings → Secrets and variables → Actions → New repository secret. The value is already set in Railway; no regeneration needed.
- **If regeneration is ever needed:** `node --input-type=module -e "import bcrypt from 'bcrypt'; bcrypt.hash('YOUR_PASSWORD', 10).then(console.log)"`
- **Note:** Adding this secret is an execution step — it is not done yet.

**Cost estimate:**
- Each run: ~2–3 minutes
- 20 pushes/day average: ~1,800 minutes/month
- GitHub's free tier: 2,000 minutes/month for private repos
- **Realistic monthly cost: $0–$3**

---

## Stage 2b — Dependency security scanning (free)

**GitHub Dependabot** — enable via `.github/dependabot.yml`:

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

Dependabot automatically opens PRs to bump vulnerable or outdated packages. **All Dependabot PRs require manual review — no auto-merge.** Patch updates occasionally break things silently; review every one.

**GitHub Secret Scanning** — scans every push for accidentally committed API keys, tokens, JWT secrets, and database URLs, and emails you immediately if it finds any. **Must be enabled manually:** GitHub repo Settings → Security → Code security and analysis → Secret scanning → Enable. It is not on by default. Enabling is an execution step.

**Cost: Free.**

---

## Stage 3 — Automated PR review bots

### Snyk Code (SAST) — confirmed, add now

Static Application Security Testing. Scans your actual application code — not just dependencies — for security bugs. Finds: hardcoded secrets, SQL injection risk, JWT validation gaps, unvalidated user input flowing into DB queries, open redirect vulnerabilities. Understands that `req.params.id` is user-controlled and warns when it flows into a query without validation.

Integrates as a GitHub Action — runs on every push, posts results as PR checks.

**Setup:** Sign up at snyk.io, connect the GitHub repo, enable the GitHub Action. Free tier covers 200 scans/month — more than sufficient.

**Cost: Free (free tier).**

---

### ESLint security plugins — confirmed, add with Snyk

Add these to the ESLint config alongside Snyk:

- `eslint-plugin-security` — flags `eval()`, unvalidated regex, `innerHTML` injection patterns
- `eslint-plugin-no-secrets` — catches accidentally committed API keys or tokens

Both are free npm packages that run in CI as part of `npm run lint`. `eslint-plugin-react-hooks` is already included in the React ecosystem config.

**Cost: Free.**

---

### CodeRabbit Pro — deferred until first collaborator

Reads every PR diff and posts inline review comments. Catches logic bugs, missing error handling, security gaps (missing auth checks, SQL injection patterns), and code style inconsistencies. Understands framework conventions — will notice if you add a new route without auth middleware.

**Decision:** Add when the first collaborator joins. Not needed while solo. At that point: $15/month per developer.

---

## Recommended stack

| Tool | When | Cost | Purpose |
|---|---|---|---|
| Husky + pre-push hook | Now (after tests green) | Free | Block failing tests, lint, and high CVEs before push |
| GitHub Actions CI | Now | ~$0–$3/month | Lint + type check + docs convention + frontend tests on every push |
| `tsc --noEmit` in CI | Now | Free | Catch TypeScript type errors that ESLint does not see |
| Docs convention check in CI | Now | Free | Fail build if any `.md` file lands in `src/` or `server/` |
| GitHub Dependabot | Now | Free | Weekly PRs for vulnerable or outdated packages |
| GitHub Secret Scanning | Now (enable in settings) | Free | Alert on accidentally committed credentials |
| Snyk Code (free tier) | Now | Free | SAST security scan on Express routes and React code |
| ESLint security plugins | Now (with Snyk) | Free | Pattern-level security and secret detection in lint |
| `size-limit` bundle check | When build pipeline exists | Free | Fail CI if JS bundle exceeds threshold — guards MUI-removal gains |
| CodeRabbit Pro | When first collaborator joins | $15/month/dev | Automated code review comments on every PR |

**Total (solo):** ~$0–$3/month. **Total (with one collaborator):** ~$15–$18/month.

---

## Bundle size check — `size-limit` (deferred)

Wire this step once the Vite build pipeline is in place. The purpose is to make bundle regressions visible — a single heavy import can undo the MUI removal gains without anyone noticing until Lighthouse flags it.

**Install:**
```bash
npm install --save-dev size-limit @size-limit/file
```

**`package.json` config:**
```json
"size-limit": [
  { "path": "dist/assets/*.js", "limit": "150 kB" }
]
```

Set the initial limit to whatever the clean build produces. Tighten it over time. The step is commented out in the CI workflow — uncomment it once the build pipeline is in place and a baseline is measured.

**Cost: Free.**

---

## Setup order

1. **Fix failing tests** — pre-push hook requires a green test suite before it is wired
2. **Install Husky** — `npm install --save-dev husky && npx husky init`, replace hook with the three-command script
3. **Create `.github/workflows/ci.yml`** — workflow file goes in now; add `test:frontend` and `typecheck` scripts to root `package.json`
4. **Enable Dependabot** — commit `.github/dependabot.yml`
5. **Enable Secret Scanning** — GitHub repo Settings → Security → Secret scanning → Enable
6. **Wire Snyk** — snyk.io → connect repo → enable GitHub Action; add ESLint security plugins to eslint config
7. **Uncomment `test:server` in CI** — when server integration tests ship (TODO 3.1); add `test:server` script to `server/package.json` at the same time
8. **Wire `size-limit`** — when build pipeline exists; measure baseline, set threshold, uncomment CI step
9. **Add CodeRabbit** — when first collaborator joins; configure `.coderabbit.yml` to focus on security, missing auth, and test coverage
10. **Ongoing** — keep `CLAUDE.md`, `docs/INDEX.md`, and JSDoc on route handlers current; this is not a one-time setup

---

## AI-friendliness: making Claude useful as an automatic code reviewer

The goal is that when you ask Claude to make a change, it can navigate the codebase without you needing to explain where things are every time.

**1. CLAUDE.md as a navigation index**

In v2, `CLAUDE.md` should be the first file Claude reads — it should say exactly where every domain of the codebase lives:

```markdown
# Coachable — AI Navigation Index

## Where things live
- Server routes: `server/routes/` — one file per resource (auth.js, plays.js, teams.js, etc.)
- Shared components: `src/ui/` — all prop-driven components, barrel export at `src/ui/index.js`
- Core play editor: `src/slate/` — closed boundary, canvas + animation + hooks all here
- API calls (client): `src/utils/api/` — one file per resource, mirrors server/routes/
- All documentation: `docs/` — see `docs/INDEX.md` for full list

## How the auth system works
JWT stored in localStorage under `coachable_token`. AuthContext reads it on mount
via GET /auth/me. Server middleware is `server/middleware/auth.js`.

## How to add a new route
1. Add handler to the relevant file in `server/routes/`
2. Add client fetch helper to matching file in `src/utils/api/`
3. Add an integration test to `server/tests/routes/`
4. Add a fetch-contract test to `src/tests/` (see ui-testing-standards.md)
```

**2. JSDoc on every route handler and every hook**

For server routes:

```js
/**
 * Creates a new play in the team's playbook.
 * Requires: JWT auth, user must have coach or owner role on the team.
 * Body: { title, playData, tags?, notes?, folderId? }
 * Returns: { play: PlayRecord }
 */
router.post("/teams/:teamId/plays", requireAuth, requireTeamRole(["coach", "owner"]), async (req, res) => {
```

For hooks:

```js
/**
 * Manages the play editor's entity state (players, ball, drawings).
 * Returns methods to add, move, delete, and reset entities.
 * Depends on: SlateContext (current sport), useSlateHistory (undo stack)
 */
export function useSlateEntities() {
```

**3. `docs/INDEX.md` as a master doc map**

```markdown
# Docs Index

## v2 Planning
- [proposed-file-structure.md](v2/proposed-file-structure.md) — target src/ layout for the stage branch
- [test-suite-plan.md](v2/test-suite-plan.md) — what needs testing and how
- [security-and-code-quality.md](v2/security-and-code-quality.md) — CI, pre-push hooks, bot reviewers

## Features
- [slate.md](features/slate.md) — play editor architecture, canvas, animation, drawing tools
- [notifications.md](features/notifications.md) — notification types, delivery, read state
- [feature-flags.md](features/feature-flags.md) — flag schema, client context, admin toggle

## Server
- [routes.md](server/routes.md) — all Express routes, auth requirements, DB tables used
```

---

## Cross-Reference Notes

**Referenced by:** `v2/TODO.md` item 1.3 (CI/CD pipeline ⚠️ In progress).

**Resolved inconsistencies:**

1. **`server/tests/routes/`** — All references in this doc use `server/tests/` (no double underscores), consistent with `test-suite-plan.md` and `server-testing-standards.md`.

2. **`CLAUDE.md` example paths** — Updated to `server/tests/routes/` and `src/tests/` to match the v2 file structure on `stage`.

3. **`CRAWLER_MAP.md`** — Whether it stays at root or moves to `docs/` is an open question in TODO 1.5. No decision made — defer to that item.
