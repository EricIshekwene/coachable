# Onboarding: Demo Play Seeding

## What was implemented

When a new team is created via `POST /onboarding/create-team`, the sport's designated demo play is automatically copied into the team's playbook.

## How it works

1. After the team and invite codes are created (within the same DB transaction), the server looks up the `page_sections` row whose `section_key` equals `landing.visualize.<sport>` (e.g. `landing.visualize.rugby`).
2. If that section has a `play_id` assigned (i.e. an admin has chosen a demo play for that sport), the platform play's `title`, `play_data`, and `thumbnail_url` are copied into the `plays` table for the new team.
3. If the sport is `null` (e.g. solo/pick-up accounts) or no demo play has been assigned in the admin, the step is skipped silently — team creation always succeeds.

## Key decisions

- **Reuses `page_sections`**: Admins already assign one platform play per sport to the landing page sections. Seeding reuses that same assignment so there is a single source of truth — no new tables or admin UI needed.
- **Within the transaction**: The play insert is part of the same `BEGIN…COMMIT` block as team creation, so a failure rolls back cleanly.
- **Non-blocking**: Missing section or missing `play_id` does not block team creation.

## Admin workflow

To change the seeded play for a sport, open the admin page sections panel and reassign the `landing.visualize.<sport>` section to the desired platform play. All subsequent account creations for that sport will receive the new play.

## Supported sports (page_sections seeds)

| section_key | Sport |
|---|---|
| `landing.visualize.rugby` | Rugby |
| `landing.visualize.football` | Football |
| `landing.visualize.lacrosse` | Lacrosse |
| `landing.visualize.basketball` | Basketball |
| `landing.visualize.soccer` | Soccer |
| `landing.visualize.ice_hockey` | Ice Hockey |
| `landing.visualize.field_hockey` | Field Hockey |
