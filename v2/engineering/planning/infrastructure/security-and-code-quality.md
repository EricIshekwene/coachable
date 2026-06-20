# Security and Code Quality Overview

This covers how to use external tools to automatically review and validate code at every stage of the git workflow — pre-push on your local machine, post-push in CI, and on pull requests if collaborators join. Budget constraint is under $30/month total.

---

## What we are trying to catch

1. **Security vulnerabilities** — SQL injection, XSS, hardcoded secrets, insecure JWT handling, missing auth middleware on new routes
2. **Broken tests** — a push that makes any test suite fail should be blocked before it reaches main
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

Git hooks in `.git/hooks/pre-push` run on your machine before any push leaves. No cloud cost.

**What to run:**

```bash
#!/bin/sh
# .git/hooks/pre-push

npm test                    # all Vitest suites must pass
npm run lint                # ESLint must pass (already configured)
```

If either fails, the push is blocked. You see the failure in your terminal before anything reaches GitHub.

**Also consider:** `npm audit` in the pre-push hook to catch dependency vulnerabilities before they land on main. It is noisy when you have known minor vulnerabilities in dev dependencies, so wire it with `npm audit --audit-level=high` to only block on high/critical.

**Tool for managing hooks:** [Husky](https://typicode.com/husky) makes git hooks shareable (they live in the repo instead of `.git/hooks/` which is not committed). When a collaborator clones the repo, `npm install` automatically installs the hooks via Husky's `prepare` script. Without Husky, hooks are per-machine only.

**Cost:** Free. Runs entirely on your local machine.

**Con:** Can be bypassed with `git push --no-verify`. This is fine when you are the only developer — you choose when to skip it. Becomes a gap if collaborators join, which is why Stage 2 exists.

---

## Stage 2 — GitHub Actions CI (automated, post-push)

GitHub Actions runs on every push and on every PR. The free tier is 2,000 minutes/month for public repos and 2,000 minutes/month for private repos. At ~2 minutes per run, that is ~1,000 pushes before you hit the limit. Private repos beyond the free tier cost $0.008/minute.

**Recommended workflow file (`.github/workflows/ci.yml`):**

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

      - name: Frontend tests
        run: npm run test:frontend

      - name: Server integration tests
        run: npm run test:server
        env:
          DATABASE_URL: postgres://coachable_test:test@localhost:5432/coachable_test
          JWT_SECRET: ci-test-secret
          ADMIN_PASSWORD_HASH: ${{ secrets.CI_ADMIN_HASH }}
```

**Cost estimate:**
- Each run: ~2-3 minutes
- 20 pushes/day average: 60 minutes/day = ~1,800 minutes/month
- GitHub's free tier: 2,000 minutes/month for private repos
- You will likely stay within free. If you exceed it: $0.008/minute × 200 overage minutes = $1.60/month
- **Realistic monthly cost: $0–$3**

---

## Stage 2b — Dependency security scanning (free)

**GitHub Dependabot** is built into GitHub and free. Enable it via `.github/dependabot.yml`:

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

Dependabot automatically opens PRs to bump vulnerable or outdated packages. You review and merge. It does not auto-merge unless you configure it to, so you stay in control.

**GitHub Dependency Graph + Secret Scanning** — also free. Dependency Graph shows you what is installed and flags known CVEs. Secret Scanning scans every push for accidentally committed API keys, tokens, JWT secrets, and database URLs, and emails you if it finds any.

**Cost: Free.**

---

## Stage 3 — Automated PR review bots (when you have collaborators)

This is the "bot reviewer that pokes holes through the code" experience. There are a few options in the under-$30/month range:

---

### Option A: CodeRabbit

**What it does:** Reads every PR diff and posts review comments. Catches: logic bugs, missing error handling on new routes, security issues (SQL injection patterns, missing auth checks), code style inconsistencies, missing test coverage for changed files. It is specifically tuned to understand full context across files, not just the diff line.

**Pros:**
- The closest thing to a human code reviewer at low cost
- Understands framework conventions (Express, React) — it will notice if you add a new route without a corresponding auth middleware check
- Posts inline comments on the PR like a human reviewer does
- Has a "walk me through this PR" summary at the top of every PR which is useful when reviewing collaborator changes

**Cons:**
- Reviews PRs only, not individual commits directly (though every push to a PR branch triggers a review)
- Occasionally verbose on small diffs — you may need to tune the config to reduce noise
- The free tier is limited; meaningful usage requires the Pro plan

**Cost:** Free tier available (limited reviews). Pro plan is **$15/month per developer**. For solo or two-person use: $15/month.

---

### Option B: Snyk Code (SAST)

**What it does:** Static Application Security Testing. Deep security analysis of your code — not just dependency vulnerabilities but your actual application code. Finds things like: hardcoded secrets, SQL injection risk (even in parameterized query patterns where a variable slips in), JWT validation gaps, unvalidated user input reaching a DB query, open redirect vulnerabilities.

**Pros:**
- Best in class for finding actual security bugs in Express/Node code
- Integrates as a GitHub Action — runs on every push, posts results as PR checks
- Understands that `req.params.id` is user-controlled and warns when it flows into a query without validation
- Free tier covers the important stuff for a small codebase

**Cons:**
- Focused on security, not general code quality or logic bugs
- Can produce false positives on intentional patterns (e.g. it may flag your admin delete routes as "dangerous" even though they are properly auth-gated)
- The free tier has a scan limit that is fine for this codebase size

**Cost:** Free tier: 200 scans/month (more than enough). Paid plan if needed: **$25/month**.

---

### Option C: ESLint + custom rules in CI (free, already partially set up)

ESLint is already configured in the project. In CI it runs as part of every push. The existing config can be extended with security-focused plugins:

- `eslint-plugin-security` — flags `eval()`, unvalidated regex, `innerHTML` injection patterns
- `eslint-plugin-no-secrets` — catches accidentally committed API keys or tokens
- `eslint-plugin-react-hooks` — catches missing dependencies in `useEffect` (already part of the React ecosystem)

These are npm packages, free, and run in CI as part of `npm run lint`.

**Pros:** Free, already integrated into the workflow, no external dependency.

**Cons:** Much more limited than CodeRabbit or Snyk. ESLint rules are pattern-matching — they will not catch logic bugs or context-aware security issues. They will catch `eval()` but not a missing `requireAuth` on a new route.

---

## Recommended stack for under $30/month

For solo development with occasional collaborators:

| Tool | Stage | Cost | Purpose |
|---|---|---|---|
| Husky + git hooks | Pre-push | Free | Block broken tests and lint failures before push |
| GitHub Actions | Post-push/PR | ~$0–$3/month | Run full test suite + lint on every push |
| GitHub Dependabot | Always-on | Free | Auto-PR for dependency vulnerabilities |
| GitHub Secret Scanning | Always-on | Free | Alert on accidentally committed credentials |
| Snyk Code (free tier) | Post-push | Free | Security SAST on Express routes and React code |
| CodeRabbit Pro | PR reviews | $15/month | Automated code review comments on every PR |

**Total: ~$15–$18/month.** Well under $30. If you bring on a second developer, CodeRabbit Pro goes to $30/month total — still at the limit.

If you need to cut cost further, drop CodeRabbit and rely on Snyk + ESLint. You lose the general code quality feedback but keep the security coverage.

---

## AI-friendliness: making Claude useful as an automatic code reviewer

This is separate from the bot tools above. The goal is that when you ask Claude to make a change, it can navigate the codebase without you needing to explain where things are every time.

Three things that make Claude dramatically more effective as an automatic code accessor:

**1. CLAUDE.md as a navigation index**

The current `CLAUDE.md` has instructions and a reference to `CRAWLER_MAP.md`. In v2, `CLAUDE.md` should be the first file Claude reads — it should say exactly where every domain of the codebase lives. Example:

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
3. Add an integration test to `server/__tests__/routes/`
4. Add a fetch-contract test to `src/testing/suites/apiRoutes.suite.js`
```

Claude reads `CLAUDE.md` on every session. The better this file, the less you need to repeat context.

**2. JSDoc on every route handler and every hook**

Claude can read source files but it reads them faster and understands them better when functions describe their own contract. For server routes:

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

This is not documentation for human readers — you already know what the code does. It is a signal layer for Claude so that when you say "add hiddenFromPlayers support to the plays API," it can find the right route, understand its auth contract, and make the change without guessing.

**3. `docs/INDEX.md` as a master doc map**

A single file that lists every doc with a one-line description. Claude can read this file first to decide which docs are relevant before reading the full docs. Example:

```markdown
# Docs Index

## v2 Planning
- [proposed-file-structure.md](v2/proposed-file-structure.md) — target repo layout for v2
- [test-suite-plan.md](v2/test-suite-plan.md) — what needs testing and how
- [security-and-code-quality.md](v2/security-and-code-quality.md) — CI, pre-push hooks, bot reviewers

## Features
- [slate.md](features/slate.md) — play editor architecture, canvas, animation, drawing tools
- [notifications.md](features/notifications.md) — notification types, delivery, read state
- [feature-flags.md](features/feature-flags.md) — flag schema, client context, admin toggle

## Server
- [routes.md](server/routes.md) — all Express routes, auth requirements, DB tables used
```

When you drop this file into a Claude session, Claude immediately knows where to look without you having to explain the project structure. Combined with `CLAUDE.md` at the root, you can start a cold session and ask Claude to make a specific change with no warm-up explanation.

---

## Summary: what to set up in order

1. **Now:** Add Husky + pre-push hook running `npm test && npm run lint`. Takes 15 minutes.
2. **When server tests are written (Phase 2 per the test plan):** Add `.github/workflows/ci.yml`. Free.
3. **Add Dependabot + Secret Scanning:** Enable in GitHub repo settings → Security. Free, five minutes.
4. **Add Snyk:** Sign up at snyk.io, connect GitHub repo, enable the GitHub Action. Free tier. One hour.
5. **When collaborators join:** Add CodeRabbit. $15/month. Configure it in `.coderabbit.yml` to focus on security, missing auth, and test coverage.
6. **Ongoing:** Keep `CLAUDE.md`, `docs/INDEX.md`, and JSDoc on route handlers current. This is not a one-time setup — it decays as the codebase evolves.
