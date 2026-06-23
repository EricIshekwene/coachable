# API Standards

**Status:** Authoritative source for client API conventions in v2.
**Scope:** `src/utils/api/` — all client-side API functions, the `apiFetch` wrapper, and hooks that call them. Does not cover server-side route conventions (see `backend-code-standards.md`).

---

## 01. Error Contract — `{ data, error }`

`apiFetch` never throws. Every API function returns `{ data, error }`.

```ts
const { data: plays, error } = await getPlays(teamId);
if (error) { ... }
```

`error` is `null` on success. `data` is `null` on failure. Call sites never need `try/catch`.

```ts
// apiFetch signature
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: ApiError | null }>
```

```ts
interface ApiError {
  code: string;       // machine-readable, used for alias lookup
  message: string;    // human-readable fallback from the server
  status: number;     // HTTP status code
}
```

Non-2xx responses are caught inside `apiFetch` and returned as `{ data: null, error }`. Network failures (no response) are also caught and returned as `{ data: null, error }` with `status: 0`.

---

## 02. Function Naming — Verb Prefix

All API functions use a **REST verb prefix** followed by the resource name.

| Verb | When to use |
|---|---|
| `get` | Read one or many resources |
| `create` | POST a new resource |
| `update` | PATCH an existing resource |
| `delete` | Delete a resource |
| `toggle` | Single-field flip (e.g. favorite) |
| `move` | Reposition a resource (folder, sort order) |
| `restore` | Un-archive a soft-deleted resource |

```ts
// Good
getPlays(teamId)
createPlay(teamId, data)
updatePlay(teamId, playId, data)
deletePlay(teamId, playId)
updatePlayTags(teamId, playId, tags)
togglePlayFavorite(teamId, playId)
movePlayToFolder(teamId, playId, folderId)

// Avoid — v1 naming patterns
fetchPlays(teamId)
apiDeletePlay(teamId, playId)
apiToggleFavorite(teamId, playId)
```

One file per resource in `src/utils/api/`, mirroring `server/routes/`:

```
src/utils/api/
  apiFetch.ts       ← base wrapper only
  plays.ts
  teams.ts
  folders.ts
  auth.ts
  users.ts
  ...
```

---

## 03. Error Responsibility — Split by Action Type

**Queries (data fetching)** expose `error` for inline display. The hook returns it; the component decides how to render it — empty state, error banner, or retry prompt.

```ts
// useTeamPlays.ts
export function useTeamPlays(teamId: string) {
  const [plays, setPlays] = useState<Play[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getPlays(teamId).then(({ data, error }) => {
      if (error) setError(error);
      else setPlays(data);
      setIsLoading(false);
    });
  }, [teamId]);

  return { plays, error, isLoading };
}
```

```tsx
// PlaysPage.tsx — component owns the inline display
const { plays, error, isLoading } = useTeamPlays(teamId);
if (error) return <ErrorBanner message={getErrorMessage(error.code)} />;
```

**Mutations (create, update, delete)** fire a toast automatically on failure. The component does not handle the error — it only reacts to success.

```ts
// useCreatePlay.ts
export function useCreatePlay(teamId: string) {
  async function createPlay(data: CreatePlayInput) {
    const { data: play, error } = await createPlayRequest(teamId, data);
    if (error) {
      toast.error(getErrorMessage(error.code)); // hook owns the toast
      return null;
    }
    return play;
  }

  return { createPlay };
}
```

```tsx
// Component only reacts to success
const { createPlay } = useCreatePlay(teamId);
async function handleSubmit() {
  const play = await createPlay(formData);
  if (play) navigate(`/plays/${play.id}`);
}
```

Error messages come from the shared alias map in `src/utils/errorMessages.ts`. Neither hooks nor components define their own messages.

---

## 04. Optimistic Updates — Roll Back on Failure

For fast-tap interactions (toggling favorites, reordering, moving to folder), update state immediately before the server confirms. If the server call fails, roll back to the previous state and fire a toast.

```ts
// useToggleFavorite.ts
export function useToggleFavorite(teamId: string) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  async function toggleFavorite(playId: string) {
    // optimistic update
    const wasActive = favorites.has(playId);
    setFavorites(prev => {
      const next = new Set(prev);
      wasActive ? next.delete(playId) : next.add(playId);
      return next;
    });

    const { error } = await togglePlayFavorite(teamId, playId);

    if (error) {
      // roll back
      setFavorites(prev => {
        const next = new Set(prev);
        wasActive ? next.add(playId) : next.delete(playId);
        return next;
      });
      toast.error(getErrorMessage(error.code));
    }
  }

  return { favorites, toggleFavorite };
}
```

**When to use optimistic updates:** interactions where the user expects instant feedback and the operation is unlikely to fail under normal conditions (favorites, reordering, folder moves).

**When not to use optimistic updates:** operations with meaningful failure modes the user needs to see before the state changes (deleting a play, transferring ownership, submitting a form with validation).

---

## 05. Auth Expiry — Redirect with Return URL

When `apiFetch` receives a `401` response, it clears auth state and redirects to `/login` with the current path preserved.

```ts
// inside apiFetch
if (response.status === 401) {
  clearAuth(); // clears localStorage token + AuthContext
  const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${returnPath}`;
  return { data: null, error: null }; // caller never resolves
}
```

The login page reads `?redirect` after successful authentication and navigates there:

```ts
// inside the login success handler
const params = new URLSearchParams(location.search);
const redirect = params.get('redirect');
navigate(redirect ?? '/dashboard', { replace: true });
```

Only same-origin paths are followed. If `redirect` contains `://` or starts with `//`, fall back to `/dashboard`.

401s are **not** surfaced to the hook or component as an `ApiError`. The redirect is the response — no toast, no inline error.

---

## 06. Error Message Map

All user-facing error strings live in one shared file:

```ts
// src/utils/errorMessages.ts
const ERROR_MESSAGES: Record<string, string> = {
  TEAM_NAME_TAKEN:    'That team name is already in use. Try a different name.',
  INVITE_EXPIRED:     'This invite has expired. Ask your coach to send a new one.',
  PLAY_NOT_FOUND:     'This play no longer exists. It may have been deleted.',
  PLAN_LIMIT:         'Your plan has reached its team limit. Upgrade to add more teams.',
  FAVORITE_FAILED:    'Could not update favorite. Try again.',
  // ...
};

const FALLBACK = 'Something went wrong. Please try again or contact support.';

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? FALLBACK;
}
```

Server error responses must include a `code` string. New server error codes must be paired with an entry in this map before the feature ships.

---

## Quick Reference

| Decision | Rule |
|---|---|
| `apiFetch` on non-2xx | Returns `{ data: null, error }` — never throws |
| Function naming | Verb prefix: `getPlays`, `deletePlay`, `updatePlayTags` |
| Failed query | Hook returns `error`; component renders inline |
| Failed mutation | Hook fires `toast.error(getErrorMessage(code))` automatically |
| Optimistic update failure | Roll back state + fire toast |
| 401 mid-session | Clear auth, redirect to `/login?redirect=<currentPath>` |
| Error messages | All from `src/utils/errorMessages.ts` — never inline strings |

---

## Cross-Reference Notes

**References:** `frontend-code-standards.md` (§14 error display and alias map), `backend-code-standards.md` (server-side route conventions).

**Used by:** all hooks in `src/utils/api/` and any hook that calls an API function.
