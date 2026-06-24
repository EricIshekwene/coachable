# Docs Index

This is the master map of every document in `docs/`. One line per doc. Grouped by domain.

---

## Design

- [general-formatting-standards.md](design/general-formatting-standards.md) — authoritative shared rules: spacing grid, type scale, contrast, borders, radius, shadow, rhythm, focus, motion
- [color-semantics.md](design/color-semantics.md) — `--ui-*` CSS token reference for all app and admin surfaces; dark/light mode overrides
- [accessibility-standards.md](design/accessibility-standards.md) — semantic HTML, keyboard behavior, focus management, ARIA, form a11y, SPA nav announcements, testing checklist
- [desktop/desktop-formatting-standards.md](design/desktop/desktop-formatting-standards.md) — desktop-exclusive: breakpoints, sidebar layout, hover states, cursor, dialogs, panels, data density, tooltips
- [mobile/mobile-formatting-standards.md](design/mobile/mobile-formatting-standards.md) — mobile-exclusive: 48px touch targets, single column, 16px margin, bottom nav, bottom sheets

---

## Engineering — Standards

- [engineering/frontend-code-standards.md](engineering/frontend-code-standards.md) — React file anatomy, TypeScript rules, naming, component patterns, exports, testing, role gating, error display
- [engineering/backend-code-standards.md](engineering/backend-code-standards.md) — Node.js file anatomy, naming, async/await, route handler patterns, SQL, error handling, logging

---

## Engineering — Planning

- [engineering/planning/architecture/proposed-file-structure.md](engineering/planning/architecture/proposed-file-structure.md) — target `src/` and `server/` layout for v2; key decisions and why
- [engineering/planning/infrastructure/security-and-code-quality.md](engineering/planning/infrastructure/security-and-code-quality.md) — CI pipeline, pre-push hooks, Snyk, Dependabot, secret scanning, CodeRabbit
- [engineering/planning/testing/ui-testing-standards.md](engineering/planning/testing/ui-testing-standards.md) — role-based UI test patterns, co-location convention, `renderAs` helper, selector rules
- [engineering/planning/testing/server-testing-standards.md](engineering/planning/testing/server-testing-standards.md) — integration test patterns, `requestAs` helper, `seed` factory, isolation rules
- [engineering/planning/testing/test-suite-plan.md](engineering/planning/testing/test-suite-plan.md) — full inventory of what needs testing; migration plan from manual to automated
- [engineering/planning/features/mobile-slate-plan.md](engineering/planning/features/mobile-slate-plan.md) — wiring plan for full mobile editing experience for end users (currently view-only)

---

## Engineering — Audits (historical reference)

- [engineering/audits/api-review.md](engineering/audits/api-review.md) — v1 server API review; schema and route recommendations carried into v2
- [engineering/audits/design-system-unification-attempt.md](engineering/audits/design-system-unification-attempt.md) — analysis of the failed `design-system-unification` branch; what was learned
- [engineering/audits/performance-baseline.md](engineering/audits/performance-baseline.md) — v1 bundle reference, MUI removal gap analysis, and v2 baseline targets (TODO 4.5 + 7.1)
- [engineering/audits/landing-performance-diagnosis.md](engineering/audits/landing-performance-diagnosis.md) — landing page performance root cause analysis
- [engineering/audits/routing-and-flash-diagnosis.md](engineering/audits/routing-and-flash-diagnosis.md) — routing and page flash diagnosis on the v1 `main` branch

---

## v2 Planning

- [v2/v2.md](v2/v2.md) — v2 rebuild overview: philosophy, what carries over from v1, approach to standards-first execution
