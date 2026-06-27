# Docs Index

This is the master map of every document in `docs/`. One line per doc. Grouped by domain.

---

## Repo Root

- [CLAUDE.md](CLAUDE.md) — AI navigation index; read first in every new session to understand where every domain of the codebase lives (lives at repo root, not inside `docs/`)

---

## Design

- [general-formatting-standards.md](design/general-formatting-standards.md) — authoritative shared rules: spacing grid, type scale, contrast, borders, radius, shadow, rhythm, focus, motion
- [color-semantics.md](design/color-semantics.md) — `--ui-*` CSS token reference for all app and admin surfaces; dark/light mode overrides
- [accessibility-standards.md](design/accessibility-standards.md) — semantic HTML, keyboard behavior, focus management, ARIA, form a11y, SPA nav announcements, testing checklist
- [component-specs.md](design/component-specs.md) — prop conventions and component APIs for all `src/ui/` components: Button, Input, Modal, Toast, display, and layout specs
- [pages/plays-page.md](design/pages/plays-page.md) — plays page: layout toggle, folder section, search, tag filter, sort, bulk ops, drag-to-folder, empty states, and role differences
- [player-view-mode.md](design/player-view-mode.md) — what playerViewMode hides, toggle placement, persistent indicator spec, and persistence behavior
- [public-pages.md](design/public-pages.md) — SharedPlay, SharedFolder, and PlatformPlayView: layout, CTA placement, expired-link handling, and viewer mode
- [desktop/desktop-formatting-standards.md](design/desktop/desktop-formatting-standards.md) — desktop-exclusive: breakpoints, sidebar layout, hover states, cursor, dialogs, panels, data density, tooltips
- [mobile/mobile-formatting-standards.md](design/mobile/mobile-formatting-standards.md) — mobile-exclusive: 48px touch targets, single column, 16px margin, bottom nav, bottom sheets
- [slate/slate-ux-standards.md](design/slate/slate-ux-standards.md) — editor UX decisions: tool state machine, field orientation, keyframe capture scope, undo/redo, and mobile gesture model

---

## Engineering — Standards

- [engineering/frontend-code-standards.md](engineering/frontend-code-standards.md) — React file anatomy, TypeScript rules, naming, component patterns, exports, testing, role gating, error display
- [engineering/backend-code-standards.md](engineering/backend-code-standards.md) — Node.js file anatomy, naming, async/await, route handler patterns, SQL, error handling, logging
- [engineering/database.md](engineering/database.md) — migration system, schema table reference, backup strategy, and index decisions

---

## Engineering — Planning

- [engineering/planning/architecture/proposed-file-structure.md](engineering/planning/architecture/proposed-file-structure.md) — target `src/` and `server/` layout for v2; key decisions and why
- [engineering/planning/infrastructure/security-and-code-quality.md](engineering/planning/infrastructure/security-and-code-quality.md) — CI pipeline, pre-push hooks, Snyk, Dependabot, secret scanning, CodeRabbit
- [engineering/planning/infrastructure/environment.md](engineering/planning/infrastructure/environment.md) — every env var the v2 server uses, which environment it belongs to, and how to rotate it
- [engineering/planning/infrastructure/railway-setup.md](engineering/planning/infrastructure/railway-setup.md) — Railway configuration decisions for both v2 services; setup steps and service wiring
- [engineering/planning/infrastructure/ops-setup.md](engineering/planning/infrastructure/ops-setup.md) — error monitoring, structured logging, health check, and uptime monitoring decisions
- [engineering/planning/api-standards.md](engineering/planning/api-standards.md) — client-side API conventions: `apiFetch` wrapper, function naming, error handling, optimistic updates, auth expiry
- [engineering/planning/routing.md](engineering/planning/routing.md) — full v2 route tree: public vs auth-gated, guards, `returnTo` behavior, lazy imports, active team resolution
- [engineering/planning/state-management.md](engineering/planning/state-management.md) — React Query for server state, Context for shared client state; reference patterns for each category
- [engineering/planning/permissions.md](engineering/planning/permissions.md) — role permission matrix, `assistantPermissions` overrides, `playerViewMode`, and `usePermissions()` hook contract
- [engineering/planning/feature-flags.md](engineering/planning/feature-flags.md) — flag loading pattern, developer convention for marking flagged code, admin management, and all current flag keys
- [engineering/planning/testing/ui-testing-standards.md](engineering/planning/testing/ui-testing-standards.md) — role-based UI test patterns, co-location convention, `renderAs` helper, selector rules
- [engineering/planning/testing/server-testing-standards.md](engineering/planning/testing/server-testing-standards.md) — integration test patterns, `requestAs` helper, `seed` factory, isolation rules
- [engineering/planning/testing/test-suite-plan.md](engineering/planning/testing/test-suite-plan.md) — full inventory of what needs testing; migration plan from manual to automated
- [engineering/planning/features/mobile-slate-plan.md](engineering/planning/features/mobile-slate-plan.md) — wiring plan for full mobile editing experience for end users (currently view-only)
- [engineering/planning/features/notification-delivery.md](engineering/planning/features/notification-delivery.md) — notification approach (polling vs SSE), interval, priority handling, and email delivery decisions
- [engineering/planning/features/media-lifecycle.md](engineering/planning/features/media-lifecycle.md) — GIF and video export TTL, size limits, R2 cleanup approach, and storage cost baseline
- [engineering/planning/features/seo-plan.md](engineering/planning/features/seo-plan.md) — OG tags, sitemap, and social crawler support for SharedPlay, SharedFolder, and PlatformPlayView

---

## Engineering — Audits (historical reference)

- [engineering/audits/api-review.md](engineering/audits/api-review.md) — v1 server API review; schema and route recommendations carried into v2
- [engineering/audits/query-performance.md](engineering/audits/query-performance.md) — critical v1 query patterns, index coverage analysis, and v2 index decisions
- [engineering/audits/security-hardening.md](engineering/audits/security-hardening.md) — all security gaps found in v1 server and frontend, with specified fixes for v2
- [engineering/audits/email-deliverability.md](engineering/audits/email-deliverability.md) — Resend DNS configuration, inbox placement results, and compliance findings
- [engineering/audits/design-system-unification-attempt.md](engineering/audits/design-system-unification-attempt.md) — analysis of the failed `design-system-unification` branch; what was learned
- [engineering/audits/performance-baseline.md](engineering/audits/performance-baseline.md) — v1 bundle reference, MUI removal gap analysis, and v2 baseline targets (TODO 4.5 + 7.1)
- [engineering/audits/landing-performance-diagnosis.md](engineering/audits/landing-performance-diagnosis.md) — landing page performance root cause analysis
- [engineering/audits/routing-and-flash-diagnosis.md](engineering/audits/routing-and-flash-diagnosis.md) — routing and page flash diagnosis on the v1 `main` branch

---

## Platform

- [billing.md](billing.md) — Stripe wiring, tier model, feature gating plan, and deferred-monetization decision for v2

---

## v2 Planning

- [v2/v2.md](v2/v2.md) — v2 rebuild overview: philosophy, what carries over from v1, approach to standards-first execution
