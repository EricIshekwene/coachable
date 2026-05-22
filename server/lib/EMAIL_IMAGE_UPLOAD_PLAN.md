# Email Image Upload — Technical Plan

## Goal

Allow admins to upload photos directly in the email composer body (one-time and recurring),
so images are embedded in emails as fully public, permanent `<img src="...">` links.

---

## Current state

Play GIFs are stored in **`server/lib/gifAssetStore.js`** — an in-memory `Map` with a 24-hour TTL.
The server exposes them at `/admin/gif-asset/:uuid` (auth-free, UUID acts as a pre-signed URL).

This works for play GIFs because the email is sent within seconds of generation.
It does **not** work for user-uploaded photos in recurring emails because:
- The server can restart (Railway redeploy → Map is wiped)
- Recurring campaigns reference the image days or weeks later

---

## Recommended approach: Cloudflare R2

**Why R2:**
- Free up to 10 GB storage + 10 million reads/month
- S3-compatible API — one `fetch()` call with AWS SDK or plain HTTP
- Returns a permanent public CDN URL (`https://pub-<id>.r2.dev/<key>`)
- No database schema changes needed — just store the URL string

**Alternatives considered:**

| Option | Verdict |
|--------|---------|
| Supabase Storage | Fine, but adds another vendor if not already using Supabase |
| AWS S3 | More expensive; more IAM setup complexity |
| Railway persistent volume | Free, but URLs are tied to your Railway service domain — breaks if service moves |
| Base64 in DB | Bloats the DB; bad practice for binary data |
| Inline base64 in email HTML | Most email clients block data URIs; makes emails huge |

---

## Implementation plan

### 1. Cloudflare R2 bucket setup (one-time, ~10 min)

1. Create a Cloudflare account (free) → R2 → Create bucket `coachable-email-assets`
2. Enable **public access** on the bucket (gives a `pub-*.r2.dev` CDN URL)
3. Create an **R2 API token** with `Object Read & Write` on this bucket
4. Note: `Account ID`, `Access Key ID`, `Secret Access Key`, `Bucket Name`, `Public URL`

### 2. Server environment variables (Railway)

Add to Railway service `resplendent-inspiration`:

```
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 access key>
R2_SECRET_ACCESS_KEY=<r2 secret>
R2_BUCKET_NAME=coachable-email-assets
R2_PUBLIC_URL=https://pub-<id>.r2.dev
```

### 3. New server lib: `server/lib/r2Upload.js`

```js
import crypto from "crypto";

const ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET    = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Upload a Buffer to R2 and return its public CDN URL.
 * Uses AWS Signature V4 (same as S3).
 * @param {Buffer} buffer
 * @param {string} mimeType  e.g. "image/jpeg"
 * @param {string} [ext]     e.g. "jpg"
 * @returns {Promise<string>} permanent public URL
 */
export async function uploadToR2(buffer, mimeType, ext = "bin") {
  // Use @aws-sdk/client-s3 (already familiar S3 API, works with R2)
  // npm install @aws-sdk/client-s3
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const key = `email-images/${crypto.randomUUID()}.${ext}`;
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return `${PUBLIC_URL}/${key}`;
}
```

### 4. New server route: `POST /admin/email/image-asset`

Add to `server/routes/admin.js` (alongside the existing gif-asset route):

```js
/**
 * POST /admin/email/image-asset
 * Accept a base64-encoded image from the composer, upload to R2,
 * and return a permanent public URL for use in email HTML.
 *
 * Body: { image: string (base64), mimeType: string }
 * Returns: { url: string }
 */
router.post("/email/image-asset", requireAdminOrStaff, async (req, res, next) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) return res.status(400).json({ error: "image and mimeType are required" });

    const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };
    const ext = ALLOWED_TYPES[mimeType];
    if (!ext) return res.status(400).json({ error: "Unsupported image type" });

    const buffer = Buffer.from(image, "base64");
    if (buffer.length > 10 * 1024 * 1024) return res.status(413).json({ error: "Image exceeds 10 MB limit" });

    const url = await uploadToR2(buffer, mimeType, ext);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});
```

### 5. Rich text editor: image insertion UI

In the `RichBodyEditor` component (both `AdminEmailPage.jsx` and `AdminRecurringEmailPage.jsx`):

**Toolbar button:** Add an "Image" button (📷 icon) next to the existing toolbar.

**Upload flow:**
1. Click "Image" → hidden `<input type="file" accept="image/*">` triggers
2. On file select → `FileReader.readAsDataURL()` → extract base64 + mimeType
3. Show inline loading spinner in the toolbar
4. POST to `/admin/email/image-asset` with base64 + mimeType
5. On success → `document.execCommand("insertHTML", false, '<img src="URL" style="max-width:100%;">')`
6. The URL in the editor HTML is a permanent R2 link — it serialises into `body` state exactly like any other markup

**No sentinel needed** — unlike the play GIF, images don't need special handling. They're just standard `<img>` tags in the HTML body and flow through the existing `sanitizeBroadcastBodyMarkup` → `decorateMarkupForEmail` pipeline.

**One sanitizer change needed:** Add `img` to `ALLOWED_TAGS` in `server/lib/broadcastEmailTemplate.js` and `shared/broadcastEmailTemplate.js`, and handle the `src` attribute in `sanitizeRichMarkup` (same pattern as `<a href>`).

### 6. Email template: ensure img tags are kept and styled

In `sanitizeRichMarkup` (both template files), add:

```js
// Inside the tag-matching loop:
if (tag === "img") {
  const src = sanitizeUrl(getSrcAttribute(rawAttrs));
  if (!src) continue;
  result += `<img src="${escapeAttribute(src)}" style="display:block;max-width:100%;border:0;border-radius:4px;margin:0 0 18px;">`;
  continue;
}
```

Add a `getSrcAttribute` helper (same pattern as `getHrefAttribute`).

---

## Database changes

**None required.**

Image URLs are stored as part of the HTML `body` field (already `TEXT`) — the same way `<a>` links or `<strong>` tags are stored. No new columns.

---

## Files to create / modify

| File | Change |
|------|--------|
| `server/lib/r2Upload.js` | New — R2 upload helper |
| `server/routes/admin.js` | Add `POST /admin/email/image-asset` route |
| `server/lib/broadcastEmailTemplate.js` | Allow `<img>` tag in sanitizer |
| `shared/broadcastEmailTemplate.js` | Same (keep in sync) |
| `src/pages/AdminEmailPage.jsx` | Add image toolbar button + upload flow |
| `src/pages/AdminRecurringEmailPage.jsx` | Same |
| `package.json` (server) | Add `@aws-sdk/client-s3` |

---

## Effort estimate

| Step | Time |
|------|------|
| Cloudflare R2 bucket + token setup | ~10 min |
| `r2Upload.js` + server route | ~30 min |
| Sanitizer `<img>` support | ~20 min |
| Frontend toolbar button + upload flow | ~45 min |
| Testing end-to-end | ~20 min |
| **Total** | **~2 hours** |

---

## Notes

- The existing `gifAssetStore.js` in-memory store is fine for play GIFs (always sent within seconds).
  No need to migrate GIFs to R2 — they're ephemeral by design.
- If R2 is not available, the same approach works with Supabase Storage (replace `uploadToR2` with
  a Supabase Storage client call; the rest of the plan is identical).
- Images uploaded by admins are permanent and public. There is no delete flow needed for the MVP —
  R2 storage costs are negligible at this scale.
