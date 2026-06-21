# Landing Page Performance Diagnosis

**Date:** June 2026
**Symptoms:** Slow image load on the landing page; visible content shifts and delayed render on first visit.
**Status:** Diagnosed, not yet fixed.

---

## Root causes

### 1 — Oversized PNG images with no lazy loading

`Landing.jsx` statically imports five PNG files at the top of the module. All five are requested by the browser on initial page load. None of the below-fold images carry a `loading="lazy"` attribute.

| Image | Section | Size | Above fold? |
|---|---|---|---|
| `film_session_long.png` | Hero background | 4.44 MB | Yes |
| `Gemini_Generated_Image_....png` | Video section bg | 2.18 MB | No |
| `coach_studying_long.png` | Bento grid (Animate card) | 4.54 MB | No |
| `coaches_together_long.png` | Bento grid (Manage card) | 4.03 MB | No |
| `old_whiteboard_long.png` | Closing CTA | 4.35 MB | No |
| **Total** | | **~19.5 MB** | |

The browser fetches all five simultaneously on the first paint. Only the hero image needs to be available immediately. The other four can be deferred.

`_short` variants exist for every image (`coach_studying_short.png`, etc.) at roughly half the file size, but the landing page uses only the `_long` versions regardless of screen size.

The images are also PNG, not WebP. For photographic content, WebP is typically 30–50% smaller than PNG at equivalent quality. Converting the five images to WebP would save approximately 8–12 MB before any lazy loading is applied.

---

### 2 — No React.lazy() — all pages loaded at boot

`src/App.jsx` has 40+ static `import` statements covering every page in the app: all admin pages, Slate (the full play editor), SlateRecord, SlateDrawing, Staff pages, etc. A visitor to the landing page downloads the JavaScript for all of them.

The Slate editor is the heaviest: it pulls in Konva, the animation engine, GIF export workers, and the drawing module. None of this is needed on the landing page.

There are no `React.lazy()` calls in the router. The one dynamic import in App.jsx is for `adminTransport`, not for route splitting.

---

### 3 — No `fetchpriority` hint on the LCP element

The hero background image (`film_session_long`) is the Largest Contentful Paint element. It has no `fetchpriority="high"` attribute, so the browser does not know to prioritize it over the other four image fetches it is competing with.

---

### 4 — Video autoplays with no intersection gate

The product demo video (`/product-demo.mp4`) uses `autoPlay` and has no `preload` attribute, which defaults to `preload="auto"` in most browsers. The browser begins buffering the video immediately on page load alongside the five image fetches. This adds further network contention above the fold.

---

## Fix plan

### Fix A — Image format conversion (highest impact)

Convert all five landing page images from PNG to WebP using a build-time script (e.g. `sharp` or `cwebp`). Target quality 82. Expected output sizes: 400–900 KB per image vs. the current 2–4.5 MB. This alone cuts the image payload by ~12 MB.

The `_short` variants should be converted at the same time. They are unused but should be kept as WebP for the `<picture>` fix below.

---

### Fix B — `loading="lazy"` on below-fold images

Add `loading="lazy"` to every image that is not in the initial viewport:

| Element | Change |
|---|---|
| Hero `<img>` (`film_session_long`) | Add `fetchpriority="high"` — do NOT add lazy |
| Video section `<img>` (`videoSectionBg`) | Add `loading="lazy"` |
| Bento Animate card `<img>` (`coachStudyingLong`) | Add `loading="lazy"` |
| Bento Manage card `<img>` (`coachesTogetherLong`) | Add `loading="lazy"` |
| Closing CTA `<img>` (`oldWhiteboardLong`) | Add `loading="lazy"` |
| Footer logo `<img>` | Add `loading="lazy"` |

---

### Fix C — `<picture>` with `_short` on mobile

The bento grid cards and the closing CTA use tall landscape images on desktop. On mobile these cards stack to single column and the full resolution is unnecessary. Use a `<picture>` element to serve the `_short` variant below the `md` breakpoint:

```jsx
<picture>
  <source media="(max-width: 767px)" srcSet={coachStudyingShort} type="image/webp" />
  <img src={coachStudyingLong} alt="Coach studying plays" loading="lazy" ... />
</picture>
```

This applies to `coachStudying`, `coachesTogether`, and `oldWhiteboard`. The hero can stay on the `_long` variant since it fills the full viewport on all screen sizes.

---

### Fix D — Route-level code splitting with React.lazy()

Split `App.jsx` into lazy-loaded route groups. The minimum useful split: a visitor to the landing page should not download Slate, Admin pages, or Staff pages.

Suggested grouping:

```js
// Eager — needed immediately on any page
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy — loaded only when the user navigates there
const Slate = lazy(() => import("./features/slate/Slate"));
const Admin = lazy(() => import("./pages/Admin"));
// ... all admin pages as a lazy group
const Plays = lazy(() => import("./pages/app/Plays"));
// ... all app/* pages as a lazy group
```

Each lazy route group should be wrapped in a `<Suspense fallback={<FullPageSpinner />}>`. This connects to 7.2 (Routing v2) which plans the full route architecture — the lazy split should be done as part of that initiative rather than as an isolated patch.

---

### Fix E — Defer video buffering until in view

Change the product demo video from `autoPlay` to intersection-observer-gated playback. The `<video>` element should use `preload="none"` by default and begin buffering only when it enters the viewport (using an `IntersectionObserver` ref). This removes the video from the network contention on first paint entirely.

---

## Priority order

| Priority | Fix | Why |
|---|---|---|
| 1 | Fix A — WebP conversion | Biggest absolute savings, no code change |
| 2 | Fix B — `loading="lazy"` | Small code change, immediate impact |
| 3 | Fix D — React.lazy splits | JS bundle size; requires Suspense wiring |
| 4 | Fix C — `<picture>` srcset | Mobile-only improvement |
| 5 | Fix E — Video defer | Reduces first-paint contention |

Fixes A and B can be done independently of the v2 stage branch setup. Fix D should be deferred until 7.2 (Routing v2) is underway, so the lazy split is designed as part of the full routing architecture rather than bolted on afterward.

---

## Done looks like

- Lighthouse LCP on the landing page is under 2.5 s on a throttled connection (Fast 3G baseline).
- The hero image is the only image fetched on first paint.
- No PNG files remain in `src/assets/pictures/` or `src/assets/backgrounds/`.
- `npm run build -- --reporter=verbose` shows Slate and Admin in separate chunks from the main bundle.
- The video element does not start buffering until it is scrolled into view.
