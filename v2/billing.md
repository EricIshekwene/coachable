# Billing and Monetization

Coachable v2 includes billing infrastructure — tier gating, Stripe wiring, and admin controls — but does not charge users at launch. All features are open on the Free tier while the user base grows. When monetization begins, tiers are activated via admin controls without code changes.

---

## Decision summary

| Decision | Choice |
|---|---|
| Billing in v2? | Yes — infrastructure only, not charging at launch |
| Payment model | Stripe subscriptions (recurring monthly) |
| Tiers | Free, Pro, Team, Org |
| Launch default | Every user starts on Free |
| Feature gates at launch | All open — Free gets everything |
| Gate configuration | Admin UI, no deploys required |

---

## Tiers

Four tiers. Exact pricing TBD at monetization time.

| Tier | Intended for |
|---|---|
| **Free** | Individual coaches, solo use |
| **Pro** | Serious individual coaches who want premium features |
| **Team** | Organizations with multiple coaches |
| **Org** | Large programs, institutions |

Feature gates per tier are defined and toggled in the admin dashboard. They are not hardcoded in the frontend — see [Feature gates](#feature-gates) below.

---

## Feature gates

Every gateable feature has:

1. **An admin toggle** — staff can flip any feature gate per tier without a deploy
2. **A component prop** — components accept a tier-aware prop so gate logic stays out of business logic

### Component convention

Components that have gated behavior accept a `tier` prop (or read from the user's subscription context). Example:

```jsx
<MobileEditor tier={user.tier} />
// Inside MobileEditor: if tier < 'pro', show upgrade prompt instead of editor
```

The exact feature-to-tier mapping is configured in admin and seeded into the feature flag system via `GET /api/flags` — see `v2/engineering/planning/feature-flags.md` for the flag loading pattern.

### At launch

All feature gates are open. Every user on Free has access to everything. This means:

- The gating logic is real and tested from day one
- No user is blocked at launch
- Tiers can be activated per-feature in admin when monetization begins, with no frontend changes required

---

## Stripe integration

### Model

Stripe subscriptions with monthly recurring billing. Annual billing can be added later as a discount option.

### Integration scope for v2

The following must be built in v2, even before charging goes live:

1. **Stripe customer creation** — every user gets a Stripe customer ID at signup (even on Free). This makes the upgrade path seamless later.
2. **Subscription webhook handler** — `POST /api/billing/webhook` listens for `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` and updates `users.tier` accordingly.
3. **Upgrade flow** — a stub upgrade page that can be wired to Stripe Checkout when billing goes live.
4. **`users.tier` column** — the DB stores the user's current tier. The webhook keeps it in sync with Stripe.

### What is deferred

- Actual Stripe Checkout / payment collection
- Pricing configuration in Stripe Dashboard
- Dunning / failed payment handling
- Invoice generation

---

## Admin controls

The admin dashboard must support:

- **Manual tier override** — set any user's tier to Free / Pro / Team / Org by hand. This is how beta users are upgraded before Stripe is live.
- **Feature gate configuration** — toggle which features are available at each tier.
- **Subscription status view** — see a user's Stripe customer ID and current subscription state once billing is live.

---

## Launch state

```
All users → Free tier
All feature gates → open
Stripe customer created at signup → yes
Stripe subscriptions active → no
Admin tier override → available
```

When the decision is made to start charging, the path is:

1. Configure pricing in Stripe Dashboard
2. Wire Stripe Checkout to the upgrade stub page
3. Set feature gate overrides in admin to restrict features per tier
4. Flip gates one at a time — no code deploys required

---

## Cross-Reference Notes

- Feature gates are delivered via `GET /api/flags` — see `v2/engineering/planning/feature-flags.md`
- `users.tier` column must be in the v2 schema from day one — see `v2/database.md`
- Stripe webhook secret goes in `v2/environment.md` as `STRIPE_WEBHOOK_SECRET`
- Upgrade stub page is a public route — see `v2/engineering/planning/routing.md`
