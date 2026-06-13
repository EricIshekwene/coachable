// @vitest-environment jsdom
/**
 * PlayCard.test.jsx
 *
 * RTL rendering tests for src/components/PlayCard.jsx.
 * Covers: title rendering, bulk-mode checkbox visibility, isCoach permission
 * gate (context menu trigger), canPostToCommunity gate, and the click behavior
 * in bulk mode (calls onToggleSelect instead of onOpen).
 *
 * PlayPreviewCard is mocked to a no-op to avoid canvas/animation deps.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../components/PlayPreviewCard.jsx', () => ({ default: () => null }))

import PlayCard from '../components/PlayCard'

const basePlay = {
  id: 'play-1',
  title: 'Zone Defense',
  playData: null,
  tags: [],
  favorited: false,
  hiddenFromPlayers: false,
}

/** Build a minimal valid props object. isCoach=true and all handlers are stubs. */
function makeProps(overrides = {}) {
  return {
    play: basePlay,
    isCoach: true,
    bulkMode: false,
    selected: false,
    inFolder: false,
    hasFolders: false,
    canEdit: true,
    canPostToCommunity: false,
    onToggleSelect: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onToggleFavorite: vi.fn(),
    onShare: vi.fn(),
    onDuplicate: vi.fn(),
    onToggleHidden: vi.fn(),
    onPostToCommunity: vi.fn(),
    onRename: vi.fn(),
    onMoveRequest: vi.fn(),
    onRemoveFromFolder: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
}

describe('PlayCard — content', () => {
  it('renders the play title', () => {
    render(<PlayCard {...makeProps()} />)
    expect(screen.getByText('Zone Defense')).toBeInTheDocument()
  })
})

describe('PlayCard — bulk-mode checkbox', () => {
  it('does not show the bulk checkbox when bulkMode is false', () => {
    const { container } = render(<PlayCard {...makeProps({ bulkMode: false })} />)
    // The checkbox icon container has the unique z-10 class
    expect(container.querySelector('.z-10')).toBeNull()
  })

  it('shows the bulk checkbox when bulkMode is true', () => {
    const { container } = render(<PlayCard {...makeProps({ bulkMode: true })} />)
    expect(container.querySelector('.z-10')).not.toBeNull()
  })

  it('calls onToggleSelect with the play id when card is clicked in bulk mode', () => {
    const onToggleSelect = vi.fn()
    const { container } = render(
      <PlayCard {...makeProps({ bulkMode: true, onToggleSelect })} />
    )
    fireEvent.click(container.querySelector('[data-component="PlayCard"]'))
    expect(onToggleSelect).toHaveBeenCalledWith('play-1')
  })
})

describe('PlayCard — isCoach permission gate', () => {
  // Use canEdit:false throughout so the only button is the three-dots trigger,
  // keeping each test focused on the isCoach gate specifically.

  it('does not show the context menu trigger when isCoach is false', () => {
    render(<PlayCard {...makeProps({ isCoach: false, canEdit: false })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the context menu trigger when isCoach is true', () => {
    render(<PlayCard {...makeProps({ isCoach: true, canEdit: false })} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens the context menu and shows core actions when the trigger is clicked', () => {
    render(<PlayCard {...makeProps({ isCoach: true, canEdit: false })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Move to Trash')).toBeInTheDocument()
  })
})

describe('PlayCard — canPostToCommunity gate', () => {
  it('shows "Post to Community" when canPostToCommunity is true', () => {
    render(<PlayCard {...makeProps({ isCoach: true, canEdit: false, canPostToCommunity: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Post to Community')).toBeInTheDocument()
  })

  it('hides "Post to Community" when canPostToCommunity is false', () => {
    render(<PlayCard {...makeProps({ isCoach: true, canEdit: false, canPostToCommunity: false })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Post to Community')).not.toBeInTheDocument()
  })
})
