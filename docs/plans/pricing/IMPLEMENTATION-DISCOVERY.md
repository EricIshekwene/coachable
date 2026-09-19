# Pricing / Billing Implementation Discovery

**Status:** Discovery only — no implementation performed  
**Repository inspected:** EricIshekwene/coachable  
**Remote ref inspected:** main  
**Remote HEAD observed during discovery:** 4bca4bef366bbc782015815dff985e9b4159d641 ("Merge session: v1 migrated island admission 2026-09-15")  
**Discovery date:** 2026-09-19  
**Target business model:** the locked team-anchored pricing model supplied in the discovery request

> Important repository-state warning: the GitHub-connected repository does not contain docs/plans/pricing/PRICING-STRATEGY-FINAL.md, server/db/migrations/011_team_premium_features.sql, src/App.tsx, src/AppRoutes.tsx, appShellConfig, searchItems.ts, or the completed renderAs/requestAs helper infrastructure described in the request. I checked main and the accessible branches. The remote main tree is a live V1/cutover tree with v2 planning material under v2/, not the exact local C:\Users\ericl\coachable\v2 state named in the task. This report therefore distinguishes (a) source-verified findings from the connected GitHub main branch, (b) v2 planning-doc intent, and (c) requested-but-not-verifiable v2 artifacts. Before implementation, the actual v2 implementation branch/local state must be pushed or otherwise made available and this discovery delta rechecked.

The canonical pricing file could not be read because it is not present on the connected remote. The pricing rules below are therefore taken only from the locked model in the discovery request. I did not substitute the older v2/billing.md strategy because that document materially conflicts with the locked model.

---

# 1. Executive summary

## What already exists

Coachable already has several primitives that are useful for a team-anchored billing system:

1. **Teams are first-class records and users may belong to multiple teams.** The live schema has teams plus team_memberships with roles owner, coach, assistant_coach, player. Membership is many-to-many and AuthContext keeps an allTeams list. Source: server/db/schema.sql:L104-L138; server/lib/userTeams.js:L51-L73; src/context/AuthContext.jsx:L76-L82.

2. **There is a working per-team entitlement mechanism.** The accessible repo uses team_suite_features, not the requested team_premium_features migration. It stores one row per team + feature and is enforced by requireSuiteFeature on server routes and RequireSuiteFeature / SuiteContext on the client. Source: server/db/schema.sql:L1011-L1025; server/routes/suite.js:L45-L67 and L102-L127; src/context/SuiteContext.jsx:L2-L11 and L28-L50; src/App.jsx:L358-L372 and L507-L511.

3. **Assignments and per-member assignment progress already exist.** Assignment CRUD, view tracking, mastery status, and progress retrieval are server-authoritative behind the assignments team entitlement. Source: server/db/schema.sql:L1122-L1134 and L1169-L1180; server/routes/suite.js:L1113-L1155 and L1569-L1601; src/pages/app/suite/AssignmentsPage.jsx:L5-L13.

4. **There is already an internal admin override pattern.** /admin/team-suite can inspect and toggle team entitlements, protected by owner/legacy-admin authorization. This is a useful operational precedent for billing support overrides, although raw feature toggles should not become the paid plan source of truth. Source: docs/team-suite.md:L30-L38; src/App.jsx:L448-L450.

5. **Public sharing, multi-team switching, roster profiles, and multiple coach roles already exist.** These reduce some product work, but none is currently tied to pricing tiers. Source: src/components/TeamSwitcher.jsx:L36-L53 and L240-L258; server/routes/shared.js:L8-L20; server/routes/suite.js:L1428-L1473.

## What is greenfield

The actual billing system is essentially greenfield in the connected code:

- No Stripe package exists in server/package.json. Source: server/package.json:L11-L22.
- No Stripe customer ID, subscription ID, plan/tier, billing-account, or organization billing columns exist in the live users/teams schema. Source: server/db/schema.sql:L26-L35 and L104-L138.
- No Stripe routes or webhook route are mounted in server/index.js. Source: server/index.js:L104-L131.
- Repo-wide source searches for stripe_customer, customer_id, subscription_id, checkout.session, customer.subscription and billingData found no implementation. The only substantive Stripe references are planning docs such as v2/billing.md.
- There is no organization/club entity joining multiple teams.
- There is no true team-owned playbooks table in the live schema.
- There is no play-attached film/video product model.
- There is no user-facing organization analytics.
- There is no roster CSV/bulk import feature.

The old v2/billing.md plan is not an implementation. It proposes user-level Stripe customers, users.tier, monthly-only subscriptions and Free/Pro/Team/Org tiers, which conflicts directly with the locked team-anchored Coach/Program/Organization model. Source: v2/billing.md:L7-L16, L63-L76, L87-L104.

## The 5 biggest risks

### Risk 1 — The GitHub remote is not the exact v2 implementation state named by the task

The requested PRICING-STRATEGY-FINAL.md and 011_team_premium_features.sql are absent, as are the requested v2 route/config filenames. v2 planning docs describe a future architecture that is not fully instantiated in the connected tree. Any build plan generated without reconciling this delta can target the wrong tables/routes.

**Consequence:** implementation should not begin until the actual v2 branch/source is available and this report is diff-checked against it.

### Risk 2 — “Playbook” has no billable object in current source

Current team data is plays + play_folders. The /app/playbooks page is a browsable library of global/admin-curated playbook_sections; playbook_sections has no team_id. Source: server/db/schema.sql:L269-L298 and L561-L571; src/App.jsx:L504-L505.

Therefore “Free = 1 playbook; Pro = unlimited playbooks” cannot be enforced correctly without first defining what a customer-owned playbook is.

### Risk 3 — Usage limits have many server bypass paths

A 15-play limit cannot be placed only in POST /teams/:teamId/plays. Plays are also created by duplication, public shared-play copy, public shared-folder bulk copy, platform-play copy, playbook-section copy, restore-from-trash, onboarding/demo seeding, and potentially future imports. Source examples: server/routes/plays.js:L523-L539; server/routes/shared.js:L89-L104 and L215-L250; server/routes/platformPlays.js:L165-L178; server/routes/playbookSections.js:L155-L210; server/lib/userTeams.js:L13-L30.

The same is true for player limits: real users enter through membership join flows while unlisted roster players enter suite_players directly.

**Consequence:** limits need centralized server-side entitlement/usage helpers and transactional checks, with client guards only for UX.

### Risk 4 — Club is a new ownership domain, not merely a higher team tier

The app supports users being members of many teams, but there is no organization object linking teams under one commercial owner. Club requires one subscription to unlock up to five teams, coach-seat policy, cross-team sharing and org analytics. That needs a new data model and entitlement resolution rule, not just a Stripe price.

### Risk 5 — Downgrade, grandfathering, and subscription-state semantics are product behavior

The strategy gives prices and headline entitlements but the repository does not answer what happens to excess data, payment failures, existing production teams, old Team Suite overrides, or Founding Coach lock expiration. These decisions determine schema and webhook behavior. They must be fixed before migrations are written.

---

# 2. Current-state map

## 2.1 Team and membership model

### Roles

The live database role enum is exactly:

- owner
- coach
- assistant_coach
- player

Source: server/db/schema.sql:L6-L10.

### Team record

A team currently contains id, name, sport, season_year and owner_user_id. A later safe migration adds is_personal for solo workspaces. Source: server/db/schema.sql:L94-L112.

This means the connected live code has **two representations of ownership**:

1. teams.owner_user_id
2. team_memberships.role = 'owner'

Ownership transfer updates both in one transaction. Source: server/routes/teams.js:L505-L519.

The v2 database planning document explicitly says v2 intends to remove teams.owner_user_id and make team_memberships the sole authority for owner role. Source: v2/engineering/database.md:L173-L188.

**Billing implication:** do not build long-lived billing foreign keys around owner_user_id unless the actual v2 schema still retains it. The commercial owner should be resolved from the v2 membership/source-of-truth model.

### Many-to-many team membership

team_memberships has team_id, user_id, role, joined_at and UNIQUE(team_id,user_id). Source: server/db/schema.sql:L131-L138.

getUserTeams returns every membership for a user and includes team owner, sport, personal-team status and the user's role. AuthContext stores allTeams and supports switching teams. Source: server/lib/userTeams.js:L51-L73; src/context/AuthContext.jsx:L76-L82.

**Answer:** yes, one user can belong to multiple teams today.

### Creating teams

POST /teams/create inserts a new team, team settings, and an owner membership with no count/plan check. Source: server/routes/teams.js:L89-L110.

The UI exposes Create a Team and Create Personal Workspace in TeamSwitcher without a tier check. Source: src/components/TeamSwitcher.jsx:L240-L258. AuthContext directly calls POST /teams/create. Source: src/context/AuthContext.jsx:L312-L326.

**Current enforcement:** no Free 1-team or Club 5-team cap exists.

### Personal workspaces

Personal workspaces are stored as teams with is_personal = true. Source: server/db/schema.sql:L94-L98. POST /teams/create-personal can create additional personal workspaces; TeamSwitcher exposes that action. Source: server/routes/teams.js:L146-L168; src/components/TeamSwitcher.jsx:L251-L258.

**Billing implication:** the pricing strategy must define whether a personal workspace consumes a team slot. If it does not, it is a straightforward team-limit bypass.

### Joining teams / player and coach membership

Memberships can be created through invite-code joins. The onboarding join route resolves the role from the code and inserts team_memberships directly. Source: server/routes/onboarding.js:L154-L172. The post-onboarding join route does the equivalent.

Email invite creation supports player or coach and currently sends/uses standing team codes rather than a completed one-time invite acceptance lifecycle. Source: server/routes/teams.js:L535-L556; v2/engineering/database.md notes the v1 token was not wired.

**Current enforcement:** there is no player-count or coach-seat-count check in the membership insertion seam.

### Organization / club concept

No organization_id, org_id, club_id, organization_teams or comparable commercial grouping appears in the live schema/source. Existing multi-team behavior is user membership, not organization ownership.

**Answer:** Club/Organization spanning teams is net-new.

---

## 2.2 Existing entitlement plumbing

### Connected-source reality versus requested migration

The requested server/db/migrations/011_team_premium_features.sql is not present in GitHub main or any accessible branch. Repo-wide searches also find no team_premium_features symbol.

The actual live equivalent is team_suite_features:

- team_id FK
- feature text
- enabled boolean
- one row per team + feature
- current live CHECK includes roster, practice_plans, install_calendar, game_plans, assignments, printing

Source: server/db/schema.sql:L1011-L1025.

The docs describe the same system, although the doc predates the printing addition. Source: docs/team-suite.md:L14-L38.

This differs materially from the requested “5 booleans: roster/schedule/game_plans/printing/analytics” shape. In particular:

- current live code uses row-per-feature, not five boolean columns;
- current live keys split schedule into practice_plans and install_calendar;
- current live code includes assignments;
- current live code does not include analytics as a team_suite_features key.

### Where team_suite_features is enforced

Server:
- requireSuiteFeature(feature) reads team_suite_features by team_id and returns 403 when missing/disabled. Source: server/routes/suite.js:L45-L67.
- GET /teams/:teamId/suite/features returns a resolved boolean map. Source: server/routes/suite.js:L102-L127.
- Roster routes are server-gated by requireSuiteFeature("roster"). Source: server/routes/suite.js:L137-L142 and L164-L170.
- Assignment routes are server-gated by requireSuiteFeature("assignments"). Source: server/routes/suite.js:L1116-L1121 and L1150-L1155.

Client:
- SuiteContext fetches /teams/:teamId/suite/features on team switch and fails closed. Source: src/context/SuiteContext.jsx:L2-L11 and L28-L50.
- RequireSuiteFeature redirects when the current team lacks a feature. Source: src/App.jsx:L358-L372.
- Suite routes are wrapped in RequireSuiteFeature. Source: src/App.jsx:L507-L511.
- AppLayout hides suite navigation using the same feature map. Source: src/layouts/AppLayout.jsx:L44-L50.

Admin:
- team-suite admin endpoints inspect/upsert per-team feature rows; docs state they are protected by requireOwnerOrLegacyAdmin. Source: docs/team-suite.md:L30-L38.

### Global feature flags are a different mechanism

Feature flags are user rollout/operational controls:

- FeatureFlagContext fetches /flags/me once after login and exposes useFlag. Source: src/context/FeatureFlagContext.jsx:L3-L9 and L24-L43.
- GET /flags/me resolves flags for the authenticated user. Source: server/routes/flags.js:L25-L42.
- resolveFlags builds user context from roles and sports across the user's memberships, plus user type/geolocation/rollout rules. Source: server/lib/featureFlags.js:L41-L57 and L124-L141.
- The planning doc explicitly treats flags as temporary rollout controls. Source: v2/engineering/planning/feature-flags.md:L8-L22.

This is not safe as the primary paid entitlement system because the commercial unit is a team while the global flag resolver is user-centric and considers roles/sports across any membership.

### Recommended mechanism

**Build paid gating on a team-scoped billing/entitlement resolver, using the existing Team Suite pattern as the architectural precedent. Do not make feature_flags the paid source of truth.**

Recommended shape conceptually:

- Stripe remains the financial subscription source.
- Local DB stores normalized billing/subscription state and commercial scope.
- A single server entitlement resolver produces capabilities + limits for a team.
- Existing/manual Team Suite toggles become explicit overrides/grants, not the subscription itself.
- Global feature flags remain an orthogonal kill-switch/rollout layer.

Effective access should behave like:

effectiveCapability = commercialEntitlement AND operationalFlag, where an operational flag exists

and usage caps should be enforced through centralized server checks, not flags.

---

## 2.3 Stripe state

### Actual source

No generic Stripe plumbing is implemented in the connected main branch.

Evidence:
- server/package.json has no stripe dependency. Source: server/package.json:L11-L22.
- server/index.js mounts auth, teams, shared, flags, suite, etc., but no billing/Stripe router. Source: server/index.js:L104-L131.
- users and teams contain no Stripe customer/subscription/tier columns. Source: server/db/schema.sql:L26-L35 and L104-L138.
- repo-wide searches found no stripe_customer, customer_id, subscription_id, checkout.session or billingData implementation.

The only significant Stripe design is stale v2/billing.md, which proposes user-level customers and users.tier and is incompatible with the locked team-anchored strategy. Source: v2/billing.md:L63-L76.

### Webhook middleware seam

The current server calls express.json globally at server/index.js:L68 before normal route mounts.

Stripe webhook signature verification requires the raw request body. Therefore a future webhook route cannot simply be added below the current JSON parser and expect Stripe signature verification to work. It needs a deliberately ordered raw-body endpoint (or equivalent isolated parsing) before the JSON body parser for that path.

This is a concrete integration seam/risk, not an implementation performed here.

---

## 2.4 Billing/UI seams

### Old billing page status

The branch feature/billing-page-static is not present in the accessible branch list. On main:

- no billingData file/symbol was found;
- no /billing route was found in source;
- src/App.jsx contains no billing reference;
- no AppRoutes.tsx, appShellConfig, or searchItems.ts exists in the connected main state.

Therefore nothing on connected main appears to reference the deleted billing page implementation.

### Where a new billing surface mounts in connected source

Current routing is centralized in src/App.jsx.

Public/marketing routes sit near /resources, /enterprise, /signup and /login. Source: src/App.jsx:L396-L418. A public pricing/upgrade landing surface would mount in that block.

Authenticated app routes are children of /app + AppLayout. Source: src/App.jsx:L492-L512. An account/team billing page would naturally mount there, e.g. /app/billing, with an owner/billing-role guard.

Authenticated navigation lives in BASE_TEAM_NAV / BASE_SOLO_NAV in AppLayout. Source: src/layouts/AppLayout.jsx:L25-L42.

### Requested v2 seams not verifiable

The requested App.tsx / AppRoutes.tsx / appShellConfig / searchItems.ts seams do not exist on connected main. They must be remapped when the actual v2 implementation branch is available.

---

# 3. Per-capability enforcement table

Effort is relative implementation effort after the missing v2 source is reconciled: S = narrow wiring, M = multiple server/client/data changes, L = meaningful new product/data model.

| Capability | Current state | Exact enforcement point(s) required | Server-authoritative today? | Effort |
|---|---|---|---|---|
| Free: 1 team | Users can create more teams freely. POST /teams/create has no plan check; personal workspaces are also teams. | Server: server/routes/teams.js:L89-L110 and L146-L168; onboarding create path. Client: src/components/TeamSwitcher.jsx:L240-L258; src/context/AuthContext.jsx:L312-L339. Must count billable/owned teams or billing-account links, not all memberships. | Missing | M |
| Club: up to 5 teams | No org exists; users may belong to many teams. | Same create endpoints plus new organization/team-link model. Server must atomically enforce org team count. Client must hide/upgrade the create/add-team actions when at limit. | Missing | L |
| Free: up to 25 players | Real players are team_memberships; roster also allows unlisted suite_players. No count gate. | Membership insertion: server/routes/onboarding.js:L154-L172 and post-onboarding /teams/join. Manual roster player: server/routes/suite.js:L160-L193. Decide whether unlisted roster entries count. Client roster add: src/pages/app/suite/RosterPage.jsx:L303-L315. | Missing | M |
| Pro: unlimited players | No plan resolver exists; effectively unlimited now. | The same centralized player-cap check should return no numeric limit for Pro/Club. | Missing as paid gate | S after entitlement layer |
| Free: 15 saved plays | Main create route inserts with no count gate; multiple alternate insertion paths exist. | Normal create: server/routes/plays.js:L86-L116. Duplicate: L523-L539. Shared copy: server/routes/shared.js:L60-L104. Shared-folder bulk copy: L190-L250. Platform copy: server/routes/platformPlays.js:L140-L178. Playbook-section copy: server/routes/playbookSections.js:L155-L210. Restore: POST /teams/:teamId/plays/:playId/restore. Seed: server/lib/userTeams.js:L13-L30. Must be centralized/transactional. | Missing | M |
| Free play cap — client UX | Plays page only checks role + mobile width. | src/pages/app/Plays.jsx:L52-L53 and L529-L535; src/pages/app/PlayNew.jsx:L290-L301; duplicate/restore handlers at Plays.jsx:L161-L167 and L296-L310; shared/platform/playbook copy buttons also need usage/upgrade handling. | Client limit missing | M |
| Pro: unlimited plays | Effectively unlimited today. | Same central usage helper returns unlimited for Pro/Club. | Missing as paid gate | S after entitlement layer |
| Free: 1 playbook | No team-owned playbook entity exists. plays belong directly to teams and optionally play_folders. /app/playbooks is global curated playbook_sections. | A team-owned playbook model/definition must be chosen before an enforcement point exists. Current related schema: server/db/schema.sql:L269-L298 and L561-L571. | Missing / model absent | L |
| Pro: unlimited playbooks | Same issue: the promised object does not exist as a team-owned resource. | Requires the same playbook model, create endpoint and client create/switch surface. | Missing / model absent | L |
| Free: roster | Roster exists but is currently a manually toggled paid Team Suite feature. | Existing server gate: server/routes/suite.js:L137-L142, L164-L170. Existing client gate: src/App.jsx:L508. New tier resolver must grant roster on Free by default while retaining operational override semantics. | Yes, but wrong entitlement source | S-M |
| Free: player inbox | /app/notifications exists and is gated by global in_app_notifications rollout flag, not a paid tier. | Client route: src/App.jsx:L503; base nav includes Inbox at AppLayout.jsx:L25-L32. Paid resolver should not restrict this capability; global flag can remain a kill switch. | Paid gate not needed | S |
| Free: Coachable-branded shares | Share pages always render Coachable logo. Share responses do not expose a billing entitlement. | Public UI: src/pages/SharedPlay.jsx:L162-L168; src/pages/SharedFolder.jsx:L133-L139. Public API joins source team in server/routes/shared.js:L8-L20 and L118-L127, so it can resolve branding entitlement server-side. | No plan-aware behavior | M |
| Pro: remove Coachable branding | No capability exists. | Same public share API/UI. Decide dynamic entitlement at view time vs snapshot at link creation. Share creation seams: server/routes/plays.js:L646-L667; server/routes/folders.js:L164-L184. | Missing | M |
| Pro: video sections + film attached to plays | No play-attached film/video storage, upload or product surface was found. Existing demo videos and video export are unrelated. plays has play_data/thumbnail/notes but no film field. | New DB/resource/storage API + upload authorization + play editor/view client surfaces. If “video sections” means a different object, strategy must define it. | Missing | L |
| Pro: assignments | Already implemented and server/client gated by per-team Team Suite entitlement. | Server: server/routes/suite.js:L1113-L1155 and all assignment mutation/status endpoints. Client: src/App.jsx:L511; AssignmentsPage creation at src/pages/app/suite/AssignmentsPage.jsx:L112-L125. Replace raw suite toggle as commercial source with plan entitlement. | Yes | S-M |
| Pro: assignment analytics | Assignment progress summary, member status, viewed_at and mastery exist. | Server: server/routes/suite.js:L1113-L1139, L1569-L1601, L1592-L1619; DB: server/db/schema.sql:L1169-L1180. Client AssignmentsPage consumes status/progress. | Yes for assignment tracking | S-M |
| Pro: coach analytics | Only internal staff/admin analytics was found; no clear coach-facing team analytics product surface. The requested team_premium_features.analytics key is absent. | Net-new coach-facing endpoint/page unless actual v2 branch contains it. Must be team-scoped and guarded by Pro entitlement. | Missing | L |
| Pro: onboarding tutorials | Interactive tutorial exists, but auto-launch is deliberately disabled and completion persistence was reverted. No FLAG_ONBOARDING symbol exists on connected main. | src/layouts/AppLayout.jsx:L55-L63; tutorial context/components. Need completion persistence plus Pro entitlement. Decide relationship to /app/videos How To library. | Incomplete / missing paid gate | M |
| Club: multiple coach seats | Data model already permits many coach/assistant memberships; coach invite codes already exist. There is no tier seat limit. | Membership join/invite seams plus any future role-change endpoint. Strategy must define Free/Pro coach-seat maximum; otherwise Club's “multiple coach seats” is not differentiating. | Unlimited today | M |
| Club: cross-team playbook sharing | Users can copy public/shared content into any team they coach via a team picker, but there is no org-bound shared library or synchronized cross-team playbook. | Existing copy resolution is server/routes/shared.js + resolveTargetMembership; true org sharing requires org membership/team-link permissions and likely a new shared-playbook relation. | Missing as Club feature | L |
| Club: org-wide analytics | No org model and no coach-facing org analytics. Existing analytics is internal admin. | New organization scope, aggregation queries/API and client dashboard. | Missing | L |
| Club: bulk roster import | No roster CSV/bulk import implementation found. Outreach CSV code is unrelated. | New upload/parse/validation endpoint, transactional cap/duplicate handling, client import UI. Must be Club-entitled. | Missing | M-L |
| Club: priority support | No code entitlement is required unless support routing/UI is productized. | At minimum expose plan in support/admin context; optional support routing integration. | N/A | S or external |
| Above 5 teams: sales-led | No org/team purchase flow exists. | Self-serve Club UI must prevent sixth org team and present contact-sales path; server must reject self-serve creation/linking over limit even if client bypassed. | Missing | M |
| Annual vs monthly | No billing model exists. | Stripe prices + local normalized subscription interval/state + checkout/portal UI. | Missing | M |
| Founding Coach $29/$250 + 12-month lock | No cohort/lock state exists. | Billing schema + Stripe price/subscription schedule behavior + launch-window eligibility check. | Missing | M-L |

---

# 4. Gaps & nuances

## 4.1 Repository/source-of-truth gap

### Why it matters

The task names artifacts that do not exist in the connected GitHub repo, including the canonical pricing doc and 011 migration. The root source is also explicitly part of a V1→V2 cutover: server/index.js says V1 has no /api prefix and mounts a migration write lock. Source: server/index.js:L81-L87.

At the same time, v2/CLAUDE.md documents a proposed/reorganized v2 architecture and testing layout. Source: v2/CLAUDE.md:L23-L38.

### Options

- **A. Implement from connected main anyway.** Fastest, but high risk of targeting code that is being retired/migrated.
- **B. Push/expose the actual v2 source, re-run a delta discovery, then plan.** Safest.
- **C. Use v2 planning docs as if they were source.** Not acceptable; some described helpers/files demonstrably do not exist.

**Recommended: B.** Do not turn this report into a build plan until the actual v2 code and canonical pricing doc are available.

---

## 4.2 Runtime entitlement source: Stripe direct vs local state

### Why it matters

Every request that creates data must make a fast, deterministic authorization decision. Calling Stripe on every request makes product authorization dependent on external latency/outages and complicates testing.

### Options

1. **Stripe-live authorization:** query Stripe when access is needed.
   - Pro: no synchronization lag.
   - Con: external dependency in hot path, harder failure behavior, rate limits, poor testability.

2. **Local subscription record synced by webhook:** Stripe is financial source; app DB is runtime authorization source.
   - Pro: fast, testable, works during Stripe API incidents, supports overrides/grace periods.
   - Con: requires correct webhook idempotency/reconciliation.

3. **Only an entitlement boolean table manually toggled by webhook.**
   - Pro: simple reads.
   - Con: loses important subscription lifecycle/cohort/period metadata and makes debugging billing state difficult.

**Recommended:** option 2, with an explicit entitlement resolver derived from normalized local billing state plus manual overrides.

---

## 4.3 Subscription status mapping and failed payments

The strategy does not define entitlement behavior for Stripe states such as incomplete, active, trialing (if ever used), past_due, unpaid, canceled, paused, or cancel-at-period-end.

A practical policy must define:

- which states count as paid access;
- whether past_due gets a grace period;
- whether access ends immediately or at current_period_end;
- what happens when a payment later recovers;
- whether Stripe's subscription status or invoice state wins during transient ordering.

**Recommended default:** active = paid; cancel_at_period_end retains access through period end; canceled/unpaid = downgraded after paid-through/grace boundary; past_due gets a short explicit grace period rather than immediate destructive downgrade. Store status, current_period_end, cancel_at_period_end, last_event timestamp/id and access-through timestamp locally.

---

## 4.4 Webhook idempotency and event ordering

Webhook delivery is at-least-once and events can arrive out of order. A billing implementation needs:

- persisted Stripe event IDs or an idempotency ledger;
- compare/update rules that prevent an older subscription event from overwriting newer state;
- a reconciliation/admin repair path to refetch Stripe state;
- atomic updates to subscription state + derived access when possible.

This is absent today.

---

## 4.5 Raw-body webhook parsing

Current server applies express.json globally at server/index.js:L68. Stripe signature verification needs the raw body.

**Implementation constraint:** webhook route parsing must be ordered/isolated before general JSON parsing for that path.

---

## 4.6 What exactly is the billed owner?

The commercial statement is “one coach pays → the whole team is unlocked,” but the app has owner, coach and assistant_coach roles.

Questions:
- Is only team owner permitted to subscribe/change/cancel?
- Can another coach become the payer without becoming team owner?
- If ownership transfers, does billing responsibility transfer automatically?
- If a payer leaves, what happens to subscription control?
- Can coaches see plan/usage but not change payment?

**Recommended:** billing administration is owner-only at launch; coaches can see current plan/usage and upgrade prompts but cannot manage payment; players see no billing surface. Do not bind Stripe customer ownership permanently to the owner's user ID—bind subscription access to the team billing account so ownership transfer can change who is authorized to manage it without recreating the subscription.

---

## 4.7 Team subscription vs user Stripe customer

The stale v2/billing.md says every user gets a Stripe customer and webhook writes users.tier. Source: v2/billing.md:L69-L76. That is incompatible with team-anchored billing.

**Recommended:** a team or billing-account scope owns subscription state. A human user can be the Stripe customer/contact metadata owner, but application entitlements must not be stored as users.tier.

---

## 4.8 Organization / Club data model

Club means one subscription unlocks up to five teams. No current table represents that.

Realistic models:

1. **Organization entity:** organizations + organization_memberships + organization_teams + organization subscription.
2. **Owner user's team bundle:** infer club teams from teams owned by one user.
3. **Generic billing_account scope:** billing_accounts can own a team or organization; link entitled teams to billing account.

Option 2 is brittle because ownership can transfer and multiple admins/coaches are part of the product.

**Recommended:** explicit organization + organization_teams relationship, with subscription/billing state on an organization-scoped billing account. A Pro subscription remains team-scoped. Entitlement resolver checks org coverage first, then team coverage.

---

## 4.9 Club team-limit semantics

“Up to 5 teams” needs precise rules:

- Does linking an existing team to a Club org consume a slot? It should.
- Does a personal workspace consume a slot?
- Can a team belong to two organizations?
- Can an org unlink a team and link another immediately?
- Does a deleted/archive team consume a slot?
- What happens on Club downgrade while 5 teams exist?
- What happens above 5 when a sales contract exists?

**Recommended:** one active organization association per team; active/non-deleted linked teams consume slots; personal workspace counts if it is being covered by the commercial org; custom sales plans use an explicit team_limit override rather than bypassing checks in code.

---

## 4.10 Free/Pro one-team semantics

The pricing says Free has 1 team and Club has up to 5. Program is team-anchored and is most naturally one team per subscription.

Do not count every membership a person has. A coach could own/pay for one team while being an assistant on several other paid teams. Team count must apply to teams owned/covered by a billing scope, not allTeams.

Personal workspaces need an explicit decision because they are technically teams today.

---

## 4.11 Multiple coach seats is under-specified

Current source permits multiple coach/assistant memberships for every team. Club lists “multiple coach seats per team,” but the strategy summary does not state the coach-seat allowance for Free or Pro.

If Pro already allows unlimited coaches, Club loses this differentiator. If Free/Pro allow only one coach, current teams may violate the future restriction immediately.

This must be decided before join/invite gates are written.

---

## 4.12 “25 players” has two current populations

Roster/membership data has:

1. real team members with role player in team_memberships;
2. unlisted manual suite_players with user_id IS NULL.

The consolidated roster endpoint deliberately returns both. Source: server/routes/suite.js:L1428-L1473. suite_players can be linked to real users without duplication. Source: server/db/schema.sql:L1160-L1167.

Therefore a cap of 25 needs a definition. Counting only login accounts lets Free teams create unlimited unlisted roster players; counting suite_players naively double-counts linked users.

**Recommended:** count logical players = player memberships + unlisted suite_players, with linked suite_player rows not double-counted. Coach-family memberships do not consume player slots.

---

## 4.13 Pending invitations and player caps

Current email invites do not reserve slots; actual membership is created when code join succeeds.

Options:
- reserve a slot when invite sent;
- allow unlimited pending invites and reject acceptance when full;
- allow acceptance and temporarily exceed cap.

**Recommended:** do not reserve pending slots; enforce atomically at join/accept time and show a clear PLAN_LIMIT response. Optionally warn invite sender when currently at cap.

---

## 4.14 Play-cap definition

“15 saved plays” needs answers:

- Are archived/trash plays counted?
- Does the seeded onboarding demo play count?
- Do copied platform/shared plays count?
- Does restoring from trash consume a slot?
- What if a copied folder contains more plays than remaining capacity?
- What about simultaneous creates?

**Recommended baseline:**
- count active, non-archived team plays;
- exclude the one system-seeded onboarding demo play from the customer-created quota;
- count every other saved/copy/duplicate play;
- restore consumes capacity;
- bulk copy is all-or-nothing if it would cross the cap;
- use a transaction/advisory or row lock around count + insert to prevent races.

The seeded distinction is already represented by plays.is_seeded. Source: server/lib/userTeams.js:L26-L30; v2/engineering/database.md documents is_seeded.

---

## 4.15 Centralize play quota checks

Do not copy COUNT logic into seven routes. A single server helper/service should answer usage + limit and expose a transaction-safe assertion used by:

- create
- duplicate
- shared play copy
- shared folder copy
- platform play copy
- playbook section copy
- restore
- future import
- potentially seed (with explicit system bypass)

Client-side usage should come from an entitlement/usage response and is advisory only.

---

## 4.16 Downgrade while over caps

A Pro team may downgrade with 100 plays, 70 players, several playbooks, film, assignments, etc.

Options:

1. Delete/hide excess automatically — dangerous and trust-damaging.
2. Arbitrarily keep first N and lock/hide the rest — confusing.
3. Preserve all existing data read-only and block net-new over-limit writes until usage is below the Free cap.
4. Keep all capabilities indefinitely until users manually downgrade data — effectively weakens monetization.

**Recommended:** option 3. Never delete customer data on plan downgrade. Preserve view/export/delete/archive; block create/restore/import/add-member actions that increase over-limit usage; premium content remains viewable where necessary to avoid data loss but editing/creating premium-only resources should be restricted according to a defined downgrade policy.

A separate decision is needed for active assignments/film: recommended preserve read access, prevent new premium mutations after paid-through/grace ends.

---

## 4.17 Free playbook vs current product model

Current source does not have a team playbooks table. play_folders are folders inside one team library. playbook_sections are global curated sections.

Options:
1. Treat a team itself as its one playbook; remove “unlimited playbooks” as an enforceable distinction until real multi-playbook product exists.
2. Treat top-level folders as playbooks.
3. Introduce a first-class team playbooks table and parent plays/folders beneath it.

Top-level folders already have folder semantics and nesting; relabeling them as playbooks will create ambiguous behavior and migration debt.

**Recommended:** option 3 if the pricing promise is staying. Define the first-class resource before billing implementation.

---

## 4.18 Video/film semantics

No attached-film model exists. The repo has:
- tutorial/demo videos;
- video export;
- YouTube URLs in some Suite plan/install records;
- no film/video attachment on plays.

The strategy must specify:
- upload versus external URL;
- storage provider and max file size;
- one or many film assets per play;
- ownership and deletion;
- player viewing permissions;
- storage quota/cost policy;
- what “video sections” means separately from “film on plays.”

This is a product feature project, not a small billing gate.

---

## 4.19 Assignment analytics vs coach analytics

Assignment tracking already records per-member viewed_at/mastery and has coach-oriented progress UI. Source: server/db/schema.sql:L1169-L1180; server/routes/suite.js:L1569-L1638.

“Coach analytics” is not a clear current user-facing capability. Existing /admin/analytics is internal staff analytics, not team/coach analytics.

The pricing matrix should define exactly what coach analytics includes before a gate is named.

---

## 4.20 Onboarding tutorials conflict

The interactive tutorial exists but auto-launch is intentionally off because completion persistence was reverted. Source: src/layouts/AppLayout.jsx:L55-L63.

There is also a separate /app/videos “How To” surface.

Questions:
- Does “onboarding tutorials” mean the guided in-product tour, the How To video library, or both?
- Should essential first-use help really be unavailable on Free?
- If guided tutorial is Pro-only, how is completion tracked across devices?

**Recommended implementation interpretation:** premium guided/advanced tutorials can be Pro-gated, but basic help required to understand the product should remain accessible. Regardless, completion persistence must be restored before turning on the interactive tour.

---

## 4.21 Share branding: dynamic vs snapshot

Current public share pages always show Coachable branding. Source: src/pages/SharedPlay.jsx:L162-L168 and src/pages/SharedFolder.jsx:L133-L139.

Options:
1. Store hide_branding on each share link at creation.
2. Resolve source team's current entitlement every time a public share is loaded.

**Recommended:** option 2. Branding should follow the team's current plan. If Pro downgrades, existing links regain Coachable branding; if Free upgrades, existing links become unbranded without regenerating them. The public share API already joins the source team, making this seam natural. Source: server/routes/shared.js:L8-L20 and L118-L127.

---

## 4.22 Founding Coach launch window

“First 90 days” needs an anchor date:
- 90 days from billing launch date;
- 90 days from public v2 launch;
- first 90 days after each coach signs up (which would never close globally).

**Recommended:** a single configured promotion start/end window, not per-user signup rolling 90 days.

The canonical pricing doc reportedly contains grandfathering details, but it is unavailable on connected GitHub, so this cannot be verified.

---

## 4.23 Founding Coach 12-month price lock

Questions:
- Is 12 months measured from first paid subscription start?
- Monthly founders: 12 monthly renewals at $29 then $50?
- Annual founders: $250 for one annual term, then $500 at next renewal?
- If a founder changes monthly → annual, does lock clock reset? Recommended no.
- If canceled and later resubscribed, is founder status retained? Recommended only if strategy explicitly says so.
- Does upgrade to Club terminate the Program founder lock? likely yes unless doc says otherwise.

Recommended data needs:
- pricing_cohort
- promotion_qualified_at
- price_lock_started_at
- price_lock_expires_at
- original/locked Stripe price reference
- current subscription price reference

Do not represent this as only a boolean is_founding_coach; expiry and auditability matter.

---

## 4.24 Stripe mechanics for Founding Coach

Use dedicated Stripe Prices for founder monthly/annual pricing rather than sending ad-hoc amounts. At lock expiration, renewal must move to standard Program pricing in a predictable way, commonly via controlled subscription update/schedule semantics plus customer notice.

The app DB should track the cohort/lock for product/support truth, while Stripe remains the amount actually charged.

---

## 4.25 Monthly, annual, proration and schedule changes

No current behavior is defined.

Recommended defaults:
- upgrade Free → Program/Club: immediate;
- Program → Club mid-cycle: immediate with proration;
- paid downgrade: schedule for end of current paid period;
- cancel: cancel at period end by default;
- monthly ↔ annual: explicit policy, preferably next renewal unless the user intentionally confirms an immediate prorated switch;
- annual messaging “2 months free” is display copy; Stripe prices remain $500 and $1,490.

---

## 4.26 Free is not a trial

The locked strategy describes a permanent $0 Free tier. Do not model Free as a Stripe trial.

If a paid trial is introduced later, it should be a distinct subscription state/offer. Mixing Free with trialing will complicate downgrade and entitlement logic.

---

## 4.27 Tax and currency

The strategy gives USD prices but does not specify:
- whether launch is USD-only;
- sales tax/VAT handling;
- tax-inclusive/exclusive display;
- billing address requirements;
- Stripe Tax usage.

**Recommended launch simplification:** USD-only prices with Stripe-managed tax calculation/collection if the business's tax setup is ready. Do not implement hand-coded tax logic.

This still requires finance/legal configuration outside this repository.

---

## 4.28 Existing production teams at cutover

Current production is already in a V1→V2 team migration process. Source: server/index.js:L81-L87.

A pricing cutover needs an explicit backfill:
- every existing team gets a commercial state;
- existing owner relationships are resolved;
- old Team Suite grants are preserved intentionally;
- beta/founder exceptions are recorded explicitly;
- no team should silently lose data/features because a new NOT NULL billing field lacks a backfill.

The canonical grandfathering policy is unavailable, so the exact cohort assignment cannot be resolved from repo.

---

## 4.29 Existing Team Suite entitlements at cutover

Current team_suite_features can contain manual feature grants that predate billing.

Options:
1. Convert any enabled premium feature into a full Pro subscription/grant.
2. Ignore the old rows and apply tier defaults.
3. Preserve rows as manual capability overrides layered over commercial tier.

**Recommended:** option 3. Preserve history without falsely inventing paid subscriptions. Add override metadata such as reason, actor, created_at and optional expires_at in the eventual v2 model.

---

## 4.30 Legacy features absent from locked tier summary

Current Team Suite has practice plans, install calendar, game plans and printing. The locked pricing summary supplied with the task does not place all of these explicitly into Coach/Program/Organization.

Do not silently infer their tier. They need explicit placement or preservation through manual overrides until the canonical pricing doc can be read.

---

## 4.31 Admin/staff billing controls

Existing owner-only Team Suite admin is the closest precedent. Billing support should eventually show:
- effective tier;
- Stripe customer/subscription IDs;
- subscription status and paid-through date;
- usage vs limits;
- founding/grandfather cohort;
- organization membership;
- manual override/grant;
- event/reconciliation health.

Dangerous mutations should be audited. Existing admin_audit_log infrastructure is a useful precedent.

Recommended override behavior: explicit reason + actor + optional expiry, never an invisible edit of Stripe-derived status.

---

## 4.32 Billing visibility by role

Recommended:
- owner: full billing page, checkout/portal/manage plan;
- coach/assistant: current plan, usage and upgrade messaging; no payment mutation;
- player: no billing page;
- staff: read visibility based on permission; only tightly scoped staff/owner can apply manual grants/overrides.

This aligns with team-anchored billing without confusing membership role with payer identity.

---

## 4.33 Testing infrastructure mismatch

v2/CLAUDE.md specifies renderAs in src/tests and requestAs in server/tests/helpers. Source: v2/CLAUDE.md:L23-L38.

However:
- v2 UI testing standards explicitly say src/tests/renderAs.js “does not exist yet.” Source: v2/engineering/planning/testing/ui-testing-standards.md:L17-L27.
- actual role tests already import renderAs. Source: src/pages/app/tests/plays.browse/roles.test.js:L1-L14.
- server test stubs import requestAs/seed helpers. Source: server/tests/routes/plays/plays.list.test.js:L1-L14.
- direct file fetches for src/tests/renderAs.js, server/tests/helpers/requestAs.js and seed.js returned 404 on main.

Therefore the implementation plan should include completing/reconciling the v2 test harness before billing gates are trusted.

### Billing test matrix once harness exists

Server tests must cover at minimum:
- Free at 14 → create succeeds; 15 → create fails.
- Two simultaneous requests at limit cannot produce 16 active plays.
- duplicate/copy/bulk-copy/restore obey the same limit.
- Pro bypasses numeric limits.
- Free player cap through both membership acceptance and unlisted roster entry.
- coach seat caps per chosen policy.
- team creation limits; memberships on other people's teams do not count.
- Club org 5-team boundary and sixth-team rejection.
- payment state/grace mappings.
- webhook duplicate/out-of-order events.
- owner vs coach/player billing permissions.
- downgrade over-limit read-preservation/write-block behavior.
- founding eligibility and lock expiry boundaries.
- manual override precedence/expiry.

UI tests with renderAs should verify both visibility and absence:
- upgrade CTA/disabled controls at caps;
- owner billing controls;
- coach read-only plan state;
- player no billing surface;
- unbranded share response rendering;
- Club team/coach controls;
- plan changes reflected after entitlement refresh/team switch.

Feature-flag tests should remain separate from plan-entitlement tests. A feature flag being on must never grant a capability the team's paid entitlement does not allow.

---

# 5. KEY DECISIONS FOR ERIC

These are the decisions to answer before an implementation plan is written. Each choice is intentionally framed so implementation does not need to guess.

## Decision 1 — Which repository state is the implementation target?

**Question:** The connected GitHub main branch is not the exact v2 state described in the task. Which source is authoritative for the build?

- **A. Connected main as-is.** Build against current V1/cutover source.
- **B. The local/unpushed v2 repo.** Push/expose that exact source first, then re-run the delta discovery.
- **C. A different named GitHub branch/commit.** Identify it and use it as the build base.

**Recommended: B (or C if there is already a canonical v2 branch).** The requested pricing doc, 011 migration and route/config files must be source-verifiable before schema work begins.

## Decision 2 — What is the runtime source of paid entitlement?

- **A. Query Stripe live for authorization.**
- **B. Local billing/subscription state synced from Stripe webhooks; derive team entitlements locally.**
- **C. Only manually materialized feature booleans, with no normalized subscription record.**

**Recommended: B.** Stripe remains financial truth; the local DB becomes fast, deterministic runtime authorization and can represent grace periods, cohorts and overrides.

## Decision 3 — What scope owns a Program subscription?

- **A. User account.**
- **B. Team.**
- **C. Organization even for a single team.**

**Recommended: B.** It directly matches “one coach pays → whole team unlocked” and avoids users.tier errors from the stale plan.

## Decision 4 — Who can manage payment for a team?

- **A. Owner only.**
- **B. Owner + all coaches.**
- **C. Separate billing-admin membership unrelated to team role.**

**Recommended: A for launch.** Smallest permission surface; coaches can still see plan/usage. A separate billing-admin role can be added later if demanded.

## Decision 5 — Does team ownership transfer also transfer billing control?

- **A. Yes automatically; subscription stays attached to team and new owner gains billing management.**
- **B. No; original payer retains control until manually changed.**
- **C. Require explicit payer transfer before team ownership transfer.**

**Recommended: A.** Subscription entitles the team; do not strand billing control on a departed former owner. Payment-contact metadata can still be updated separately.

## Decision 6 — What counts toward Free/Program “1 team”?

- **A. Every team membership the user has.**
- **B. Teams the user owns / teams covered by that user's billing scope; memberships on other teams do not count.**
- **C. Only teams explicitly marked billable, allowing unlimited personal workspaces.**

**Recommended: B.** Assistant/coaching memberships on other paid teams must not consume a person's team allowance.

## Decision 7 — Do personal workspaces count as a team slot?

- **A. Yes.**
- **B. No, personal workspaces are unlimited.**
- **C. One personal workspace is free in addition to paid/team slots.**

**Recommended: A.** They are teams in the data model and otherwise become a straightforward limit bypass. If product wants a separate solo allowance, model it explicitly rather than leaving unlimited is_personal creation.

## Decision 8 — What is the Club ownership model?

- **A. Infer Club from teams owned by one user.**
- **B. Add explicit Organization + organization_teams + organization_memberships, with an org-scoped subscription.**
- **C. Treat Club as five unrelated team subscriptions sharing a Stripe customer.**

**Recommended: B.** Club features are organization capabilities, not merely a discount bundle.

## Decision 9 — Can a team belong to more than one Club organization?

- **A. Yes.**
- **B. No, at most one active organization.**

**Recommended: B.** Prevents ambiguous entitlement, analytics and ownership resolution.

## Decision 10 — What coach-seat limit applies to Free and Program?

Club explicitly promises multiple coach seats; current code permits multiple coaches on every team.

- **A. Free = 1 coach-family seat; Program = 1; Club = multiple.**
- **B. Free = 1; Program = multiple; Club differentiates on org features, not seats.**
- **C. Multiple coaches on every tier; remove coach seats as a Club differentiator.**
- **D. Another explicit numeric matrix.**

**Recommended: B unless the pricing doc explicitly says otherwise.** It avoids making a $50 team plan unusable for normal head+assistant coaching while preserving a meaningful Free restriction; Club still differentiates via multi-team org features. If “multiple coach seats” is a hard Club-only promise, choose A and plan migration handling for existing multi-coach teams.

## Decision 11 — What counts toward the 25-player Free cap?

- **A. Only team_memberships.role = player.**
- **B. Only suite_players.**
- **C. Logical players = player memberships + unlisted roster players, without double-counting linked profiles.**

**Recommended: C.** It closes the unlisted-roster loophole while matching what the roster actually presents.

## Decision 12 — Do pending player invites reserve slots?

- **A. Yes, invitation reserves a player slot.**
- **B. No; enforce only when the player actually joins.**

**Recommended: B.** Simpler and avoids abandoned invites consuming a plan limit. Join must return a clear limit error if the team filled meanwhile.

## Decision 13 — What exactly counts as one of the 15 saved plays?

- **A. Every plays row including archived and seeded.**
- **B. Active non-archived plays; seeded demo counts.**
- **C. Active non-archived plays; system-seeded demo excluded; every user-created/copied/duplicated play counts.**

**Recommended: C.** It aligns quota with usable customer content and does not penalize the onboarding play Coachable injects.

## Decision 14 — What happens when a bulk copy would exceed the play cap?

- **A. Copy only as many as fit.**
- **B. Reject the entire operation and show required remaining slots/upgrade CTA.**
- **C. Allow overage for copy/import operations.**

**Recommended: B.** Partial playbooks/folders are confusing and overage would create an easy cap bypass.

## Decision 15 — What is a “playbook” for pricing?

- **A. The whole team's existing play library; no new object.**
- **B. A top-level play_folders row.**
- **C. A new first-class team-owned playbook resource containing folders/plays.**

**Recommended: C if “1 vs unlimited playbooks” remains in pricing.** Current folders are not a clean semantic substitute and the existing playbook_sections are global curated content, not customer playbooks.

## Decision 16 — Downgrade behavior when usage exceeds Free limits

- **A. Delete/hide excess automatically.**
- **B. Preserve everything; allow reads/deletes but block actions that increase over-limit usage until below cap or upgraded.**
- **C. Grandfather all existing usage indefinitely with normal edits/creates.**

**Recommended: B.** No data loss, clear monetization boundary, and recoverable downgrade behavior.

## Decision 17 — What happens to premium objects after downgrade?

Examples: film, assignments, premium analytics data.

- **A. Hide them entirely.**
- **B. Preserve read access; block new premium creation/mutation after paid-through/grace ends.**
- **C. Keep full access to already-created premium resources forever.**

**Recommended: B.** Prevents data hostage behavior without making paid features permanently free after one month.

## Decision 18 — How long is payment-failure grace?

- **A. None; downgrade immediately when Stripe becomes past_due.**
- **B. Fixed grace period (for example 7 days) then downgrade if still unpaid.**
- **C. Keep access until Stripe marks subscription canceled/unpaid according to configured dunning.**

**Recommended: C with an explicit local access-through boundary.** Let Stripe's dunning configuration drive retries, while local state maps paid-through/grace deterministically. If Eric wants a Coachable-specific grace independent of Stripe, choose B and set the exact number.

## Decision 19 — When does a normal paid downgrade take effect?

- **A. Immediately with proration/refund behavior.**
- **B. At current paid period end.**

**Recommended: B.** Avoids mid-cycle entitlement churn and makes annual/monthly customer expectations simpler.

## Decision 20 — Upgrade proration policy

- **A. Program → Club immediately with Stripe proration.**
- **B. Upgrade only at next renewal.**

**Recommended: A.** Users asking for more teams/features usually need them now; Stripe handles prorated charge.

## Decision 21 — Is Free permanent or a trial?

- **A. Permanent $0 tier.**
- **B. Time-limited trial that later becomes restricted/closed.**

**Recommended: A.** This is what the locked pricing model describes. Add trials later as a separate concept if wanted.

## Decision 22 — What defines Founding Coach eligibility?

- **A. Subscription starts inside one global 90-day launch window.**
- **B. Each user gets 90 days from account signup to claim it.**
- **C. Manually assigned cohort only.**

**Recommended: A, with C available as an admin exception.** A global launch window matches “first 90 days” without making the promotion permanently rolling.

## Decision 23 — When does the Founding Coach 12-month lock start?

- **A. Account creation date.**
- **B. First paid Program subscription activation date.**
- **C. Global promotion start date.**

**Recommended: B.** It gives every qualified paying founder the promised 12 months from when they actually begin paying.

## Decision 24 — Does switching monthly ↔ annual reset the founding lock?

- **A. Yes.**
- **B. No; the original lock expiry remains fixed.**

**Recommended: B.** Prevents gaming and matches the idea of a 12-month price-lock window.

## Decision 25 — What happens if a Founding Coach cancels and later resubscribes during/after lock?

- **A. Founder pricing can always be reclaimed.**
- **B. Founder pricing is lost on cancellation.**
- **C. Founder pricing can be reclaimed only while the original lock is still active.**

**Recommended: C.** Preserves the time-limited promise without making the founder price a permanent transferable entitlement. Confirm against the missing canonical strategy doc.

## Decision 26 — How should founding pricing be represented?

- **A. One boolean is_founding_coach and application-calculated price.**
- **B. Dedicated Stripe founder Prices plus local cohort/lock timestamps.**
- **C. Stripe coupons/promotion codes only, no local cohort state.**

**Recommended: B.** The charged amount remains explicit in Stripe while Coachable retains auditable product/support state.

## Decision 27 — What happens to current production teams at pricing cutover?

- **A. Every existing team becomes Free unless explicitly overridden/grandfathered.**
- **B. Every existing team gets Program for a fixed transition period.**
- **C. Existing teams are permanently grandfathered into Program.**
- **D. Apply the exact cohort rules from PRICING-STRATEGY-FINAL.md once that file is available.**

**Recommended: D.** This is specifically a policy the missing canonical doc reportedly defines. Do not invent a production grandfathering rule from the stale billing document.

## Decision 28 — What happens to existing team_suite_features grants?

- **A. Convert enabled features into a paid Program plan.**
- **B. Delete/ignore them and apply new tier defaults.**
- **C. Preserve them as explicit manual entitlement overrides independent of subscription tier.**

**Recommended: C.** Existing grants may be beta/support decisions, not evidence of payment.

## Decision 29 — Where do legacy Suite features land in the new tiers?

Current source includes practice_plans, install_calendar, game_plans and printing, but the supplied locked summary does not place all of them.

- **A. Put all current Suite features in Program and Club.**
- **B. Keep only named pricing capabilities; preserve old grants by override until individually decided.**
- **C. Another explicit per-feature matrix from the canonical strategy doc.**

**Recommended: C if the canonical doc covers them; otherwise B.** Do not silently expand/reduce the paid bundle.

## Decision 30 — Share branding entitlement timing

- **A. Snapshot branding state when share link is created.**
- **B. Resolve the source team's current plan every time the public link loads.**

**Recommended: B.** Existing links automatically reflect upgrade/downgrade and require no token regeneration.

## Decision 31 — What does “onboarding tutorials” include?

- **A. Only the interactive guided tour.**
- **B. Interactive tour + /app/videos How To library.**
- **C. Advanced guided tutorials are Pro, basic How To/help remains available to Free.**

**Recommended: C.** Basic learnability should not be destroyed by the paywall; the premium differentiation can be richer guided education. If the locked strategy explicitly requires all tutorials behind Pro, choose B.

## Decision 32 — Tax/currency launch scope

- **A. USD-only, with Stripe tax tooling/configuration where legally required.**
- **B. Multi-currency at launch.**
- **C. USD-only and no automated tax handling.**

**Recommended: A.** Lowest product complexity without hard-coding tax rules.

## Decision 33 — Admin override model

- **A. Staff edits subscription/tier fields directly.**
- **B. Explicit manual grants/overrides with reason, actor, timestamps and optional expiry layered on top of Stripe state.**
- **C. No staff override capability.**

**Recommended: B.** Keeps financial truth separate from support/beta grants and makes incidents auditable.

## Decision 34 — Above-five-team Club handling

- **A. Hard reject above five with no path forward.**
- **B. Self-serve continues above five at per-team price.**
- **C. Self-serve stops at five; contact-sales/custom plan supplies an explicit higher team_limit when contracted.**

**Recommended: C.** Matches the locked “self-serve to 5; sales-led above” model while keeping the enforcement code numeric rather than full of special cases.

---

# 6. Open questions / unknowns not resolvable from the connected repo

1. **The canonical pricing strategy file is unavailable.** Grandfathering and price-increase triggers said to live in PRICING-STRATEGY-FINAL.md cannot be verified.

2. **The requested 011_team_premium_features.sql is unavailable.** I cannot confirm the exact kept v2 teardown migration, its five booleans, constraints, or whether newer v2 source reads it.

3. **The exact local v2 source tree is unavailable.** App.tsx, AppRoutes.tsx, appShellConfig and searchItems.ts named in the task are not on connected main, so billing-page mount seams for that architecture remain unverified.

4. **The actual v2 server API prefix and billing middleware order are unverified.** Connected V1 source explicitly has no /api prefix. The v2 plan may differ.

5. **The completed v2 renderAs/requestAs helpers are unavailable.** Planning docs and test files reference them, but the helpers 404 on main.

6. **Founding Coach grandfathering details are unknown.** In particular: cancellation/rejoin rules, upgrade-to-Club effect, the exact 90-day window anchor, notice timing, and whether annual founders receive exactly one $250 term.

7. **The Program coach-seat allowance is not specified by the supplied pricing summary.** This is required because Club lists multiple coach seats.

8. **“Playbook” is not concretely represented in current team data.** The pricing promise needs a resource definition.

9. **“Video sections” is undefined against current product objects.** No matching team/play resource was found.

10. **“Coach analytics” is undefined.** Assignment progress exists, internal admin analytics exists, but a coach-facing analytics product boundary is not clear.

11. **Legacy Suite features are not fully placed in the new pricing matrix.** practice_plans, install_calendar, game_plans and printing need explicit policy.

12. **Personal workspace billing semantics are unspecified.**

13. **Whether unlisted roster players count toward the 25-player cap is unspecified.**

14. **Whether seeded onboarding plays count toward 15 is unspecified.** This report recommends excluding system-seeded demo plays.

15. **Whether archived/trash plays count is unspecified.** This report recommends counting only active non-archived plays and gating restore.

16. **Whether a Club organization can attach an already-paid Program team and how duplicate billing is resolved is unspecified.** A conversion/credit policy is needed.

17. **Who is allowed to create an organization and invite org admins is unspecified.**

18. **Whether “multiple coach seats” means unlimited or a numeric Club cap is unspecified.**

19. **Whether Club priority support requires in-app routing/SLAs or is only an operational promise is unspecified.**

20. **Storage economics for film are unknown.** Upload size, retention and quotas can materially affect Program margin.

21. **Tax nexus/legal configuration is outside the repo and was not investigated here.**

22. **Stripe product/price IDs do not exist in source and Stripe was intentionally not touched.**

---

# Final discovery conclusion

The most reusable technical asset is the existing **per-team, server-authoritative Team Suite entitlement pattern**, not the global feature-flag system. The correct billing architecture should preserve that team-scoped authorization shape while replacing manual booleans as the commercial source with a normalized local billing/subscription model synchronized from Stripe.

The implementation should **not** begin by wiring checkout. First resolve the repository-state mismatch and Decisions 1, 8, 10, 11, 13, 15, 16, 18, 22-29 and 31. Those decisions determine the database model and enforcement semantics. Once they are fixed, Stripe checkout/webhooks become a comparatively contained integration.

No Stripe API/CLI action was performed. No existing source or documentation file was modified. This report is the only file created by this discovery pass.
