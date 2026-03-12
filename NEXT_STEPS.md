# Next Steps — Coachable Backend

## What's Done

The backend API is **live and deployed** on Railway.

- **API URL:** `https://resplendent-inspiration-production-2fa9.up.railway.app`
- **Health check:** `GET /health` — returns `{"status":"ok","db":"connected"}`
- **Database:** PostgreSQL on Railway, all tables migrated
- **Auth:** bcrypt password hashing + JWT (30-day tokens)
- **Railway project:** `coachable-api`

### Implemented Endpoints

| Flow | Endpoints |
|------|-----------|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Onboarding | `POST /onboarding/create-team`, `POST /onboarding/join-team` |
| Teams | `GET /teams/:id/members`, `GET /teams/:id/invite-code`, `POST /teams/:id/invite-code/rotate`, `PATCH /teams/:id/settings`, `POST /teams/:id/ownership-transfer`, `DELETE /teams/:id/members/:userId` |
| Plays | `GET /teams/:id/plays`, `POST /teams/:id/plays`, `GET /teams/:id/plays/:playId`, `PATCH /teams/:id/plays/:playId`, `DELETE /teams/:id/plays/:playId` |
| Play extras | `PATCH /teams/:id/plays/:playId/tags`, `PUT /teams/:id/plays/:playId/favorite`, `PATCH /teams/:id/plays/:playId/notes`, `PATCH /teams/:id/plays/:playId/folder` |
| Folders | `GET /teams/:id/folders`, `POST /teams/:id/folders`, `PATCH /teams/:id/folders/:folderId`, `DELETE /teams/:id/folders/:folderId` |
| Users | `PATCH /users/me`, `PATCH /users/me/preferences` |

---

## What YOU Need To Do

### 1. Set `VITE_API_URL` in Cloudflare (required)

Your frontend needs to know where the API lives.

1. Go to **Cloudflare Pages** > your coachable project > **Settings** > **Environment variables**
2. Add this variable for **Production**:
   ```
   VITE_API_URL = https://resplendent-inspiration-production-2fa9.up.railway.app
   ```
3. Redeploy the frontend (or push a commit) so Vite picks up the new env var

### 2. Update `CORS_ORIGINS` in Railway (required)

The backend currently only allows `http://localhost:5173`. You need to add your Cloudflare domain.

1. Go to **Railway** > `coachable-api` project > `resplendent-inspiration` service > **Variables**
2. Update `CORS_ORIGINS` to:
   ```
   http://localhost:5173,https://YOUR-CLOUDFLARE-DOMAIN.pages.dev
   ```
   Replace with your actual Cloudflare Pages URL (e.g., `https://coachable.pages.dev`)

### 3. Wire up the frontend (the big one)

Replace localStorage calls with API calls. The general pattern:

```js
// In your frontend, create src/utils/api.js:
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('coachable_token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}
```

Then replace each context/storage function:

| Frontend function | Replace with |
|---|---|
| `AuthContext.login()` | `apiFetch('/auth/login', { method: 'POST', body: { email, password } })` |
| `AuthContext.signup()` | `apiFetch('/auth/signup', { method: 'POST', body: { name, email, password } })` |
| `AuthContext.completeOnboarding()` | `apiFetch('/onboarding/create-team', ...)` or `apiFetch('/onboarding/join-team', ...)` |
| `saveAppPlay()` | `apiFetch('/teams/${teamId}/plays', { method: 'POST', body: {...} })` |
| `loadAppPlays()` | `apiFetch('/teams/${teamId}/plays')` |
| `updateAppPlay()` | `apiFetch('/teams/${teamId}/plays/${playId}', { method: 'PATCH', body: {...} })` |
| `deleteAppPlay()` | `apiFetch('/teams/${teamId}/plays/${playId}', { method: 'DELETE' })` |
| `loadFolders()` / `saveFolders()` | `apiFetch('/teams/${teamId}/folders', ...)` |

### 4. Store JWT token on the client

After login/signup, store the token:
```js
localStorage.setItem('coachable_token', response.token);
```

On app load, call `GET /auth/me` with the stored token to restore the session.

On logout, remove it:
```js
localStorage.removeItem('coachable_token');
```

---

## Not Yet Implemented (add later)

These flows were skipped for now and can be added when needed:

- **Email verification** — needs Resend setup. Add `POST /auth/verify-email` endpoint
- **Email change verification** — `POST /users/me/email-change` + `POST /users/me/email-change/verify`
- **Share links** — `POST /teams/:id/plays/:playId/share-links`, `GET /share/:token`
- **Join request approval** — `POST /teams/:id/join-requests`, approve/reject endpoints
- **Play import endpoint** — `POST /teams/:id/plays/import` (server-side validation)
- **Password reset** — forgot password flow (needs email provider)

## Railway Cleanup (optional)

The template deployment created extra services. In Railway dashboard you can delete:
- `Postgres-y9Ne` (duplicate, unused)
- `lively-elegance` (empty service from template)

Keep:
- `Postgres` (your database)
- `resplendent-inspiration` (your API)

## Useful Commands

```bash
# Run migration again (if you update schema.sql)
cd server
DATABASE_URL="postgresql://postgres:vCjwUoNMDvyPiiqqyCpeCYcqvYADwiHT@crossover.proxy.rlwy.net:39355/railway" node db/migrate.js

# Deploy updates
cd server
railway up --service resplendent-inspiration

# View logs
railway logs --service resplendent-inspiration

# Run server locally
cd server
DATABASE_URL="postgresql://postgres:vCjwUoNMDvyPiiqqyCpeCYcqvYADwiHT@crossover.proxy.rlwy.net:39355/railway" npm run dev
```
