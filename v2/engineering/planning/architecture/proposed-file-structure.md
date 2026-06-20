# Proposed v2 File Structure

This is a proposed reorganization of the Coachable repo. Not a migration plan — a target state to review and edit before anything is moved.

---

## What is wrong with the current structure

**Root is a junk drawer.** CLAUDE.md, README.md, tests.md, todo.md, STAFF_ADMIN_HANDOFF.md, STAFF_ADMIN_PLAN.md, OUTREACH_SCRAPER_PLAN.md, CODEX_VIDEO_EXPORT_FIX.txt, vite-dev.err.log, football-presets-all-formations.json, soccer-presets-all-formations.json — all flat at root. No organization, no signal about where anything belongs.

**Markdown files live next to the code they describe.** There are `.md` files scattered across `server/routes/`, `server/lib/`, `src/pages/`, `src/pages/app/`, `src/pages/designSystem/`, and `src/features/slate/`. This made sense as a "put the doc next to the code" habit but it means no AI tool, no human, and no Notion export can find all steering docs in one pass. You have to already know where to look.

**The core product (the Slate) is split across three folders.** The play editor lives in `src/features/slate/`, `src/canvas/`, and `src/animation/` with no logical separation between them. There is no obvious answer to "where does Slate-related code go?"

**The design system is buried inside pages.** `src/pages/designSystem/` is treated as just another page route. The admin has its own `src/admin/components/` folder with completely separate AdminBtn, AdminModal, AdminInput, etc. There is no shared component library. The failed `design-system-unification` branch was trying to fix this but couldn't because there was no clean target to migrate to.

**Admin is split between two places.** `src/admin/` holds context, hooks, and the admin component library. `src/pages/Admin*.jsx` holds 15+ admin page files. These are the same feature living in different directories.

**`src/components/` is a holding pen.** It contains canvas-specific editor UI (DrawToolsPill, AnimationDrawingTools), general modals (ExportModal, AuthPromptModal), and miscellaneous subcomponents with no organizing principle.

**`src/utils/` is a dumping ground.** 20+ files covering API calls, GIF encoding, play persistence, validation, SEO, mobile viewport — nothing grouped.

---

## Proposed Structure

```
coachable/
│
├── CLAUDE.md                        # AI context index — points to docs/, not content itself
├── README.md
├── package.json
├── vite.config.js
├── eslint.config.js
├── index.html
│
├── docs/                            # ALL steering, planning, and feature documentation
│   ├── INDEX.md                     # master index of all docs in this folder
│   ├── v2/                          # v2 planning docs (current v2/ folder moves here)
│   │   └── *.md
│   ├── features/                    # per-feature docs (moved from src/pages/, src/features/slate/)
│   │   ├── slate.md
│   │   ├── notifications.md
│   │   ├── feature-flags.md
│   │   ├── error-reporting.md
│   │   ├── mobile-editor.md
│   │   └── *.md
│   ├── server/                      # server-side docs (moved from server/routes/, server/lib/)
│   │   ├── routes.md
│   │   ├── outreach-scraper.md
│   │   └── *.md
│   └── design-system/               # design system docs (moved from src/pages/designSystem/)
│       ├── overview.md
│       ├── tokens.md
│       └── *.md
│
├── public/                          # static assets (unchanged)
│
├── shared/                          # code shared between client and server (unchanged)
│
├── scripts/                         # build and migration scripts (unchanged)
│
├── server/                          # Node/Express backend — NO markdown files live here
│   ├── index.js
│   ├── config/
│   ├── db/
│   │   ├── pool.js
│   │   ├── schema.sql
│   │   └── migrate.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── staffAuth.js
│   │   ├── rateLimit.js
│   │   └── bodyBounds.js
│   ├── routes/                      # route files only, no .md files
│   │   ├── auth.js
│   │   ├── plays.js
│   │   ├── folders.js
│   │   ├── teams.js
│   │   ├── users.js
│   │   ├── admin.js
│   │   ├── notifications.js
│   │   ├── onboarding.js
│   │   ├── prefabs.js
│   │   ├── sportPresets.js
│   │   ├── sportPrefabPresets.js
│   │   ├── platformPlays.js
│   │   ├── playbookSections.js
│   │   ├── pageSections.js
│   │   ├── demoVideos.js
│   │   ├── flags.js
│   │   ├── shared.js
│   │   ├── outreach.js
│   │   ├── errorReports.js
│   │   ├── userIssues.js
│   │   ├── staff.js
│   │   └── verification.js
│   ├── lib/
│   │   ├── email.js
│   │   ├── featureFlags.js
│   │   ├── notificationAudience.js
│   │   ├── r2Upload.js
│   │   ├── gifAssetStore.js
│   │   ├── validate.js
│   │   ├── userTeams.js
│   │   ├── signupBlocklist.js
│   │   ├── broadcastEmailTemplate.js
│   │   └── outreachScraper/
│   │       ├── index.js
│   │       ├── csv.js
│   │       ├── http.js
│   │       ├── normalize.js
│   │       └── sidearm.js
│   ├── scripts/
│   └── utils/
│
└── src/
    │
    ├── ui/                          # THE design system — all shared prop-driven components
    │   │                            # one flat folder, no subdirectories to start
    │   ├── index.js                 # barrel export for everything in ui/
    │   │
    │   │  # Layout & Shell
    │   ├── Sidebar.jsx
    │   ├── Header.jsx
    │   ├── PageShell.jsx
    │   │
    │   │  # Primitives
    │   ├── Button.jsx
    │   ├── Input.jsx
    │   ├── Textarea.jsx
    │   ├── Select.jsx
    │   ├── Checkbox.jsx
    │   ├── Toggle.jsx
    │   ├── RadioGroup.jsx
    │   │
    │   │  # Feedback
    │   ├── Toast.jsx
    │   ├── Modal.jsx
    │   ├── Spinner.jsx
    │   ├── Skeleton.jsx
    │   ├── EmptyState.jsx
    │   ├── Alert.jsx
    │   │
    │   │  # Display
    │   ├── Card.jsx
    │   ├── Badge.jsx
    │   ├── Avatar.jsx
    │   ├── Chip.jsx
    │   ├── Tooltip.jsx
    │   │
    │   │  # Navigation
    │   ├── Tabs.jsx
    │   ├── Breadcrumbs.jsx
    │   ├── Pagination.jsx
    │   │
    │   │  # Data
    │   ├── DataTable.jsx
    │   ├── StatCard.jsx
    │   ├── ListItem.jsx
    │   │
    │   │  # Domain-specific shared components
    │   ├── PlayCard.jsx             # used in app, admin, platform plays
    │   ├── FolderCard.jsx
    │   ├── NotificationItem.jsx
    │   ├── IntakeForm.jsx
    │   └── DangerZone.jsx
    │
    ├── slate/                       # THE core product — play editor, sacrosanct
    │   │                            # nothing outside this folder should reach into it
    │   ├── Slate.jsx                # root editor component
    │   ├── SlateDrawing.jsx
    │   ├── SlateRecord.jsx
    │   │
    │   ├── canvas/                  # Konva canvas layer (moved from src/canvas/)
    │   │   ├── KonvaCanvasRoot.jsx
    │   │   ├── BoardViewport.jsx
    │   │   ├── MultiSelectActionPopup.jsx
    │   │   ├── PlayerActionPopup.jsx
    │   │   ├── drawingGeometry.js
    │   │   ├── drawingScopeConfig.js
    │   │   ├── touchGestures.js
    │   │   └── hooks/
    │   │       ├── useCanvasDrawing.js
    │   │       ├── useCanvasMarquee.js
    │   │       ├── useCanvasPan.js
    │   │       ├── useCanvasSize.js
    │   │       ├── useCanvasSnapping.js
    │   │       └── useDrawingSelection.js
    │   │
    │   ├── animation/               # animation engine (moved from src/animation/)
    │   │   ├── engine.js
    │   │   ├── interpolate.js
    │   │   ├── schema.js
    │   │   ├── serialize.js
    │   │   └── index.js
    │   │
    │   ├── hooks/                   # slate-level hooks
    │   │   ├── useSlateEntities.js
    │   │   ├── useSlateHistory.js
    │   │   ├── useSlateActionLog.js
    │   │   ├── useAdvancedSettings.js
    │   │   ├── useDrawings.js
    │   │   ├── useFieldViewport.js
    │   │   └── useRecordingMode.js
    │   │
    │   └── utils/
    │       ├── drawingSchema.js
    │       └── drawingTiming.js
    │
    ├── app/                         # user-facing app (authenticated coach/player experience)
    │   ├── pages/
    │   │   ├── Playbooks.jsx
    │   │   ├── Plays.jsx
    │   │   ├── PlayEdit.jsx
    │   │   ├── PlayNew.jsx
    │   │   ├── PlayView.jsx
    │   │   ├── Settings.jsx
    │   │   ├── Profile.jsx
    │   │   ├── ProfileEmailVerification.jsx
    │   │   ├── Team.jsx
    │   │   ├── Notifications.jsx
    │   │   ├── DemoVideos.jsx
    │   │   ├── ReportIssue.jsx
    │   │   └── NoTeam.jsx
    │   └── layouts/
    │       └── AppShell.jsx
    │
    ├── admin/                       # internal staff admin dashboard
    │   │                            # consolidates current src/admin/ + src/pages/Admin*.jsx
    │   ├── pages/
    │   │   ├── AdminDashboard.jsx
    │   │   ├── AdminUsers.jsx
    │   │   ├── AdminPlays.jsx
    │   │   ├── AdminPlaybooks.jsx
    │   │   ├── AdminNotifications.jsx
    │   │   ├── AdminFeatureFlags.jsx
    │   │   ├── AdminErrors.jsx
    │   │   ├── AdminEmail.jsx
    │   │   ├── AdminRecurringEmail.jsx
    │   │   ├── AdminDemoVideos.jsx
    │   │   ├── AdminSportPresets.jsx
    │   │   ├── AdminSportPrefabPresets.jsx
    │   │   ├── AdminPrefabPresetEdit.jsx
    │   │   ├── AdminPresetEdit.jsx
    │   │   ├── AdminPlayEdit.jsx
    │   │   ├── AdminOutreachScraper.jsx
    │   │   ├── AdminUserActivity.jsx
    │   │   ├── AdminUserIssues.jsx
    │   │   ├── AdminStaff.jsx
    │   │   ├── AdminMobileView.jsx
    │   │   ├── AdminGIFTest.jsx
    │   │   ├── AdminTestSlate.jsx
    │   │   └── AdminTests.jsx
    │   ├── analytics/
    │   │   ├── AnalyticsDashboard.jsx
    │   │   ├── ActivityFeed.jsx
    │   │   ├── KpiCard.jsx
    │   │   ├── KpiStrip.jsx
    │   │   ├── OnboardingFunnel.jsx
    │   │   ├── PlayActivityChart.jsx
    │   │   ├── SportMixChart.jsx
    │   │   ├── UserGrowthChart.jsx
    │   │   └── useDashboardAnalytics.js
    │   ├── context/
    │   │   └── AdminContext.jsx
    │   ├── guards/
    │   │   ├── AdminFlagGate.jsx
    │   │   └── RequirePerm.jsx
    │   └── hooks/
    │       └── useDangerMode.js
    │
    ├── auth/                        # login, signup, password flows
    │   ├── Login.jsx
    │   ├── Signup.jsx
    │   ├── ForgotPassword.jsx
    │   ├── ResetPassword.jsx
    │   ├── VerifyEmail.jsx
    │   ├── Onboarding.jsx
    │   └── SportPickerPage.jsx
    │
    ├── marketing/                   # public-facing pages (unauthenticated)
    │   ├── Landing.jsx
    │   ├── Enterprise.jsx
    │   ├── Resources.jsx
    │   ├── PublicPlaybooks.jsx
    │   └── MaintenancePage.jsx
    │
    ├── shared-pages/                # public view/share pages (no auth required)
    │   ├── SharedPlay.jsx
    │   ├── SharedPlayView.jsx
    │   ├── SharedFolder.jsx
    │   └── PlatformPlayView.jsx
    │
    ├── staff/                       # staff-facing pages (separate from admin)
    │   ├── StaffLogin.jsx
    │   ├── StaffDashboard.jsx
    │   └── StaffAcceptInvite.jsx
    │
    ├── context/                     # global React contexts
    │   ├── AuthContext.jsx
    │   ├── AppMessageContext.jsx
    │   ├── FeatureFlagContext.jsx
    │   └── NotificationsContext.jsx
    │
    ├── utils/                       # shared client utilities, grouped by concern
    │   ├── api/
    │   │   ├── api.js               # base fetch wrapper
    │   │   ├── playsApi.js
    │   │   ├── foldersApi.js
    │   │   ├── prefabsApi.js
    │   │   ├── notificationsApi.js
    │   │   ├── playbookSectionsApi.js
    │   │   └── sportPrefabPresets.js
    │   ├── storage/
    │   │   ├── appPlaysStorage.js
    │   │   └── playbookStorage.js
    │   ├── export/
    │   │   ├── exportPlay.js
    │   │   ├── importPlay.js
    │   │   ├── gifEncoder.js
    │   │   └── videoEncoder.js
    │   └── misc/
    │       ├── inputValidation.js
    │       ├── dataContracts.js
    │       ├── errorReporter.js
    │       ├── mobileViewport.js
    │       ├── rotatePoint.js
    │       ├── smoothTrack.js
    │       ├── stepColor.js
    │       ├── sportSeo.js
    │       ├── usePageMeta.js
    │       └── useThemeColor.js
    │
    ├── assets/                      # static assets (unchanged)
    │
    ├── App.jsx
    └── main.jsx
```

---

## Key decisions and why

**`src/ui/` is the design system.** One flat folder. All shared components in one place with a barrel export (`index.js`). No `src/admin/components/` and no separate design system page — those admin-prefixed components (AdminBtn, AdminModal, etc.) get replaced by the shared ones. The rule: if two surfaces (app, admin, staff) both need a Button, it lives in `src/ui/`. AI tools, future contributors, and you can always find a component by looking in exactly one place.

**`src/slate/` is the core product and is treated as a boundary.** The play editor, canvas, and animation engine are currently split across `src/features/slate/`, `src/canvas/`, and `src/animation/`. In v2 they live together under `src/slate/`. Nothing outside this folder should import internal slate modules directly — the slate exposes what it exposes and that's it. This makes the core safe to refactor without rippling changes everywhere.

**`server/` has no markdown files.** Documentation about server routes and features belongs in `docs/server/`. The routes folder should be unambiguous: `.js` files only, one per resource.

**`docs/` is the single source of all steering documents.** Every `.md` file that currently lives scattered in `src/pages/`, `src/features/slate/`, `server/routes/`, and `server/lib/` moves here. `CLAUDE.md` at the root becomes an index: it tells AI tools where to find things, not a document itself. `docs/INDEX.md` lists all docs with one-line descriptions so any AI context window can orient itself in one file.

**Admin is consolidated.** Currently split between `src/admin/` (context, hooks, component library) and `src/pages/Admin*.jsx` (15+ page files). In v2, `src/admin/` holds everything related to the internal admin dashboard.

**Auth, marketing, shared-pages, and staff are separated.** Currently all mixed into `src/pages/` alongside app pages. In v2 they each have their own folder — this makes routing setup obvious and avoids the "what belongs in pages/" question that caused the current mess.

**`src/utils/` is grouped by concern.** Currently 20+ flat files. In v2 they're grouped into `api/`, `storage/`, `export/`, and `misc/`. This is the minimum organization needed — not over-engineered, just enough that you know where to look.

**Test files co-locate inside a `tests/` subfolder.** Every page directory (`src/app/pages/`, `src/admin/pages/`, `src/auth/`) contains a `tests/` folder alongside the page files, not at the repo root and not mirrored in a separate tree. See `ui-testing-standards.md` for the full convention: simple pages get `tests/page-name.test.js`; complex pages get `tests/page-name.function/roles.test.js` and optionally `flow.test.js`. Shared test infrastructure (renderAs, assertions, fixtures) lives in `src/tests/`.

```
src/app/pages/
  Plays.jsx
  tests/
    plays.browse/
      roles.test.js
      flow.test.js
    plays.folders/
      roles.test.js
      flow.test.js
    plays.search/
      roles.test.js

src/tests/
  renderAs.js
  assertions.js
  fixtures/
    role1.js
    role2.js
    admin.js
```

---

## Testing structure

Role-based UI tests live co-located with the pages they test, inside a `tests/` subfolder. Shared test infrastructure lives in `src/tests/`.

**Simple page — one file:**
```
src/app/pages/
  Notifications.jsx
  tests/
    notifications.test.js
```

**Complex page — folder per distinct user-facing function:**
```
src/app/pages/
  Plays.jsx
  tests/
    plays.browse/
      roles.test.js     ← visibility assertions (always present)
      flow.test.js      ← multi-step flows (only when needed)
    plays.folders/
      roles.test.js
      flow.test.js
    plays.search/
      roles.test.js     ← no flow needed
```

**Promotion rule:** Start with a `roles.test.js` file. Promote to a folder and add `flow.test.js` only when there is a user flow to test for that section.

**Shared infrastructure:**
```
src/tests/
  renderAs.js           ← role-based render helper
  assertions.js         ← assertVisible / assertHidden
  fixtures/
    coach.js
    player.js
    admin.js
```

Full standard — see `ui-testing-standards.md` in this folder.

## Server testing structure

Server tests live in `server/tests/`, mirroring the server directory structure. Simple route files get one test file. Complex route files with multiple role-gated endpoints get a subfolder with one file per endpoint.

```
server/
  tests/
    helpers/
      requestAs.js      ← identity helper (seeds user + team, returns authed Supertest agent)
      seed.js           ← data factory: seed.play(), seed.folder(), seed.team()
      assertions.js     ← expectOk, expectCreated, expectForbidden, expectUnauthorized, etc.

    middleware/
      auth.test.js
      rateLimit.test.js
      bodyBounds.test.js

    routes/
      auth.test.js          ← simple — no team role branching
      verification.test.js
      shared.test.js

      plays/                ← complex — role branches on every endpoint
        plays.list.test.js
        plays.create.test.js
        plays.update.test.js
        plays.delete.test.js

      teams/
        teams.create.test.js
        teams.join.test.js
        teams.members.test.js
        teams.settings.test.js
```

**Isolation rule:** `beforeAll` truncates relevant tables once per file. `requestAs` seeds a fresh user + team per test. Tests never share identity state.

Full standard — see `server-testing-standards.md` in this folder.

---

## What this does not change

- The server's actual route structure, DB schema, and middleware are fine — just removing the scattered markdown
- `shared/` stays as-is
- `scripts/` stays as-is
- `public/` stays as-is
- `src/assets/` stays as-is
- `src/context/` stays as-is
- `src/App.jsx` routing wires up the new folder structure but is otherwise the same

---

## Open questions for review

1. Should `src/ui/` stay completely flat or is there one level of grouping that makes sense (e.g., `ui/primitives/`, `ui/layout/`, `ui/domain/`)? Flat is fastest for iteration with AI.
2. Should `src/slate/` also contain the editor toolbar/pill components (DrawToolsPill, AnimationDrawingTools, AdvancedSettings) or do those live in `src/ui/`? My instinct: if they are slate-only they stay in `src/slate/`, if they could be reused they go to `src/ui/`.
3. `misc/` under `src/utils/` is still a catch-all. Worth splitting out further or leave it?
4. Should the design system viewer (currently `src/pages/designSystem/`) move to `src/admin/` or become a standalone dev route? It's an internal tool, not a user-facing page.
