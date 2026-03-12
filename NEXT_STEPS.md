# Next Steps — Coachable Backend Integration

## What's Done

### Backend (Railway) — already deployed
- **API URL:** `https://resplendent-inspiration-production-2fa9.up.railway.app`
- **Health check:** `GET /health` — returns `{"status":"ok","db":"connected"}`
- **Database:** PostgreSQL on Railway, all tables migrated
- **Auth:** bcrypt password hashing + JWT (30-day tokens)

### Frontend Integration — just completed
- **AuthContext** rewritten to call real API endpoints (signup, login, /auth/me, onboarding)
- **JWT token** stored in localStorage under `coachable_token`, restored on page load
- **Route protection** added — unauthenticated users redirected to `/login`, unboarded users to `/onboarding`
- **Plays** — CRUD now fetches from `GET /teams/:teamId/plays`, creates via API, saves via API
- **Folders** — CRUD backed by API endpoints
- **Play editor** (PlayEditPage) — loads and saves play data via API
- **Team page** — fetches real invite code from API
- **Profile/Settings** — update user profile and team settings via API

### Files Created/Modified
| File | What changed |
|------|-------------|
| `src/utils/api.js` | NEW — `apiFetch()` helper with JWT auth headers |
| `src/utils/apiPlays.js` | NEW — play CRUD API wrappers |
| `src/utils/apiFolders.js` | NEW — folder CRUD API wrappers |
| `src/context/AuthContext.jsx` | Rewritten — real API calls, JWT, loading state |
| `src/pages/Login.jsx` | Updated — async login, error handling |
| `src/pages/Signup.jsx` | Updated — async signup, password sent to API |
| `src/pages/Onboarding.jsx` | Updated — async onboarding, error handling |
| `src/pages/app/Plays.jsx` | Rewritten — fetches from API instead of localStorage |
| `src/pages/app/PlayNew.jsx` | Updated — creates via API |
| `src/pages/app/PlayView.jsx` | Updated — fetches single play via API |
| `src/pages/PlayEditPage.jsx` | Updated — loads/saves via API |
| `src/pages/app/Team.jsx` | Updated — fetches invite code from API |
| `src/App.jsx` | Added RequireAuth + RequireOnboarded route guards |

---

## What YOU Need To Do

### 1. Set `VITE_API_URL` in Cloudflare (required)

Your frontend needs to know where the API lives.

1. Go to **Cloudflare Pages** > your coachable project > **Settings** > **Environment variables**
2. Add this variable for **Production**:
   ```
   VITE_API_URL = https://resplendent-inspiration-production-2fa9.up.railway.app
   ```
3. **Also add it for Preview** if you want preview deploys to work
4. Redeploy the frontend (push this commit) so Vite picks up the new env var

### 2. Update `CORS_ORIGINS` in Railway (required)

Tell me your Cloudflare Pages URL and I'll set it, OR do it manually:

1. Go to **Railway** > `coachable-api` project > `resplendent-inspiration` service > **Variables**
2. Update `CORS_ORIGINS` to:
   ```
   http://localhost:5173,https://YOUR-DOMAIN.pages.dev
   ```
   Replace with your actual Cloudflare Pages URL

### 3. Push this commit and redeploy

After setting the env vars above:
```bash
git push
```
Cloudflare will auto-build from your push. The backend is already deployed.

### 4. Test the flow

1. Visit your Cloudflare URL
2. Click "Sign up" — create an account
3. Complete onboarding (create a team)
4. Create a play, open editor, make changes
5. Verify plays persist across page reloads

---

## Not Yet Implemented (add later)

- **Email verification** — needs Resend setup
- **Password reset** — forgot password flow (needs email provider)
- **Share links** — `POST /teams/:id/plays/:playId/share-links`, `GET /share/:token`
- **Join request approval** — coach approves/rejects join requests
- **Play import endpoint** — server-side validation of imported plays

## Railway Cleanup (optional)

Delete unused services in Railway dashboard:
- `Postgres-y9Ne` (duplicate)
- `lively-elegance` (empty)

Keep:
- `Postgres` (your database)
- `resplendent-inspiration` (your API)

## Useful Commands

```bash
# Deploy backend updates
cd server && railway up --service resplendent-inspiration

# View backend logs
railway logs --service resplendent-inspiration

# Run server locally
cd server
DATABASE_URL="<get-from-railway-postgres-variables>" npm run dev

# Run frontend locally
VITE_API_URL=http://localhost:3001 npm run dev
```
