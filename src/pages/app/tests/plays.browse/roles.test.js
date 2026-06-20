/**
 * Plays page — Browse section — Role visibility tests
 *
 * Covers every toolbar control and play-card action that is gated by role.
 * Uses renderAs() to mount the page as a specific identity, then asserts
 * presence or absence of each gated element.
 *
 * Does NOT test flows — see flow.test.js in this folder.
 */

import { screen } from '@testing-library/react'
import { renderAs } from '../../../tests/renderAs'
import { assertVisible, assertHidden } from '../../../tests/assertions'
import PlaysPage from '../../Plays'

// -- Selectors ---------------------------------------------------------------

const createButton        = () => screen.queryByRole('button', { name: /create/i })
const bulkModeButton      = () => screen.queryByRole('button', { name: /select/i })
const trashButton         = () => screen.queryByRole('button', { name: /trash/i })
const newFolderButton     = () => screen.queryByRole('button', { name: /new folder/i })
const hideFromPlayers     = (name) => screen.queryByRole('button', { name: new RegExp(`hide.*${name}`, 'i') })
const hiddenBadge         = (name) => screen.queryByTitle(new RegExp(`${name}.*hidden`, 'i'))

// -- Create button -----------------------------------------------------------

/**
 * @test     Plays page — Create button visibility
 * @role     coach
 * @assert   positive
 * @expect   Create button is present in the toolbar
 * @when     Page first loads, no special state
 */
test('coach sees the create button', () => {
  renderAs('coach', <PlaysPage />)
  assertVisible(createButton())
})

/**
 * @test     Plays page — Create button visibility
 * @role     player
 * @assert   negative
 * @expect   Create button is NOT present in the toolbar
 * @when     Page first loads, no special state
 */
test('player does not see the create button', () => {
  renderAs('player', <PlaysPage />)
  assertHidden(createButton())
})

/**
 * @test     Plays page — Create button visibility in player view mode
 * @role     coach (playerViewMode: true)
 * @assert   negative
 * @expect   Create button is NOT visible when coach simulates player view
 * @when     Coach has toggled player view mode on
 */
test('coach in player view mode does not see the create button', () => {
  renderAs('coach', <PlaysPage />, { playerViewMode: true })
  assertHidden(createButton())
})

// -- Bulk mode button --------------------------------------------------------

/**
 * @test     Plays page — Bulk mode button visibility
 * @role     coach
 * @assert   positive
 * @expect   Bulk select button is present in the toolbar
 * @when     Page first loads, bulk mode is off
 */
test('coach sees the bulk mode button', () => {
  renderAs('coach', <PlaysPage />)
  assertVisible(bulkModeButton())
})

/**
 * @test     Plays page — Bulk mode button visibility
 * @role     player
 * @assert   negative
 * @expect   Bulk select button is NOT present in the toolbar
 * @when     Page first loads
 */
test('player does not see the bulk mode button', () => {
  renderAs('player', <PlaysPage />)
  assertHidden(bulkModeButton())
})

// -- Trash button ------------------------------------------------------------

/**
 * @test     Plays page — Trash button visibility
 * @role     coach
 * @assert   positive
 * @expect   Trash button is present in the toolbar
 * @when     Page first loads
 */
test('coach sees the trash button', () => {
  renderAs('coach', <PlaysPage />)
  assertVisible(trashButton())
})

/**
 * @test     Plays page — Trash button visibility
 * @role     player
 * @assert   negative
 * @expect   Trash button is NOT present in the toolbar
 * @when     Page first loads
 */
test('player does not see the trash button', () => {
  renderAs('player', <PlaysPage />)
  assertHidden(trashButton())
})

// -- New folder button -------------------------------------------------------

/**
 * @test     Plays page — New folder button visibility
 * @role     coach
 * @assert   positive
 * @expect   New Folder button is present in the toolbar
 * @when     User is at the root folder level (depth 0, below the 4-folder limit)
 */
test('coach sees the new folder button at root level', () => {
  renderAs('coach', <PlaysPage />)
  assertVisible(newFolderButton())
})

/**
 * @test     Plays page — New folder button visibility
 * @role     player
 * @assert   negative
 * @expect   New Folder button is NOT present in the toolbar
 * @when     Page first loads
 */
test('player does not see the new folder button', () => {
  renderAs('player', <PlaysPage />)
  assertHidden(newFolderButton())
})

// -- Hide from players (play card action) ------------------------------------

/**
 * @test     Plays page — Hide from players option on play card
 * @role     coach
 * @assert   positive
 * @expect   Hide from Players action is available on a play card context menu
 * @when     A play exists in the list and its menu is open
 */
test('coach sees hide from players option on a play card', () => {
  renderAs('coach', <PlaysPage />)
  assertVisible(hideFromPlayers('Summer Offense'))
})

/**
 * @test     Plays page — Hide from players option on play card
 * @role     player
 * @assert   negative
 * @expect   Hide from Players action is NOT available to players
 * @when     A play exists in the list
 */
test('player does not see hide from players option', () => {
  renderAs('player', <PlaysPage />)
  assertHidden(hideFromPlayers('Summer Offense'))
})

// -- Hidden badge on play card -----------------------------------------------

/**
 * @test     Plays page — Hidden badge visibility on play card
 * @role     coach
 * @assert   positive
 * @expect   Hidden badge is visible on a play that is marked hiddenFromPlayers
 * @when     A play with hiddenFromPlayers: true exists in the list
 */
test('coach sees the hidden badge on a hidden play', () => {
  renderAs('coach', <PlaysPage />, { plays: [{ id: '1', name: 'Summer Offense', hiddenFromPlayers: true }] })
  assertVisible(hiddenBadge('Summer Offense'))
})

/**
 * @test     Plays page — Hidden badge visibility on play card
 * @role     player
 * @assert   negative
 * @expect   Hidden plays are not shown to players at all — badge is irrelevant
 * @when     A play with hiddenFromPlayers: true exists in the list
 */
test('player does not see hidden plays in the list', () => {
  renderAs('player', <PlaysPage />, { plays: [{ id: '1', name: 'Summer Offense', hiddenFromPlayers: true }] })
  assertHidden(screen.queryByText('Summer Offense'))
})
