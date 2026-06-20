/**
 * Example test file — Plays route, list endpoint
 * Location in v2: server/tests/routes/plays/plays.list.test.js
 *
 * This file demonstrates the Coachable server testing standard as applied to a
 * real route. Tests do not need to run — this is a reference example.
 * See server-testing-standards.md for the full standard.
 */

import { describe, beforeAll, test, expect } from 'vitest'
import { pool } from '../../../db/pool.js'
import { requestAs } from '../../helpers/requestAs.js'
import { seed } from '../../helpers/seed.js'
import {
  expectOk,
  expectUnauthorized,
  expectForbidden,
} from '../../helpers/assertions.js'

// ---------------------------------------------------------------------------
// Isolation — truncate once for this file, fresh identity per test via requestAs
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await pool.query(`
    TRUNCATE users, teams, team_memberships, plays, folders, play_tags, play_tag_links CASCADE
  `)
})

// ---------------------------------------------------------------------------
// Role 1 (coach) — sees all plays including hidden ones
// ---------------------------------------------------------------------------

/**
 * @test     Plays list — coach sees all plays
 * @route    GET /teams/:teamId/plays
 * @role     role1 (coach)
 * @assert   positive
 * @status   200
 * @expect   Response includes all plays, including plays with hiddenFromPlayers true
 * @when     Team has 2 plays: 1 visible, 1 hidden from players
 */
test('role1 receives all plays including hidden ones', async () => {
  const { agent, teamId } = await requestAs('role1')
  await seed.play(teamId, { title: 'Press Break', hiddenFromPlayers: false })
  await seed.play(teamId, { title: 'Zone 2-3',    hiddenFromPlayers: true })

  const res = await agent.get(`/teams/${teamId}/plays`)

  expectOk(res)
  expect(res.body).toHaveLength(2)
  expect(res.body).toContainEqual(expect.objectContaining({ title: 'Press Break' }))
  expect(res.body).toContainEqual(expect.objectContaining({ title: 'Zone 2-3' }))
})

/**
 * @test     Plays list — coach sees empty list when no plays exist
 * @route    GET /teams/:teamId/plays
 * @role     role1 (coach)
 * @assert   positive
 * @status   200
 * @expect   Response is an empty array, not an error
 * @when     Team has no plays
 */
test('role1 receives an empty array when the team has no plays', async () => {
  const { agent, teamId } = await requestAs('role1')

  const res = await agent.get(`/teams/${teamId}/plays`)

  expectOk(res)
  expect(res.body).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// Role 2 (player) — sees only plays not hidden from players
// ---------------------------------------------------------------------------

/**
 * @test     Plays list — player sees only visible plays
 * @route    GET /teams/:teamId/plays
 * @role     role2 (player)
 * @assert   positive
 * @status   200
 * @expect   Response includes only plays where hiddenFromPlayers is false
 * @when     Team has 2 plays: 1 visible, 1 hidden from players
 */
test('role2 receives only plays visible to players', async () => {
  const { agent, teamId } = await requestAs('role2')
  await seed.play(teamId, { title: 'Press Break', hiddenFromPlayers: false })
  await seed.play(teamId, { title: 'Zone 2-3',    hiddenFromPlayers: true })

  const res = await agent.get(`/teams/${teamId}/plays`)

  expectOk(res)
  expect(res.body).toHaveLength(1)
  expect(res.body[0]).toMatchObject({ title: 'Press Break' })
  expect(res.body).not.toContainEqual(expect.objectContaining({ title: 'Zone 2-3' }))
})

/**
 * @test     Plays list — player cannot access another team's plays
 * @route    GET /teams/:teamId/plays
 * @role     role2 (player)
 * @assert   negative
 * @status   403
 * @expect   Request is rejected — player is not a member of the target team
 * @when     teamId belongs to a different team the player has no membership on
 */
test('role2 cannot list plays for a team they are not a member of', async () => {
  const { agent }           = await requestAs('role2')
  const { teamId: otherTeam } = await requestAs('role1')

  const res = await agent.get(`/teams/${otherTeam}/plays`)

  expectForbidden(res)
})

// ---------------------------------------------------------------------------
// Unauthenticated — no token at all
// ---------------------------------------------------------------------------

/**
 * @test     Plays list — unauthenticated request is rejected
 * @route    GET /teams/:teamId/plays
 * @role     unauthenticated
 * @assert   negative
 * @status   401
 * @expect   Error body returned, no play data
 * @when     Any DB state
 */
test('unauthenticated request is rejected with 401', async () => {
  const { agent, teamId } = await requestAs('unauthenticated')

  const res = await agent.get(`/teams/${teamId}/plays`)

  expectUnauthorized(res)
  expect(res.body).not.toHaveProperty('plays')
})
