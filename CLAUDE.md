# Project Instructions

## Clarification
- If there is any slight ambiguity in a request, always ask clarifying questions before proceeding.

## Code Documentation
- All major methods/functions must have JSDoc-style method documentation.

## Implementation Documentation
- Any significant feature or big implementation must include a markdown (`.md`) file in the relevant folder describing what was implemented, how it works, and key decisions made.

## Testing
- Every new feature or component must have corresponding tests in `admin/test/`.
- Create the directory structure as needed under `admin/test/`.

## Deployment
- MCP servers available: **Railway** and **Resend**.
- Only redeploy to Railway if changes were made to the database or routes.

### Railway Redeploy Checklist
1. **Always pass `--service` explicitly:** Run `railway up --service resplendent-inspiration` from the project root. `railway service`/`railway status` are unreliable on Windows because `~/.railway/config.json` stores per-cwd entries case-sensitively (`C:\...` vs `c:\...`), so `railway service` may update one entry while `railway up` reads the other — silently deploying to the wrong service (e.g. `lively-elegance`, which has no env vars and crashes on startup).
2. **Always run from the project root,** not from `server/`. The service has `RAILWAY_ROOT_DIRECTORY=server` set, so Railway expects a `server/` subdirectory inside the upload. Running from inside `server/` uploads just `server/`'s contents and the build fails with `directory /server does not exist`.
3. **Deploy command:** Always use `railway up` (no `--ci` flag). The `--ci` flag causes TLS connection errors on Windows and will fail.
4. **A `.railwayignore` is required** at the project root (excludes `src/`, `public/`, `admin/`, `dist/`, etc.) — without it the upload from Windows hits TLS errors (`BadRecordMac`, `os error 10054`) because the snapshot is too large.
5. **Do NOT use the Railway MCP `deploy` tool** — it cannot find the Railway CLI in its PATH and will always fail.
6. **Verify deploy:** the Build Logs URL printed by `railway up` shows the service ID — confirm it is `629a8d8a-6a2c-4434-9f3c-ec90a3fff6ed` (resplendent-inspiration). Then run `railway deployment list` and wait for `SUCCESS`.
