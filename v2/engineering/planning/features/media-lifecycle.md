# Media Lifecycle

**Written:** June 2026
**Scope:** All media storage decisions for v2 — GIF exports, video exports, and R2 object storage

---

## Summary of decisions

| Media type | Storage | Lifetime | v2 change |
|---|---|---|---|
| User GIF exports | In-memory (server) | 10 minutes | Reduce TTL from 24h → 10min |
| User video exports | Client-side only | Download only | No change |
| Admin email images | Cloudflare R2 (`email-images/`) | Permanent | No change |

---

## User exports — client-side only

GIF and video exports are generated in the browser and downloaded directly. Nothing persists server-side beyond the brief window needed to serve the file.

**This model stays in v2.** Storing user exports in R2 would add storage costs, lifecycle complexity, and access-control questions with no concrete user benefit. There is no need for persistent export links, re-downloadable exports, or server-hosted export URLs.

---

## GIF asset store — in-memory, 10-minute TTL

GIFs are generated server-side for one purpose only: embedding in admin broadcast emails. The flow is: generate GIF → store in memory → embed URL in outgoing email → GIF served if the email client fetches it within the TTL window.

**TTL in v2 is 10 minutes** (down from 24 hours in v1). Emails are sent within seconds of generation; 10 minutes is sufficient margin. The in-memory store (`gifAssetStore.js`) stays — no R2 migration needed for GIFs.

The 24-hour TTL in v1 was overly generous and wasted process memory on blobs that were already served. Tighten it on day one.

---

## R2 — admin email images only

The only objects written to R2 are images uploaded by admins for use in email campaign templates (`email-images/` key prefix, 10 MB size limit enforced server-side). These are permanent — deleting them would break any sent email that embedded them.

**No lifecycle rule is needed.** R2 free tier is 10 GB. At current admin usage, storage cost is negligible. No cleanup policy, no TTL, no delete flow.

When v2 wires R2 credentials (currently not configured — see `environment.md`), the scope stays the same: email images only, under `email-images/`.

---

## What is NOT in R2

- User GIF exports — in-memory only
- User video exports — client-side only
- Play thumbnails — not implemented
- Any user-generated content

---

## v2 implementation checklist

- [ ] Reduce `GIF_TTL_MS` in `gifAssetStore.js` from `24 * 60 * 60 * 1000` to `10 * 60 * 1000`
- [ ] Wire R2 credentials in v2 environment (see `environment.md` R2 section)
- [ ] Carry forward 10 MB size guard on admin image upload endpoint
- [ ] No additional lifecycle work required
