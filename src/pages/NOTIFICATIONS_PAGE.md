# Admin Notifications Page

## What was implemented

A full notification command center at `/admin/notifications` (owner-only). Lets the admin compose notifications, target specific audiences, preview the output, test-send to a real email, broadcast to the full filtered audience, and review past sent notifications with engagement analytics.

## How it works

### Layout
Single-column `AdminPage wide` layout with two main sections stacked vertically:

1. **Send Notification** — the composer form
2. **Past Notifications** — management table with KPI strip

### Composer form
Fields sit at the top of an `AdminCard`:
- **Notification title** — internal label, not shown to recipients
- **Subject / headline** — used as the notification heading
- **Priority** — Normal | High | Critical
- **Delivery** — fixed to in-app (this is an in-app notification system; email lives on the separate Email Composer page)

### Audience targeting
`AudienceSelector` component renders:
- **Quick chips** — All Users / Active / Inactive / Coaches / Players Only; clicking a chip sets the `audMode` state and shows a check + accent highlight
- **Additional filters toggle** — expands a sub-grid with sport dropdown, play-activity filter, signup date from/to
- **Estimated count pill** — hardcoded demo estimates per mode; real counts come from the API once the endpoint exists

### Body = block list (text + questions interleaved)
The notification body is a single ordered list of **blocks** (`blocks` state), not a separate "body" + "questions" split. Each block is either:
- a **text block** (`{ id, kind: "text", html }`) — a `RichBodyEditor` instance, or
- a **question block** (`{ id, kind: "question", type, label, required, options?, scale* }`).

This lets the admin put text *between* questions in any order. `BlockComposer` renders the list; `AddBlockMenu` (bottom of the composer and inline "add below" on each block) inserts a text block or any question type at a position. `makeTextBlock()` / `makeQuestionBlock(type)` are the factories; `stripHtml()` tests whether a text block has real content.

Every block is wrapped in a shared `BlockCard` that provides:
- **Drag-and-drop reordering** — a grip handle (HTML5 `draggable`, enabled only while the handle is held) lets you drag a block to any position; the drop target shows an accent indicator and the dragged block dims. `reorder(from, to)` performs the move.
- **Collapse / expand** — a chevron toggles each block; collapsed blocks show a one-line summary (text preview, or "type · prompt" for questions) while keeping reorder/duplicate/delete/add-below controls in the always-visible header. A **Collapse all / Expand all** toggle appears when there's more than one block. Collapse state lives in a `Set` of block ids in `BlockComposer` (UI-only, not sent).

`RichBodyEditor` is a `contentEditable` div with a formatting toolbar using `document.execCommand` (same pattern as `AdminEmailPage`). Supported formats:
- Bold, Italic, Underline
- H2 heading, Blockquote
- Unordered list, Ordered list
- Link insertion (prompt for URL)
- Clear formatting

Toolbar buttons highlight when the cursor is inside a matching format (`document.queryCommandState`).

### Response questions (Google Forms–style)
Question blocks are added inline among text blocks via `AddBlockMenu`. Each is edited by `QuestionEditor`. Curated question types for gathering input from recipients:

| Type | Notes |
|------|-------|
| Short answer | single-line text |
| Paragraph | multi-line text |
| Multiple choice | single-select radio + editable options |
| Checkboxes | multi-select + editable options |
| Dropdown | compact single-select + editable options |
| Yes / No | boolean |
| Linear scale | configurable 1..N (3–10) with optional low/high labels |
| Star rating | 5-star |
| Date | date picker |
| File upload | highlight clips / documents |

Each question (`QuestionEditor`) supports: editable prompt, type switch, options editor (add/remove), scale config, **Required** toggle, **duplicate**, **delete**, **reorder** (up/down), and **add block below** (insert text or another question right after). Question blocks show a `Q1`, `Q2`… ordinal counting only question blocks (text blocks don't consume a number). `makeQuestion(type)` seeds sensible defaults per type.

This curated set was chosen from the full Google Forms list — grids, ranking/drag-drop, and signature inputs were intentionally skipped for a focused first pass.

### Form / Preview tabs
Two tabs sit above the composer body:
- **Form** — shows `BlockComposer`: the ordered list of text + question blocks
- **Preview** — renders `NotificationPreview`: the in-app notification card rendering the blocks **in order** (text via HTML, questions via `QuestionPreviewField` interactive sample fields), plus a "Submit response" button when any question exists

Preview replaces `{{firstName}}`, `{{teamName}}`, `{{email}}` merge tags with sample values.

### Actions
A footer bar at the bottom of the form has:
- **Test Send** — opens `TestSendModal`; enter test email + name + team; calls `POST /admin/notifications/send` with `testRecipient`
- **Send Notification** — opens `SendConfirmModal`; confirms audience; calls `POST /admin/notifications/send` without `testRecipient`

Both buttons are disabled until `title + subject + body` are all non-empty (`canCompose`).

Error and success states are shown via `AdminAlert` banners above the form (non-blocking, inline).

### Past Notifications
Demo data (`DEMO_PAST`) powers the section until a real API endpoint exists.

**KPI strip** — 4 tiles: Total notifications sent, Total recipients reached, Total opens, Avg open rate.

**Search** — client-side filter across title, subject, and audienceLabel.

**Table columns** — Notification, Sent date, Recipients, Opens, Open rate (color-coded badge), Responses (count, accent-highlighted when > 0), Details button.

**Details modal** (`NotifDetailModal`) opens when clicking a row's Details button and shows:
- Meta row with In-App badge + Sent badge + sent date + audience label
- 4 KPI tiles: recipients, opens (with open rate %), clicks (with click rate %), responses
- Opens-by-day area chart (recharts `AreaChart`)
- Device breakdown pie chart (recharts `PieChart`) + legend
- Notification body preview
- **Collected responses** (`ResponseAnalytics`): per-question horizontal bar charts for choice/scale/rating distributions (with % of total and average for rating/scale), and quoted sample lists for free-text questions. An **Export CSV** button (`exportResponsesCsv`) downloads the flattened response data.

## Key decisions

- **Demo data only for past notifications** — no backend endpoint wired yet; the send actions call `POST /admin/notifications/send` which will 404 and display a warning banner (non-breaking).
- **contentEditable body editor** — reuses the same execCommand pattern from `AdminEmailPage` to keep the approach consistent and avoid pulling in a heavy editor library.
- **Inline composer** — body editor is part of the same scrollable form, not a separate route, matching the "single notification command center" requirement.
- **ownerOnly** — matches the access level for Email and Staff pages.
- **No separate page for details** — detail analytics open in a modal to keep the workflow in one place.

## Files changed

| File | Change |
|------|--------|
| `src/pages/AdminNotificationsPage.jsx` | Created — full page |
| `src/admin/components/AdminSidebar.jsx` | Added `NotificationsIcon` + nav item |
| `src/admin/components/AdminNav.jsx` | Added nav item |
| `src/App.jsx` | Added import + `/admin/notifications` route |
| `admin/test/adminNotifications.test.js` | Created — unit tests |
