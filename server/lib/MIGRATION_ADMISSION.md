# Migration admission boundary

`migrationAdmission.js` is the only V1 server helper for a standing team code
that could create a membership or begin an invitation flow. Callers must open a
database transaction first and call `resolveTargetCodeAdmission()` with that
transaction client. It resolves the local code, holds the V1-1 team lock while
reading the durable fence, and accepts only an explicit fresh contract-v1
migration-status row.

`v1_only` permits V1's legacy flow. Fenced, migrating, missing, stale, or
invalid status is refused with `TEAM_MIGRATION_IN_PROGRESS`. `v2_live` never
creates a V1 identity, session, onboarding update, or membership: V1 sends the
raw code only to V2's authenticated `/api/admission/legacy-code` endpoint and
returns V2's opaque intent handle.

The handoff needs `V1_ADMISSION_SECRET` and `V2_ADMISSION_BASE_URL` (or the
existing `V2_BASE_URL`). Values must remain server-only and must never be put in
browser state or logs. V2-2 currently has no authenticated native email-delivery
endpoint, so V1 deliberately refuses live-team email invitations rather than
mailing a redeemable V1 code.
