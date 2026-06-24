# State Management

**Status:** Decided — June 2026. Authoritative source for state architecture in v2.
**Scope:** All React state in `src/`. Does not cover server-side state or database concerns.

---

## Decision summary

| Layer | Tool | Used for |
|---|---|---|
| Server state | React Query (TanStack Query v5) | Plays, folders, notifications, any data fetched from the API |
| Shared session state | React Context | Auth identity, feature flags, global toast, notification store |
| Local UI state | `useState` | Menu open, rename input, drag state, search query, modal visibility |
| Shared client state | — | No use case in v2 — add if one emerges |

Zustand is **not used in v2**. React Query + React Context covers every category. Add Zustand if a use case emerges that requires high-frequency shared UI state outside the React tree — there is none in v2.

---

## 01. What goes where

Three types of state exist in Coachable. Assign each piece to a type before reaching for a tool.

### Server state

Data that lives in the database and is fetched over the network. Anything that can go stale, requires loading/error handling, or comes from an API endpoint is server state.

**Always use React Query.** Do not manage server state with `useState` + `useEffect`. The v1 pattern — fetch on mount, store in `useState`, manually manage loading — is replaced entirely by React Query.

Examples: plays list, folders list, trashed plays, notification unread count, notification list.

### Shared session state

State that is shared across pages, lives for the session, and is not fetched on demand. The four v1 contexts carry forward into v2 (see §05).

### Local UI state

State scoped to a single component or page with no server relationship.

Examples: menu open/closed, rename input value, drag-over target, search string, sort selection, modal visibility, bulk selection set, toast message, inline form values.

These stay as `useState` in the component or hook that owns them. Do not lift local UI state into a context or React Query just because it lives on a complex page — that is the v1 mistake that produced 29 `useState` calls in a single file. In v2, local UI state stays local; the 200-line file size limit (§12 in `frontend-code-standards.md`) is enforced by extracting hooks and sub-components, not by promoting state.

---

## 02. React Query setup

```
npm install @tanstack/react-query
```

One `QueryClient` lives at the app root, outside `AuthProvider`. Individual queries gate on `teamId` from `AuthContext` via the `enabled` option — the client itself does not need auth.

```tsx
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
```

**`staleTime: 30_000`** — plays and folders do not change in the background without a coach action. 30 seconds prevents unnecessary refetches during fast page navigation.

**`retry: 2`** — replaces the hand-rolled 3-attempt loops in v1's `NotificationsContext`.

---

## 03. Query key conventions

Every query key is an array. Keys are hierarchical — first element is the resource, subsequent elements narrow scope.

| Query | Key |
|---|---|
| Plays list | `['plays', teamId]` |
| Folders list | `['folders', teamId]` |
| Trashed plays | `['plays', teamId, 'trash']` |
| Notification unread count | `['notifications', 'unread-count']` |
| Full notification list | `['notifications', 'list']` |

**Invalidation rule:** Invalidate at the narrowest scope that covers the change. A mutation that modifies a play invalidates `['plays', teamId]` — not `['plays']` (too broad — would cross team boundaries if team switching ever occurs mid-session).

```ts
// After a successful mutation on plays:
queryClient.invalidateQueries({ queryKey: ['plays', teamId] });

// Never — crosses team boundaries:
queryClient.invalidateQueries({ queryKey: ['plays'] });
```

---

## 04. Query hooks

Each resource has a dedicated query hook. The hook wraps `useQuery` and is the only place the query key and fetch function appear together.

```ts
// src/app/pages/Plays/hooks/usePlays.ts
export function usePlays(teamId: string | null): UseQueryResult<Play[]> {
  return useQuery({
    queryKey: ['plays', teamId],
    queryFn: () => getPlays(teamId!),
    enabled: !!teamId,
  });
}

// src/app/pages/Plays/hooks/useFolders.ts
export function useFolders(teamId: string | null): UseQueryResult<Folder[]> {
  return useQuery({
    queryKey: ['folders', teamId],
    queryFn: () => getFolders(teamId!),
    enabled: !!teamId,
  });
}
```

**Co-location rule:** A query hook starts co-located next to the page that uses it. If a second page needs the same hook, move it to `src/utils/hooks/` — not before. This matches the co-location rule in `frontend-code-standards.md §12`.

```
src/app/pages/Plays/
  Plays.tsx
  hooks/
    usePlays.ts
    useFolders.ts
    useTrashedPlays.ts
```

---

## 05. Mutation pattern

All mutations use the full React Query pattern: optimistic update in `onMutate`, rollback in `onError`, invalidation in `onSettled`. There are no fire-and-forget mutations — every mutation has a rollback path. This replaces the v1 pattern of `.catch(() => {})` that silently swallowed failures.

**Simple mutation — single cache key:**

```ts
const toggleFavoriteMutation = useMutation({
  mutationFn: ({ playId, favorited }: { playId: string; favorited: boolean }) =>
    togglePlayFavorite(teamId!, playId, favorited),

  onMutate: async ({ playId, favorited }) => {
    await queryClient.cancelQueries({ queryKey: ['plays', teamId] });
    const previous = queryClient.getQueryData<Play[]>(['plays', teamId]);
    queryClient.setQueryData<Play[]>(['plays', teamId], old =>
      old?.map(p => p.id === playId ? { ...p, favorited } : p) ?? []
    );
    return { previous };
  },

  onError: (_err, _vars, context) => {
    if (context?.previous) {
      queryClient.setQueryData(['plays', teamId], context.previous);
    }
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['plays', teamId] });
  },
});
```

**Multi-collection mutation — two cache keys updated together:**

Move play to folder updates both `plays` and `folders` caches simultaneously. Both are rolled back independently on error.

```ts
const movePlayMutation = useMutation({
  mutationFn: ({ playId, folderId }: { playId: string; folderId: string }) =>
    movePlayToFolder(teamId!, playId, folderId),

  onMutate: async ({ playId, folderId }) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: ['plays', teamId] }),
      queryClient.cancelQueries({ queryKey: ['folders', teamId] }),
    ]);
    const previousPlays = queryClient.getQueryData<Play[]>(['plays', teamId]);
    const previousFolders = queryClient.getQueryData<Folder[]>(['folders', teamId]);

    queryClient.setQueryData<Play[]>(['plays', teamId], old =>
      old?.map(p => p.id === playId ? { ...p, folderId } : p) ?? []
    );
    queryClient.setQueryData<Folder[]>(['folders', teamId], old =>
      old?.map(f => {
        const without = f.playIds.filter(id => id !== playId);
        return f.id === folderId
          ? { ...f, playIds: [...without, playId] }
          : { ...f, playIds: without };
      }) ?? []
    );

    return { previousPlays, previousFolders };
  },

  onError: (_err, _vars, context) => {
    if (context?.previousPlays) queryClient.setQueryData(['plays', teamId], context.previousPlays);
    if (context?.previousFolders) queryClient.setQueryData(['folders', teamId], context.previousFolders);
  },

  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['plays', teamId] });
    queryClient.invalidateQueries({ queryKey: ['folders', teamId] });
  },
});
```

**Mutation loading states** replace manual `isLoading` `useState` calls. `mutation.isPending` is the v2 equivalent of v1's `postLoading`.

---

## 06. Context inventory

The four v1 contexts carry forward. Three are unchanged in shape; one is rebuilt internally on React Query.

| Context | Change in v2 | Reason |
|---|---|---|
| `AuthContext` | Unchanged — React Context + useState | Drives routing, controls cross-query invalidation on team switch, owns `playerViewMode` UI toggle |
| `NotificationsContext` | Rebuilt internally on React Query | Replaces manual `setInterval` + retry loop; count and list become separate queries |
| `FeatureFlagContext` | Unchanged — React Context + useState | Fetched once per session; React Query caching adds no value |
| `AppMessageContext` | Unchanged — React Context pass-through | Pure UI state — global toast/popup system (`showMessage`) |

### Why `AuthContext` is not a React Query query

Auth drives routing — a null `user` redirects to login before any other query runs. Auth also has mutations (`login`, `logout`, `switchTeam`, `joinTeam`, `leaveTeam`) that must invalidate all active queries simultaneously. `switchTeam` calls `queryClient.clear()` inside `AuthContext`, which is straightforward to control from a context. Expressing the same behavior from a `useMutation` + cross-query invalidation chain adds complexity without benefit.

`playerViewMode` is a pure UI toggle — a coach previewing the player's view of the app. It has no server representation and correctly lives in `AuthContext` alongside the user object it gates on.

---

## 07. NotificationsContext — React Query rebuild

`NotificationsContext` is internally rebuilt on React Query. Its external API — `unreadCount`, `notifications`, `markRead`, `markAllRead`, `respond` — is unchanged so consumers need no edits.

Two queries replace the manual `setInterval` + `fetchNotifications` loop:

```ts
// Count-only poll — runs on every authenticated page, cheap endpoint
const { data: unreadCount = 0 } = useQuery({
  queryKey: ['notifications', 'unread-count'],
  queryFn: getNotificationUnreadCount,   // GET /api/notifications/unread-count
  refetchInterval: 60_000,
  enabled: !!userId,
});

// Full list — only fetched when the bell is opened
const { data: notifications = [] } = useQuery({
  queryKey: ['notifications', 'list'],
  queryFn: getNotifications,             // GET /api/notifications
  enabled: bellIsOpen,
});
```

This matches the v2 notification-delivery spec: the count endpoint is a single `SELECT count(*)`, cheap at any scale. The full list is deferred until the user opens the bell. React Query's built-in retry (configured at `retry: 2` globally) replaces the manual 3-attempt loop in v1.

`markRead` and `markAllRead` are `useMutation` calls. `onMutate` updates the `['notifications', 'list']` cache optimistically. `onSettled` invalidates `['notifications', 'unread-count']` so the badge re-derives from the server.

---

## 08. `usePermissions()` — future (task 7.4)

`usePermissions()` is not yet built. When task 7.4 is complete:

- It reads from `AuthContext` — specifically `user.role`, `user.assistantPermissions`, and `playerViewMode`
- It is a plain derived hook: no network request, no new state, no new context
- It replaces inline `user.role === 'coach'` checks across the codebase

Until 7.4 is complete, use inline role checks as specified in `frontend-code-standards.md §14`.

---

## Quick reference

| Question | Answer |
|---|---|
| Server data — plays, folders, notifications? | `useQuery` |
| Mutating server data with optimistic update? | `useMutation` — always `onMutate` / `onError` / `onSettled` |
| Auth, flags, toasts, notifications? | React Context (see §06) |
| Menu open, modal visible, search string, input value? | `useState` in the component |
| Shared client UI state across pages? | No use case in v2 — use Context if one emerges |
| Zustand? | No |

---

## Cross-reference

- `engineering/frontend-code-standards.md` — component anatomy, file size limit, hook co-location hierarchy
- `engineering/planning/features/notification-delivery.md` — poll interval and endpoint specs for `NotificationsContext`
- `engineering/planning/api-standards.md` — `apiFetch` wrapper and `{ data, error }` contract used inside `queryFn`
- `engineering/planning/permissions.md` — `usePermissions()` hook (task 7.4, not yet written)
