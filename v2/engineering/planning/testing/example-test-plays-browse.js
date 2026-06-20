/**
 * Example test file — Plays page, browse function
 * Location in v2: src/app/pages/tests/plays.browse/roles.test.js
 *
 * This file demonstrates the Coachable UI testing standard as applied to a
 * real page. Tests do not need to run — this is a reference example.
 * See ui-testing-standards.md for the full standard.
 */

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAs } from '../../../../tests/renderAs'
import { assertVisible, assertHidden } from '../../../../tests/assertions'
import PlaysPage from '../../Plays'

// ---------------------------------------------------------------------------
// Selectors — all element queries live here, test bodies stay clean
// ---------------------------------------------------------------------------

const newPlayButton     = () => screen.queryByRole('link',   { name: /new play/i })
const newFolderButton   = () => screen.queryByRole('button', { name: /new folder/i })
const trashButton       = () => screen.queryByRole('button', { name: /trash/i })
const bulkSelectButton  = () => screen.queryByRole('button', { name: /select/i })
const searchInput       = () => screen.queryByRole('searchbox')
const playbookHeading   = () => screen.queryByRole('heading', { name: /playbook/i })

// ---------------------------------------------------------------------------
// Role 1 (coach) — can see all authoring controls
// ---------------------------------------------------------------------------

/**
 * @test     Plays page — New Play button visibility
 * @role     role1 (coach)
 * @assert   positive
 * @expect   "New Play" link is present in the page header
 * @when     Desktop viewport, page first loads with no plays
 */
test('role1 sees the New Play button', () => {
  renderAs('role1', <PlaysPage />)
  assertVisible(newPlayButton())
})

/**
 * @test     Plays page — New Folder button visibility
 * @role     role1 (coach)
 * @assert   positive
 * @expect   "New Folder" button is present in the page header
 * @when     Page first loads, folder depth is 0 (root level)
 */
test('role1 sees the New Folder button', () => {
  renderAs('role1', <PlaysPage />)
  assertVisible(newFolderButton())
})

/**
 * @test     Plays page — Trash button visibility
 * @role     role1 (coach)
 * @assert   positive
 * @expect   Trash icon button is present in the page header
 * @when     Page first loads
 */
test('role1 sees the trash button', () => {
  renderAs('role1', <PlaysPage />)
  assertVisible(trashButton())
})

/**
 * @test     Plays page — Bulk select button visibility
 * @role     role1 (coach)
 * @assert   positive
 * @expect   Bulk select toggle button is present in the page header
 * @when     Page first loads, bulk mode is off
 */
test('role1 sees the bulk select button', () => {
  renderAs('role1', <PlaysPage />)
  assertVisible(bulkSelectButton())
})

/**
 * @test     Plays page — Search input visibility
 * @role     role1 (coach)
 * @assert   positive
 * @expect   Search input is present
 * @when     Page first loads
 */
test('role1 sees the search input', () => {
  renderAs('role1', <PlaysPage />)
  assertVisible(searchInput())
})

// ---------------------------------------------------------------------------
// Role 2 (player) — browse-only, no authoring controls
// ---------------------------------------------------------------------------

/**
 * @test     Plays page — New Play button visibility
 * @role     role2 (player)
 * @assert   negative
 * @expect   "New Play" link is NOT present
 * @when     Page first loads
 */
test('role2 does not see the New Play button', () => {
  renderAs('role2', <PlaysPage />)
  assertHidden(newPlayButton())
})

/**
 * @test     Plays page — New Folder button visibility
 * @role     role2 (player)
 * @assert   negative
 * @expect   "New Folder" button is NOT present
 * @when     Page first loads
 */
test('role2 does not see the New Folder button', () => {
  renderAs('role2', <PlaysPage />)
  assertHidden(newFolderButton())
})

/**
 * @test     Plays page — Trash button visibility
 * @role     role2 (player)
 * @assert   negative
 * @expect   Trash button is NOT present
 * @when     Page first loads
 */
test('role2 does not see the trash button', () => {
  renderAs('role2', <PlaysPage />)
  assertHidden(trashButton())
})

/**
 * @test     Plays page — Bulk select button visibility
 * @role     role2 (player)
 * @assert   negative
 * @expect   Bulk select button is NOT present
 * @when     Page first loads
 */
test('role2 does not see the bulk select button', () => {
  renderAs('role2', <PlaysPage />)
  assertHidden(bulkSelectButton())
})

/**
 * @test     Plays page — Search input visibility
 * @role     role2 (player)
 * @assert   positive
 * @expect   Search input IS present — players can search
 * @when     Page first loads
 */
test('role2 sees the search input', () => {
  renderAs('role2', <PlaysPage />)
  assertVisible(searchInput())
})

/**
 * @test     Plays page — Page heading
 * @role     role2 (player)
 * @assert   positive
 * @expect   "Playbook" heading is present — players see the same page title
 * @when     Page first loads at root level (no folder selected)
 */
test('role2 sees the Playbook heading', () => {
  renderAs('role2', <PlaysPage />)
  assertVisible(playbookHeading())
})

// ---------------------------------------------------------------------------
// playerViewMode — coach simulating player view
// A coach with playerViewMode active should see the same restricted UI as role2
// ---------------------------------------------------------------------------

/**
 * @test     Plays page — New Play button in playerViewMode
 * @role     role1 (coach) with playerViewMode: true
 * @assert   negative
 * @expect   "New Play" link is NOT present — coach is simulating player view
 * @when     Coach has toggled playerViewMode on
 */
test('role1 in playerViewMode does not see the New Play button', () => {
  renderAs('role1', <PlaysPage />, { playerViewMode: true })
  assertHidden(newPlayButton())
})

/**
 * @test     Plays page — Bulk select button in playerViewMode
 * @role     role1 (coach) with playerViewMode: true
 * @assert   negative
 * @expect   Bulk select button is NOT present
 * @when     Coach has toggled playerViewMode on
 */
test('role1 in playerViewMode does not see the bulk select button', () => {
  renderAs('role1', <PlaysPage />, { playerViewMode: true })
  assertHidden(bulkSelectButton())
})
