# localStorage-First Autosave

## What Was Implemented

Replaced the previous autosave system (which wrote to the database on every change via 1.2s debounce) with a **localStorage-first** strategy that only flushes to the database on page unload or navigation.

## How It Works

### Save Flow

1. **Every change** (800ms debounce) writes to `localStorage` under key `coachable_play_{playId}`
2. **Database writes** happen only when:
   - The page is about to unload (`beforeunload` event)
   - The tab loses visibility (`visibilitychange` → hidden)
   - The user navigates away via in-app navigation (e.g., "Home" button)
3. After a successful DB write, the localStorage cache is cleared

### Recovery Flow

On page load, the parent page component:
1. Fetches the play from the server
2. Checks localStorage for a cached version
3. If the cached version has a newer `savedAt` timestamp than the server's `updated_at`, it uses the cached data as `initialPlayData`

### Key Files

| File | Role |
|------|------|
| `Slate.jsx` | `persistToLocalStorage()` — writes to localStorage; `flushToDatabase()` — calls parent's `onPlayDataChange`; exposes `flushRef` |
| `PlayEditPage.jsx` | Registers `beforeunload`/`visibilitychange` listeners; recovery logic; passes `flushRef` to Slate |
| `AdminPlayEditPage.jsx` | Same pattern as PlayEditPage for admin plays |
| `ExportActions.jsx` | Save button removed (no longer needed) |

### localStorage Schema

```json
{
  "playData": { ... },
  "playName": "My Play",
  "savedAt": 1711382400000
}
```

Key format: `coachable_play_{playId}`

## Key Decisions

- **800ms debounce** for localStorage writes (cheap operation, prioritizes not losing data)
- **No manual Save button** — autosave to localStorage is invisible; DB flush is automatic
- **Ctrl+S** still intercepted (prevents browser save dialog) but no longer triggers a save action
- **`visibilitychange`** is the primary flush trigger — more reliable than `beforeunload` on mobile
- **`flushRef` pattern** used instead of `forwardRef` to avoid wrapping Slate in `forwardRef`
