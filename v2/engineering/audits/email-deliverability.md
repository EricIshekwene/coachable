# Email Deliverability Audit

**Reviewed:** June 2026
**Scope:** Transactional email via Resend — verification codes, password resets, team invites, notifications. DNS configuration, inbox placement, and legal compliance before v2 launch.
**Method:** Resend API inspection of domain DNS records; review of `v2/engineering/planning/infrastructure/environment.md`; grill session with project owner.

---

## Summary Table

| # | Gap | Severity | Fix |
|---|---|---|---|
| 1 | Sending domain is `tcutss.com` — not the product brand | **High** | Migrate to `coachableplays.com` before launch |
| 2 | DMARC record not configured on `tcutss.com` (or future domain) | **Medium** | Add `p=none` DMARC record; promote to `p=quarantine` post-launch |
| 3 | No inbox placement testing done | **Medium** | Run mail-tester.com + manual Gmail/Yahoo/Apple Mail test before launch |
| 4 | No unsubscribe mechanism for notification/marketing emails | **High** | Build email preference system (schema + admin UI + unsubscribe link) |
| 5 | No per-user email preference management in admin | **High** | Add opt-out toggles per email type in admin panel |

Items confirmed not gaps:
- DKIM — configured and verified on current domain (`resend._domainkey.tcutss.com`) ✅
- SPF — configured and verified (`send.tcutss.com`, standard Resend subdomain pattern) ✅
- Resend domain status — `tcutss.com` verified, sending enabled ✅
- No known user reports of missing verification or invite emails ✅

---

## Gap 1 — Sending Domain Is `tcutss.com`, Not the Product Brand

**Severity: High**

### Current state

`FROM_EMAIL` defaults to `Coachable <noreply@tcutss.com>`. The Resend dashboard confirms `tcutss.com` is the only configured sending domain. `tcutss.com` has no visible relationship to Coachable — it looks like a random domain to recipients, which triggers spam heuristics and erodes trust.

### Fix for v2

Migrate sending to `noreply@coachableplays.com`.

**Steps:**

1. **Add `coachableplays.com` in the Resend dashboard** (Domains → Add Domain → `coachableplays.com`, region `us-east-1`).
2. **Add the DNS records Resend generates** to your DNS provider for `coachableplays.com`:
   - DKIM TXT record at `resend._domainkey.coachableplays.com`
   - SPF TXT record at `send.coachableplays.com` — `v=spf1 include:amazonses.com ~all`
   - SPF MX record at `send.coachableplays.com` → `feedback-smtp.us-east-1.amazonses.com`
3. **Add DMARC** (see Gap 2 below) at the same time.
4. **Update `FROM_EMAIL`** in Railway production to `Coachable <noreply@coachableplays.com>`.
5. **Remove `tcutss.com`** from the Resend dashboard once the new domain is verified and confirmed sending.

**Do not update `FROM_EMAIL` in Railway until Resend confirms `coachableplays.com` is verified** — emails sent from an unverified domain will be rejected or dropped silently.

---

## Gap 2 — No DMARC Record

**Severity: Medium**

### Current state

The Resend DNS inspection returned no DMARC record for `tcutss.com`. DMARC is not configured on the current sending domain and must be added on `coachableplays.com` before launch.

### Why this matters

Without DMARC, inbox providers (Gmail, Yahoo, Apple Mail) have no published policy for what to do when an email fails SPF/DKIM alignment. This lowers the sender reputation score and makes your domain unprotectable against spoofing.

### Fix for v2

Add a DMARC TXT record at `_dmarc.coachableplays.com`:

```
v=DMARC1; p=none; rua=mailto:dmarc-reports@coachableplays.com; ruf=mailto:dmarc-reports@coachableplays.com; fo=1
```

Start with `p=none` (monitor mode — no mail is rejected, reports are collected). After 2–4 weeks of clean reports, promote to `p=quarantine`, then `p=reject`.

**DMARC alignment with Resend's setup:**
- DKIM signs with `coachableplays.com` → aligns with `FROM` domain ✅
- MAIL FROM envelope uses `send.coachableplays.com` → relaxed SPF alignment passes (subdomain of same org domain) ✅

---

## Gap 3 — No Inbox Placement Testing

**Severity: Medium**

### Current state

No formal inbox placement test has been run on any provider. No user reports of missing verification or invite emails exist, but absence of reports is not the same as confirmed inbox delivery.

### Fix for v2

Run the following before launch:

1. **mail-tester.com** — sends to a disposable address and scores SPF, DKIM, DMARC, content, and blacklists. Target score: 9/10 or higher.
2. **Manual inbox test** — trigger a real verification email from the production Resend key (`Railway_Email`) and check delivery to:
   - Gmail (personal account)
   - Yahoo Mail
   - Apple Mail / iCloud
3. **MXToolbox blacklist check** — run `coachableplays.com` and the sending IP through [mxtoolbox.com/blacklists](https://mxtoolbox.com/blacklists.aspx) to confirm no blacklist listings.

Record results in the table below when completed:

| Provider | Result | Date tested |
|---|---|---|
| Gmail | — | — |
| Yahoo Mail | — | — |
| Apple Mail / iCloud | — | — |
| mail-tester.com score | — | — |
| MXToolbox blacklists | — | — |

---

## Gap 4 — No Unsubscribe Mechanism for Notification/Marketing Emails

**Severity: High**

### Current state

No unsubscribe link or opt-out mechanism exists in any outgoing email. This is a legal compliance gap under CAN-SPAM (US) and GDPR (EU) for any email that is not purely transactional.

### Email type classification

| Email type | Classification | Unsubscribe required |
|---|---|---|
| Signup verification code | Transactional | No |
| Password reset | Transactional | No |
| Account deletion confirmation | Transactional | No |
| Team invite | Transactional | No — directly requested action |
| Play shared notification | Notification | **Yes** |
| Marketing / outreach campaigns | Marketing | **Yes** |
| Any future digest or newsletter | Marketing | **Yes** |

### Fix for v2

#### Schema

Add an `email_preferences` table:

```sql
CREATE TABLE email_preferences (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type  TEXT        NOT NULL,  -- 'notifications' | 'marketing'
  opted_out   BOOLEAN     NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, email_type)
);
```

A missing row means opted in (default). Only insert a row when the user opts out.

#### Unsubscribe link in emails

Every notification and marketing email must include a one-click unsubscribe link in the footer:

```
Unsubscribe from these emails: https://coachableplays.com/unsubscribe?token=<signed-token>
```

The token is a short-lived signed JWT containing `{ userId, emailType }`. The `/unsubscribe` route verifies the token and upserts `opted_out = true` into `email_preferences`. No login required — the token is the auth.

#### Sending guard

Before sending any notification or marketing email, the email helper must check `email_preferences`:

```js
const { rows } = await db.query(
  `SELECT opted_out FROM email_preferences
   WHERE user_id = $1 AND email_type = $2`,
  [userId, emailType]
);
if (rows[0]?.opted_out) return; // silently skip
```

#### CAN-SPAM compliance checklist

- Unsubscribe link present in every non-transactional email ✅ (once built)
- Unsubscribe honored within 10 business days — the route honors it immediately ✅
- Physical address in email footer — add `Coachable, [address]` to email templates ⚠️ (must be added)
- Honest subject lines — enforced by review ✅
- No deceptive routing headers — Resend handles this ✅

#### GDPR compliance checklist

- Lawful basis for sending notification emails: **legitimate interest** (user signed up and expects activity notifications) — document this decision
- Lawful basis for marketing emails: **consent** — must be collected at signup or via explicit opt-in before sending marketing
- Right to withdraw consent: satisfied by the unsubscribe mechanism above ✅
- Data minimization: `email_preferences` stores only opt-out state, no behavioral data ✅

---

## Gap 5 — No Admin Email Preference Management

**Severity: High**

### Current state

No admin UI exists to view or modify a user's email opt-out status. Staff cannot manually honor unsubscribe requests received outside the email link (e.g., reply emails, support tickets).

### Fix for v2

Add email preference controls to the admin user detail view.

#### Admin UI spec

On the user detail page in the admin panel, add an **Email Preferences** section with one checkbox per email type:

| Email type | Label | Default |
|---|---|---|
| `notifications` | Send notification emails | Checked (opted in) |
| `marketing` | Send marketing emails | Checked (opted in) |

Unchecking a box immediately upserts `opted_out = true` into `email_preferences` for that user. Checking it back deletes the row (restores default opted-in state).

#### Route

```
PATCH /admin/users/:userId/email-preferences
Body: { email_type: 'notifications' | 'marketing', opted_out: boolean }
Auth: requireStaffAuth
```

---

## Pre-Launch Checklist

- [ ] `coachableplays.com` added to Resend and all DNS records verified
- [ ] DMARC `p=none` record live on `coachableplays.com`
- [ ] `FROM_EMAIL` updated to `Coachable <noreply@coachableplays.com>` in Railway production
- [ ] `tcutss.com` removed from Resend dashboard
- [ ] mail-tester.com score ≥ 9/10
- [ ] Manual inbox tests passed on Gmail, Yahoo, Apple Mail
- [ ] MXToolbox blacklist check clean
- [ ] `email_preferences` table added to v2 schema migrations
- [ ] Unsubscribe token route (`GET /unsubscribe`) built and tested
- [ ] Unsubscribe footer link present in all notification and marketing email templates
- [ ] Physical address added to all email footers (CAN-SPAM)
- [ ] Sending guard in place for notification/marketing emails
- [ ] Admin email preference toggles built and functional
- [ ] DMARC promoted to `p=quarantine` after 2–4 weeks of clean reports (post-launch)

---

## Cross-Reference Notes

- `v2/engineering/planning/infrastructure/environment.md` — `FROM_EMAIL` and `RESEND_API_KEY` variables must be updated when the domain migrates
- `server/lib/email.js` — sending guard and unsubscribe token logic lives here
- Admin user detail page — email preference toggles live here
