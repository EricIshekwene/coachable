# V1 migration admission audit and terminal release

This is a non-production operator procedure. It does not authorize a
production migration, rollback, data repair, deployment, configuration change,
or importer run.

## Read-only evidence report

An owner-equivalent authenticated operator can request:

`GET /admin/migration-admission/teams/:teamId/report`

The report is read-only. It retains the exact V1 fence generation and
acknowledgement time, and lists any V1 membership whose `joined_at` is at or
after that acknowledgement. Each membership has its V1 membership/user IDs,
timestamp, and a keyed evidence fingerprint. The report never returns a
standing code, password, bearer secret, email invite token, or V2 intent.

Each target-code resolver also records its permit/refusal decision separately
from the admission transaction using only the decision, source, team/fence
references when available, and a keyed standing-code fingerprint. That
separation means a deliberately rolled-back refusal remains reviewable.

Use it to compare source evidence with V2 under an approved incident process.
Do not use it to automatically match identities by email, issue invitations,
backfill, delete memberships, or otherwise repair data.

## Terminal rollback/failure release

Only an owner-equivalent authenticated operator can request:

`POST /admin/migration-admission/fence-release`

The request must name the exact V1 team/fence generation, a V2 rollback-evidence
UUID, and terminal outcome `rollback` or `failed`. V1 authenticates that UUID
with V2 and obtains both rollback timestamps (`rollbackCompletedAt` and
`v1FenceReleasePermittedAt`) solely from the authenticated V2 attestation;
neither timestamp is caller-supplied. V1 writes an immutable
`v2_rollback_evidence` record before it releases the matching fence, then writes
a linked `fence_release` record in the same transaction. An unknown or different
generation is refused; a release is never automatic and no repair/deletion is
performed.

Before a real rollback, follow the authoritative D4/D9 order: freeze and
invalidate V2 admissions, complete and audit the V2 rollback, record that
evidence through this authorized operator boundary, verify a fresh `v1_only`
state, and only then re-enable V1 admission. Obtain the required production
approval before any production operation.
