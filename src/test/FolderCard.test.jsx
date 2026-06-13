// @vitest-environment jsdom
/**
 * FolderCard.test.jsx
 *
 * RTL rendering tests for src/components/FolderCard.jsx.
 * Covers: folder name/subtitle rendering, drag-over state (visual label),
 * isCoach permission gate (three-dots menu visibility), and the inline rename
 * flow (menu → Rename → input appears, pre-filled with current name).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FolderCard from '../components/FolderCard'

const baseFolder = { id: 'f1', name: 'Offense', playIds: ['p1', 'p2'] }

/** Build a minimal valid props object. */
function makeProps(overrides = {}) {
  return {
    folder: baseFolder,
    subFolderCount: 0,
    isCoach: false,
    isDragOver: false,
    onOpen: vi.fn(),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
    onRename: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
}

describe('FolderCard — content', () => {
  it('renders the folder name', () => {
    render(<FolderCard {...makeProps()} />)
    expect(screen.getByText('Offense')).toBeInTheDocument()
  })

  it('shows the play count in the subtitle', () => {
    render(<FolderCard {...makeProps()} />)
    expect(screen.getByText('2 plays')).toBeInTheDocument()
  })

  it('uses singular "play" for exactly one play', () => {
    render(<FolderCard {...makeProps({ folder: { ...baseFolder, playIds: ['p1'] } })} />)
    expect(screen.getByText('1 play')).toBeInTheDocument()
  })

  it('includes subfolder count in the subtitle when subFolderCount > 0', () => {
    render(<FolderCard {...makeProps({ subFolderCount: 3 })} />)
    expect(screen.getByText(/3 subfolders/)).toBeInTheDocument()
  })
})

describe('FolderCard — drag-over state', () => {
  it('shows "Drop Here" label when isDragOver is true', () => {
    render(<FolderCard {...makeProps({ isDragOver: true })} />)
    expect(screen.getByText('Drop Here')).toBeInTheDocument()
  })

  it('does not show "Drop Here" when isDragOver is false', () => {
    render(<FolderCard {...makeProps({ isDragOver: false })} />)
    expect(screen.queryByText('Drop Here')).not.toBeInTheDocument()
  })
})

describe('FolderCard — isCoach permission gate', () => {
  it('does not render the three-dots menu button when isCoach is false', () => {
    render(<FolderCard {...makeProps({ isCoach: false })} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the three-dots menu button when isCoach is true', () => {
    render(<FolderCard {...makeProps({ isCoach: true })} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens the menu and shows Share / Rename / Delete when isCoach is true', () => {
    render(<FolderCard {...makeProps({ isCoach: true })} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Share Folder')).toBeInTheDocument()
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})

describe('FolderCard — inline rename flow', () => {
  it('shows an input when Rename is clicked', () => {
    render(<FolderCard {...makeProps({ isCoach: true })} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Rename'))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('pre-fills the rename input with the current folder name', () => {
    render(<FolderCard {...makeProps({ isCoach: true })} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Rename'))
    expect(screen.getByRole('textbox')).toHaveValue('Offense')
  })

  it('hides the folder name text while the rename input is active', () => {
    render(<FolderCard {...makeProps({ isCoach: true })} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Rename'))
    // The static <p> with the folder name is replaced by the <input>
    expect(screen.queryByText('Offense')).not.toBeInTheDocument()
  })
})
