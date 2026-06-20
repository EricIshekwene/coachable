/**
 * Plays page — Browse section — Flow tests
 *
 * Covers multi-step user interactions that are role-gated.
 * All tests are async — they use userEvent to simulate real user behavior.
 *
 * Role visibility tests are in roles.test.js in this folder.
 */

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderAs } from '../../../tests/renderAs'
import { assertVisible, assertHidden } from '../../../tests/assertions'
import PlaysPage from '../../Plays'

// -- Selectors ---------------------------------------------------------------

const playContextMenuBtn  = (name) => screen.queryByRole('button', { name: new RegExp(`options.*${name}`, 'i') })
const hideFromPlayersBtn  = () => screen.queryByRole('menuitem', { name: /hide from players/i })
const showToPlayersBtn    = () => screen.queryByRole('menuitem', { name: /show to players/i })
const hiddenBadge         = (name) => screen.queryByTitle(new RegExp(`${name}.*hidden`, 'i'))
const bulkModeButton      = () => screen.queryByRole('button', { name: /select/i })
const playCheckbox        = (name) => screen.queryByRole('checkbox', { name: new RegExp(name, 'i') })
const deleteSelectedBtn   = () => screen.queryByRole('button', { name: /delete selected/i })
const playCard            = (name) => screen.queryByText(name)

// -- Hide from players flow --------------------------------------------------

/**
 * @test     Plays page — Hide play from players flow
 * @role     coach
 * @assert   positive
 * @steps    1. Open play context menu → 2. Click "Hide from Players" → 3. Hidden badge appears on card
 * @when     At least one play exists in the list, play is currently visible to players
 * @timing   <200ms
 */
test('coach can hide a play from players', async () => {
  renderAs('coach', <PlaysPage />)
  await userEvent.click(playContextMenuBtn('Summer Offense'))
  await userEvent.click(hideFromPlayersBtn())
  assertVisible(hiddenBadge('Summer Offense'))
})

/**
 * @test     Plays page — Hide play from players flow
 * @role     player
 * @assert   negative
 * @steps    1. Player views the play list — context menu is absent
 * @when     Page first loads
 * @timing   <100ms
 */
test('player cannot open a play context menu to hide plays', async () => {
  renderAs('player', <PlaysPage />)
  assertHidden(playContextMenuBtn('Summer Offense'))
})

// -- Show to players flow (reverse) ------------------------------------------

/**
 * @test     Plays page — Show hidden play to players flow
 * @role     coach
 * @assert   positive
 * @steps    1. Open context menu on hidden play → 2. Click "Show to Players" → 3. Hidden badge disappears
 * @when     A play is already marked hiddenFromPlayers: true
 * @timing   <200ms
 */
test('coach can show a hidden play back to players', async () => {
  renderAs('coach', <PlaysPage />, {
    plays: [{ id: '1', name: 'Summer Offense', hiddenFromPlayers: true }],
  })
  await userEvent.click(playContextMenuBtn('Summer Offense'))
  await userEvent.click(showToPlayersBtn())
  assertHidden(hiddenBadge('Summer Offense'))
})

// -- Bulk select and delete flow ---------------------------------------------

/**
 * @test     Plays page — Bulk select and delete flow
 * @role     coach
 * @assert   positive
 * @steps    1. Click bulk mode → 2. Check a play → 3. Delete Selected button appears → 4. Click delete → 5. Play removed from list
 * @when     At least one play exists, bulk mode is off
 * @timing   <300ms
 */
test('coach can bulk select and delete plays', async () => {
  renderAs('coach', <PlaysPage />)
  await userEvent.click(bulkModeButton())
  await userEvent.click(playCheckbox('Summer Offense'))
  assertVisible(deleteSelectedBtn())
  await userEvent.click(deleteSelectedBtn())
  assertHidden(playCard('Summer Offense'))
})

/**
 * @test     Plays page — Bulk select and delete flow
 * @role     player
 * @assert   negative
 * @steps    1. Bulk mode button is absent — flow cannot be started
 * @when     Page first loads
 * @timing   <100ms
 */
test('player cannot enter bulk mode', async () => {
  renderAs('player', <PlaysPage />)
  assertHidden(bulkModeButton())
})

// -- Player view mode (coach simulating player) ------------------------------

/**
 * @test     Plays page — Hidden play visibility in player view mode
 * @role     coach (playerViewMode: true)
 * @assert   negative
 * @steps    1. Coach enables player view mode → 2. Hidden play is not shown in the list
 * @when     A play with hiddenFromPlayers: true exists, coach is in player view mode
 * @timing   <100ms
 */
test('coach in player view mode does not see hidden plays', async () => {
  renderAs('coach', <PlaysPage />, {
    playerViewMode: true,
    plays: [{ id: '1', name: 'Summer Offense', hiddenFromPlayers: true }],
  })
  assertHidden(playCard('Summer Offense'))
})
