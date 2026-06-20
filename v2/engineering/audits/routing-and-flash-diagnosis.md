# Routing & Page Flash Diagnosis

**Branch context:** Analysis of `src/App.jsx` and `src/index.css` in the current `main` branch.
**Problem:** Navigating between pages produces blank screens, background color strobes, and jarring full-DOM swaps — the "epilepsy shock" effect.
**Scope:** This doc diagnoses exactly why it happens, explains whether switching to Next.js helps, and describes how to build in v2 so it never recurs.

---

## Root Cause 1 — The Entire App Ships as One JavaScript Bundle

`App.jsx` has 60+ static imports at the top of the file:

```js
import Slate from "./features/slate/Slate";
import SlateRecord from "./features/slate/SlateRecord";
import Landing from "./pages/Landing";
import AdminPlaysPage from "./pages/AdminPlaysPage";
import AdminUsersPage from "./pages/AdminUsersPage";
// ... ~55 more
```

Every single one of these is an eager import. There is not a single `React.lazy()` call in the file. What this means in practice:

- A coach visiting the landing page (`/`) downloads the Konva editor, MUI, recharts, ffmpeg glue, the admin dashboard, the design system, and every admin page — before they've logged in or done anything
- Vite bundles this into one large JavaScript file that must parse and execute before any React renders at all
- The larger the bundle, the longer the white/dark screen before any content appears
- This is the single biggest contributor to slow initial loads

The fix is `React.lazy()` on every page import. This is a mechanical change — each eager import becomes a lazy import and Vite automatically splits it into its own chunk that only downloads when that route is first visited. React Router v7 wraps navigations in `startTransition` by default, so the old page stays visible while the new chunk downloads — no blank in the middle.

---

## Root Cause 2 — The Body Background Is Hardcoded Dark and Never Changes

`src/index.css`:
```css
html {
    background-color: #121212;   /* hardcoded dark */
}
body {
    background-color: #121212;   /* hardcoded dark */
}
```

The app supports light mode. When a user has light mode active, `[data-theme="light"] .app-themed` overrides `--color-BrandBlack` to `#ffffff`. But that override only applies inside `.app-themed` elements. The `body` itself stays `#121212` dark regardless of theme.

During any navigation where React is unmounting the current page and mounting the next one, there is a frame — sometimes several frames — where neither page's content is painted. In that gap, whatever is behind the React tree shows through. For light-mode users, that is the dark `body` background. The result is a white page → black flash → white page strobe. On dark mode the same gap is invisible because body and app share the same color.

This is compounded when navigating from a light-mode app page to the Slate editor, which hardcodes dark colors:
```jsx
// SlateRoot in App.jsx — forces dark regardless of user's theme setting
<div style={{
  "--color-BrandBlack":  "#121212",
  "--color-BrandBlack2": "#2a2e34",
}}>
```

A light-mode user going into the editor sees: white app page → black body flash → black editor. The same strobe happens in reverse when leaving the editor.

---

## Root Cause 3 — The Editor Is Outside the App Shell, Causing a Full DOM Swap

Look at the route structure in `App.jsx`:

```jsx
{/* Inside AppLayout — nav + sidebar persist across these navigations */}
<Route path="/app" element={<AppLayout />}>
  <Route path="plays" element={<Plays />} />       {/* /app/plays */}
  <Route path="plays/:id" element={<PlayView />} /> {/* /app/plays/:id */}
  ...
</Route>

{/* Outside AppLayout — these mount fresh, unmounting everything above */}
<Route path="/app/plays/:id/edit" element={<PlayEditPage />} />    {/* /app/plays/:id/edit */}
<Route path="/app/plays/:id/view" element={<PlayViewOnlyPage />} /> {/* /app/plays/:id/view */}
```

When a coach taps "Edit" on a play card, the navigation goes from `/app/plays` to `/app/plays/:id/edit`. These are siblings in the route tree, not parent/child. React Router completely unmounts the `AppLayout` subtree (sidebar, bottom nav, main content) and mounts `PlayEditPage` fresh. There is no shared parent that stays mounted — the entire viewport is a blank DOM for however long the editor takes to initialize.

This is intentional — the editor is a full-screen overlay that shouldn't share chrome with the app shell — but it means the transition is as jarring as possible. There is no shared ancestor to hold background color or provide visual continuity.

---

## Root Cause 4 — ThemeInit Runs After First Render

```jsx
function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", resolved);
    // ...
  }, []);
}
```

`useEffect` runs after the browser has already painted the first frame. This means on every page load or hard refresh, there is at least one frame — usually 16–33ms — where `data-theme` is not set on `<html>`. During that frame:
- `[data-theme="light"] .app-themed` has not applied yet
- The page renders in whatever the CSS default is (dark — because body is hardcoded dark)
- The theme snaps in on the next frame

For users with light mode saved, this produces a dark flash on every page load. It is most visible on a slow CPU or when the JS bundle is large (which it is, per Root Cause 1).

---

## Root Cause 5 — Auth Guards Show a Full-Screen Spinner

`RequireAuth`, `LandingGate`, and `RequireStaffSession` all render a full-screen dark spinner while checking auth state:

```jsx
if (loading) {
  return (
    <div className="flex h-screen items-center justify-center bg-BrandBlack">
      <div className="h-10 w-10 ... animate-spin" />
    </div>
  );
}
```

Every route that passes through `RequireAuth` shows this spinner until `AuthContext` resolves the `/auth/me` call. This spinner is the correct behavior — the app has to know if the user is logged in before rendering anything — but it adds to the visual "jump" because it is a full-screen paint followed immediately by the actual page content.

On subsequent navigations (after auth is already known), `loading` is false and the spinner never shows. This is fine. But on the initial load of any protected route (e.g., linking directly to `/app/plays`), users see: dark background → orange spinner → layout → content.

---

## Should You Switch to Next.js?

**No — not for the problems you're describing. And not without major preparation.**

The flash and load issues are fixable in the current Vite app. Next.js would not automatically fix them and would introduce significant new risk.

Here's why Next.js does not help this specific project:

### The Slate editor is SSR-hostile
`react-konva` (the canvas engine), `ffmpeg.wasm` (video export via UMD `<script>` tag and web workers), `mp4-muxer`, `html-to-image` — none of these run on a server. In Next.js, every editor route becomes `dynamic(..., { ssr: false })`, which means it renders exactly as it does today. Zero benefit, after weeks of porting.

### 57 files use browser APIs
`window`, `localStorage`, `navigator`, `document` — all crash with "window is not defined" during server rendering. Each one needs to be audited and wrapped in a client check. This is not automated.

### The route tree is complex
`App.jsx` has 65+ routes with nested guards (`RequireAuth`, `RequireOnboarded`, `RequireAdminSession`, `RequireStaffSession`, `RequirePerm`), layout wrappers (`AdminLayout`, `StaffLayout`), and the basePath reuse pattern for staff pages. All of this rewrites from React Router conventions to Next.js App Router file conventions. It is a multi-week rewrite.

### The Express backend stays
The ~12k-line Express backend (auth, teams, plays, admin, notifications, outreach, email) cannot move to Next.js API routes easily. You would keep Express and run Next.js as a separate service — changing the current "Express serves dist/" single-process Railway deploy into two Railway services with CORS and cookie domain changes.

### What Next.js would actually buy you
The only genuine win would be server-side rendering for the public/marketing pages: `Landing.jsx`, `PublicPlaybooksPage.jsx`, `Resources.jsx`, `Enterprise.jsx`, and the `/shared/:token` pages. Everything behind auth (`/app/*`, `/admin/*`, `/staff/*`) gains essentially nothing — it must remain client-interactive.

**That is not worth 3–6 weeks of high-risk migration work.** Fix the Vite app first.

---

## The Actual Fixes — Vite App, No Framework Change

These are ordered by impact and can each be done independently.

### Fix 1 — Code Splitting with React.lazy() (Biggest Impact — Half a Day)

Convert every page import in `App.jsx` from eager to lazy:

```js
// Before — all 60 imports execute on startup
import Plays from "./pages/app/Plays";
import AdminPlaysPage from "./pages/AdminPlaysPage";
import Slate from "./features/slate/Slate";
// ...

// After — each page downloads only when its route is first visited
import { lazy, Suspense } from "react";
const Plays = lazy(() => import("./pages/app/Plays"));
const AdminPlaysPage = lazy(() => import("./pages/AdminPlaysPage"));
const Slate = lazy(() => import("./features/slate/Slate"));
// ...
```

Keep `AppLayout`, auth guards (`RequireAuth`, `RequireOnboarded`, etc.), and the provider wrappers as eager imports — they are tiny and need to be ready immediately.

Wrap `<AppRoutes />` in a single `<Suspense>` fallback:

```jsx
function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <AuthProvider>
        <FeatureFlagBridge>
          <AppMessageProvider ...>
            <MessagePopup ... />
            <Suspense fallback={<AppLoadingFallback />}>
              <AppRoutes />
            </Suspense>
          </AppMessageProvider>
        </FeatureFlagBridge>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

`AppLoadingFallback` should match the app's background color for the current theme — not a spinner on a dark background if the user is in light mode.

React Router v7 wraps all navigations in `startTransition` automatically, which means the old page stays visible while a new chunk loads. The `<Suspense>` fallback only shows on the very first visit to a chunk — not on subsequent navigations to that same section.

**Result:** The landing page bundle drops from "everything" to just Landing + React + router. Konva, MUI, recharts, admin pages — none of it downloads until a route that needs it is visited.

Add a `lazyWithRetry` wrapper to handle stale chunks after a Railway deploy:

```js
// src/utils/lazyWithRetry.js
export function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch(() => {
      // Chunk failed — most likely a stale hashed filename after a deploy.
      // Reload once to get the fresh manifest.
      window.location.reload();
      return new Promise(() => {}); // never resolves — reload takes over
    })
  );
}

// Usage in App.jsx
const Plays = lazyWithRetry(() => import("./pages/app/Plays"));
```

### Fix 2 — Make the Body Background Follow the Theme (30 Minutes, Eliminates the Strobe)

The `body` background must track the theme. Replace the hardcoded dark in `index.css`:

```css
/* Before */
html { background-color: #121212; }
body { background-color: #121212; }

/* After */
html { background-color: #121212; }  /* dark default — overridden below */
body { background-color: #121212; }

/* Light theme — applied by ThemeInit before first paint (see Fix 3) */
html[data-theme="light"] {
    background-color: #ffffff;
}
html[data-theme="light"] body {
    background-color: #ffffff;
}
```

This means the body color matches the app content in both themes. The gap between React renders is invisible — the background they're painting over already matches.

### Fix 3 — Apply Theme Before First Paint (30 Minutes, Eliminates Initial Flash)

Move theme initialization out of `useEffect` into a synchronous inline `<script>` in `index.html`:

```html
<!-- index.html — before any CSS or scripts -->
<script>
  (function() {
    var saved = localStorage.getItem('theme') || 'light';
    var resolved = saved === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : saved;
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

This runs synchronously, before the browser parses any CSS or renders any frame. The very first paint already has the correct `data-theme` set. The `useEffect` in `ThemeInit` can be removed entirely for the initial-load case (keep it only for runtime theme changes via the settings toggle).

This is the same pattern used by every major app with dark mode (GitHub, Linear, Notion) — they all apply the theme synchronously via an inline script to prevent the flash.

### Fix 4 — Add Page Skeletons on High-Traffic Pages (1–2 Days, Eliminates Blank Content Gaps)

Pages that fetch data on mount currently render empty or partial content while the API call completes. The play list, team page, and notifications page are the most visible.

Add a layout-shaped skeleton that renders instantly while data loads:

```jsx
// Example: Plays.jsx
export default function Plays() {
  const [plays, setPlays] = useState(null); // null = loading, [] = empty

  if (plays === null) return <PlaysSkeleton />;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {plays.map(play => <PlayCard key={play.id} play={play} />)}
    </div>
  );
}

function PlaysSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-BrandBlack2 animate-pulse" />
      ))}
    </div>
  );
}
```

The skeleton renders at the correct background color immediately. When data arrives, the skeleton swaps for real content. No blank white or dark gap.

`AdminSkeleton` already exists as a pattern in `src/admin/components/AdminSkeleton.jsx`. The app shell needs the equivalent.

### Fix 5 — View Transitions for Smooth Navigation (1 Hour, Eliminates Jarring Jumps)

React Router v7 supports the View Transitions API natively. Adding `viewTransition` to `<Link>` elements gives a browser-native cross-fade between old and new page content:

```jsx
// Any Link that navigates between pages
<Link to={`/app/plays/${play.id}/edit`} viewTransition>
  Edit
</Link>

// Or imperatively
const navigate = useNavigate();
navigate(`/app/plays/${play.id}/edit`, { viewTransition: true });
```

The browser handles the cross-fade (~150ms) between the old page and the new one. Even where a swap is abrupt (e.g., list → full-screen editor), the fade reads as "smooth" instead of "strobe." Works in Chrome, Edge, and Safari. Silently degrades to a normal swap in Firefox — no polyfill needed.

For the list → editor transition specifically, adding a custom transition animation makes the editor appear to slide in over the list rather than replace it entirely:

```css
/* index.css */
::view-transition-old(root) {
    animation: 150ms ease-out fade-out;
}
::view-transition-new(root) {
    animation: 200ms ease-out fade-in;
}

@keyframes fade-out {
    to { opacity: 0; }
}
@keyframes fade-in {
    from { opacity: 0; }
}
```

### Fix 6 — Preload the Editor Chunk from the Play List (30 Minutes, Keeps Editor Fast)

With lazy loading, the editor chunk (`Slate.jsx` and its heavy deps: Konva, MUI Slider) downloads on first visit to the edit route. This could add a noticeable delay when a coach first taps Edit.

Fix: fire the import() call in the background as soon as the plays list renders, so the chunk is cached before the user taps Edit:

```jsx
// Plays.jsx — at the top of the component
useEffect(() => {
  // Preload the editor chunk in the background so it's ready when the user taps Edit
  import("../PlayEditPage");
}, []);
```

This downloads the chunk silently. When the user taps Edit, the chunk is already in the browser cache — navigation feels instant.

---

## How to Build in v2 to Prevent This

These are structural decisions to make before building v2 UI, not things to retrofit later.

### Decision 1 — Lazy by Default, Eager by Exception

In v2, the rule is: **every page import in the route file is lazy unless there is a documented reason it cannot be**. The exceptions are small (auth guards, layout wrappers, providers). Everything else — every page, every heavy feature — is lazy.

Make this enforceable by linting. Add an ESLint rule that flags static imports of page components from the route file:

```
// .eslintrc: flag any import from ./pages/ or ./features/ in App.jsx that is not lazy()
```

This way a new page session cannot accidentally add an eager import without seeing a lint warning.

### Decision 2 — Theme Applied Before First Paint, Always

The inline `<script>` in `index.html` from Fix 3 is the permanent solution. Add it to `index.html` at project setup in v2 and never remove it. The `ThemeInit` component only handles runtime theme changes (settings toggle) — not initial load.

Corollary: every new page or layout component must use CSS variables (`var(--color-BrandBlack)`) not hardcoded hex. `SlateRoot` hardcodes dark colors via inline styles — this is wrong and causes the editor flash. In v2, the editor must respect the user's theme choice, or explicitly document that the editor is always dark and transition accordingly.

### Decision 3 — Body and HTML Must Follow Theme

Add `html[data-theme="light"] { background-color: #ffffff; }` to the global CSS at project setup. Never hardcode `body { background-color: #121212 }` without the corresponding light override. This is a 2-line addition that prevents the entire family of strobe flashes.

### Decision 4 — Skeleton States Are Required, Not Optional

Every page that fetches data on mount must have a skeleton state. The rule:

- `null` initial state = loading = render skeleton
- `[]` / empty data = render empty state
- populated data = render real content

No page should ever render a completely blank viewport while loading. The skeleton must use the page's background color so the content area is always painted.

### Decision 5 — Route Architecture: Consistent Shell Coverage

The current architecture has two classes of routes:
1. Inside `<AppLayout>` — sidebar/nav persists, only content area swaps (smooth)
2. Outside `<AppLayout>` — entire DOM swaps (jarring)

The editor is in class 2 because it is full-screen and cannot share chrome with the nav. This is correct product behavior. But the transition between class 1 and class 2 is where the worst flashes occur.

In v2, use View Transitions on every navigation between these two classes. This is not optional for routes that users move between frequently (play list → editor → play list).

For routes that genuinely should stay full-screen (editor, admin slate, standalone `/slate/:sport`), document this explicitly so future sessions don't accidentally move them back inside a layout.

### Decision 6 — Token Names Must Be Semantic Before Building UI

The strobe between light-mode pages and the dark editor happens because `SlateRoot` hardcodes dark colors instead of using theme tokens. And the reason it hardcodes them is that the token names (`BrandBlack`) do not communicate semantic intent — a developer building the editor sees `BrandBlack` and thinks "this is a dark color, so hardcoding dark is fine."

In v2, rename tokens before writing any UI:

```
BrandBlack  → surface-page        (dark: #121212 / light: #ffffff)
BrandBlack2 → surface-elevated    (dark: #2a2e34 / light: #fafbfc)
BrandText   → text-primary
BrandGray   → text-secondary
BrandGray2  → text-subtle
BrandOrange → accent
BrandGreen  → success
```

With semantic names, `var(--surface-page)` in the editor applies the correct color in both themes without any inline style overrides. The flash disappears structurally.

---

## Summary — What Causes the Flash, What Fixes It

| Cause | Effect | Fix |
|---|---|---|
| Zero `React.lazy()` — one bundle | Slow initial load; entire app parses before first paint | Lazy imports for all pages in App.jsx |
| `body` hardcoded `#121212` | Dark flash between light-mode pages | `html[data-theme="light"] body { background: #fff }` |
| `ThemeInit` runs in `useEffect` | Wrong-theme flash on first paint | Inline `<script>` in index.html before CSS |
| Editor outside `<AppLayout>` | Full DOM swap: blank gap during list → editor nav | View Transitions API on these navigations |
| `SlateRoot` hardcodes dark inline styles | Light → editor color shock | Remove hardcoded inline styles; use CSS vars |
| Pages render blank while fetching | Empty viewport gap during data load | Skeleton states on all data-fetching pages |
| Auth guards show full-screen spinner | Dark spinner between every auth check | Skeleton behind spinner, or persist last content |

None of these require Next.js. All of them are fixable in the current Vite app. The total effort for all six fixes is roughly 2–3 days. The strobe would be gone and the load time would drop significantly.
