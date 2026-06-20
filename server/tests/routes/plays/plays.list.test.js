/**
 * GET /teams/:teamId/plays — role-based play list tests
 *
 * Covers: auth enforcement, role-based filtering (hiddenFromPlayers),
 * and response shape. Uses requestAs() for identity, seed.* for data.
 *
 * Mutation tests (create, update, delete) live in their own files.
 */

import { describe, test, beforeAll } from 'vitest'
import pool from '../../../db/pool.js'
import { requestAs } from '../../helpers/requestAs.js'
import { seed } from '../../helpers/seed.js'
import { expectOk, expectUnauthorized, expectForbidden } from '../../helpers/assertions.js'

beforeAll(async () => {
  await pool.query(`
    TRUNCATE users, teams, team_memberships, plays, folders,
             play_tags, play_tag_links CASCADE
  `)
})

// -- Unauthenticated ---------------------------------------------------------

/**
 * @test     Unauthenticated request is rejected
 * @route    GET /teams/:teamId/plays
 * @role     unauthenticated
 * @assert   negative
 * @status   401
 * @expect   Error body, no play data returned
 * @when     Any DB state
 */
test('unauthenticated request gets 401', async () => {
  const { agent, teamId } = await requestAs('unauthenticated')
  const res = await agent.get(`/teams/${teamId}/plays`)
  expectUnauthorized(res)
})

// -- Non-member --------------------------------------------------------------

/**
 * @test     Non-member of the team cannot access plays
 * @route    GET /teams/:teamId/plays
 * @role     coach (of a different team)
 * @assert   negative
 * @status   403
 * @expect   Error body — not a member of this team
 * @when     Requesting a teamId the user does not belong to
 */
test('user who is not a team member gets 403', async () => {
  const { agent } = await requestAs('coach')
  const { teamId: otherTeamId } = await requestAs('coach')
  const res = await agent.get(`/teams/${otherTeamId}/plays`)
  expectForbidden(res)
})

// -- Coach -------------------------------------------------------------------

/**
 * @test     Coach sees all plays including hidden ones
 * @route    GET /teams/:teamId/plays
 * @role     coach
 * @assert   positive
 * @status   200
 * @expect   Response includes plays with hiddenFromPlayers true and false
 * @when     Team has 2 plays — one visible, one hidden from players
 */
test('coach sees all plays including hidden ones', async () => {
  const { agent, teamId } = await requestAs('coach')
  await seed.play(teamId, { title: 'Press Break',  hiddenFromPlayers: false })
  await seed.play(teamId, { title: 'Zone Defense', hiddenFromPlayers: true })

  const res = await agent.get(`/teams/${teamId}/plays`)
  expectOk(res)
  expect(res.body).toHaveLength(2)
  expect(res.body.some((p) => p.hiddenFromPlayers === true)).toBe(true)
})

/**
 * @test     Coach response includes all expected play fields
 * @route    GET /teams/:teamId/plays
 * @role     coach
 * @assert   positive
 * @status   200
 * @expect   Each play has id, title, tags, playData, hiddenFromPlayers, createdAt, updatedAt
 * @when     Team has one play
 */
test('coach response contains correct play shape', async () => {
  const { agent, teamId } = await requestAs('coach')
  await seed.play(teamId, { title: 'Press Break' })

  const res = await agent.get(`/teams/${teamId}/plays`)
  expectOk(res)
  expect(res.body[0]).toMatchObject({
    title: 'Press Break',
    tags: expect.any(Array),
    hiddenFromPlayers: expect.any(Boolean),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  })
})

/**
 * @test     Coach sees empty list when team has no plays
 * @route    GET /teams/:teamId/plays
 * @role     coach
 * @assert   positive
 * @status   200
 * @expect   Empty array — no error
 * @when     Team has no plays
 */
test('coach gets empty array when team has no plays', async () => {
  const { agent, teamId } = await requestAs('coach')
  const res = await agent.get(`/teams/${teamId}/plays`)
  expectOk(res)
  expect(res.body).toHaveLength(0)
})

// -- Player ------------------------------------------------------------------

/**
 * @test     Player sees only visible plays
 * @route    GET /teams/:teamId/plays
 * @role     player
 * @assert   positive
 * @status   200
 * @expect   Response excludes plays where hiddenFromPlayers is true
 * @when     Team has 2 plays — one visible, one hidden from players
 */
test('player only sees plays not hidden from players', async () => {
  const { agent, teamId } = await requestAs('player')
  await seed.play(teamId, { title: 'Press Break',  hiddenFromPlayers: false })
  await seed.play(teamId, { title: 'Zone Defense', hiddenFromPlayers: true })

  const res = await agent.get(`/teams/${teamId}/plays`)
  expectOk(res)
  expect(res.body).toHaveLength(1)
  expect(res.body[0]).toMatchObject({ title: 'Press Break' })
  expect(res.body).not.toContainEqual(
    expect.objectContaining({ hiddenFromPlayers: true })
  )
})

/**
 * @test     Player gets empty list when all plays are hidden
 * @route    GET /teams/:teamId/plays
 * @role     player
 * @assert   positive
 * @status   200
 * @expect   Empty array — all plays filtered out
 * @when     Team has 2 plays, both hidden from players
 */
test('player gets empty list when all plays are hidden', async () => {
  const { agent, teamId } = await requestAs('player')
  await seed.play(teamId, { title: 'Zone Defense', hiddenFromPlayers: true })
  await seed.play(teamId, { title: 'Press Break',  hiddenFromPlayers: true })

  const res = await agent.get(`/teams/${teamId}/plays`)
  expectOk(res)
  expect(res.body).toHaveLength(0)
})

/**
 * @test     Player response does not expose hiddenFromPlayers field as true
 * @route    GET /teams/:teamId/plays
 * @role     player
 * @assert   negative
 * @status   200
 * @expect   No play in the response has hiddenFromPlayers true — they are filtered, not redacted
 * @when     Team has 1 visible play, 1 hidden play
 */
test('player response never contains a play with hiddenFromPlayers true', async () => {
  const { agent, teamId } = await requestAs('player')
  await seed.play(teamId, { title: 'Visible Play', hiddenFromPlayers: false })
  await seed.play(teamId, { title: 'Hidden Play',  hiddenFromPlayers: true })

  const res = await agent.get(`/teams/${teamId}/plays`)
  expectOk(res)
  res.body.forEach((play) => {
    expect(play.hiddenFromPlayers).toBe(false)
  })
})
