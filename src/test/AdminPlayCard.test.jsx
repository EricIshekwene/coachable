// @vitest-environment jsdom
/**
 * AdminPlayCard.test.jsx
 *
 * RTL rendering tests for src/admin/components/AdminPlayCard.jsx.
 * Verifies that permission flags (canEdit, canDelete, canDuplicate, etc.)
 * control which actions are visible in the card and its three-dots menu.
 *
 * PlayPreviewCard is mocked to a no-op to avoid canvas/animation deps.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../components/PlayPreviewCard.jsx', () => ({ default: () => null }))

import AdminPlayCard from '../admin/components/AdminPlayCard'

const basePlay = {
  id: 'p1',
  title: 'Test Play',
  playData: null,
  tags: [],
  createdAt: null,
}

/** Build a minimal valid props object, all permissions off by default. */
function makeProps(overrides = {}) {
  return {
    play: basePlay,
    folders: [],
    playbookSections: [],
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onAddToSection: vi.fn(),
    onTagsUpdate: vi.fn(),
    ...overrides,
  }
}

describe('AdminPlayCard — title', () => {
  it('renders the play title', () => {
    render(<AdminPlayCard {...makeProps()} />)
    expect(screen.getByText('Test Play')).toBeInTheDocument()
  })
})

describe('AdminPlayCard — canEdit permission', () => {
  it('hides the Edit button when canEdit is false (default)', () => {
    render(<AdminPlayCard {...makeProps()} />)
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows the Edit button when canEdit is true', () => {
    render(<AdminPlayCard {...makeProps({ canEdit: true })} />)
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })
})

describe('AdminPlayCard — three-dots menu gate', () => {
  it('renders no buttons at all when no permissions are set', () => {
    render(<AdminPlayCard {...makeProps()} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('shows the three-dots trigger when at least one secondary action is permitted', () => {
    render(<AdminPlayCard {...makeProps({ canDelete: true })} />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})

describe('AdminPlayCard — Delete permission', () => {
  it('shows Delete in the menu when canDelete is true', () => {
    render(<AdminPlayCard {...makeProps({ canDelete: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('does not show Delete when canDelete is false', () => {
    render(<AdminPlayCard {...makeProps({ canCopyShareLinks: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })
})

describe('AdminPlayCard — Copy link permission', () => {
  it('shows Copy shareable link when canCopyShareLinks is true', () => {
    render(<AdminPlayCard {...makeProps({ canCopyShareLinks: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/copy shareable link/i)).toBeInTheDocument()
  })

  it('does not show Copy shareable link when canCopyShareLinks is false', () => {
    render(<AdminPlayCard {...makeProps({ canDelete: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText(/copy shareable link/i)).not.toBeInTheDocument()
  })
})

describe('AdminPlayCard — Duplicate permission', () => {
  it('shows Duplicate when canDuplicate is true', () => {
    render(<AdminPlayCard {...makeProps({ canDuplicate: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Duplicate')).toBeInTheDocument()
  })
})

describe('AdminPlayCard — Rename permission', () => {
  it('shows Rename when canRename is true', () => {
    render(<AdminPlayCard {...makeProps({ canRename: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Rename')).toBeInTheDocument()
  })
})
