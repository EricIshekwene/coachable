// @vitest-environment jsdom
/**
 * AppHeader.test.jsx
 *
 * RTL rendering tests for src/components/layout/AppHeader.jsx.
 * Verifies title rendering, back-link presence/absence, custom back label,
 * subtitle, actions slot, and extra children slot.
 *
 * AppHeader uses react-router-dom's <Link>, so all renders are wrapped in
 * <MemoryRouter> to satisfy the router context requirement.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppHeader from '../components/layout/AppHeader'

/** Renders AppHeader inside a MemoryRouter. */
function renderHeader(props = {}) {
  return render(
    <MemoryRouter>
      <AppHeader {...props} />
    </MemoryRouter>
  )
}

describe('AppHeader', () => {
  it('renders the title as an h1', () => {
    renderHeader({ title: 'My Page' })
    expect(screen.getByRole('heading', { level: 1, name: 'My Page' })).toBeInTheDocument()
  })

  it('renders the subtitle when provided', () => {
    renderHeader({ subtitle: 'Some description' })
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  it('renders a back link when backTo is provided', () => {
    renderHeader({ backTo: '/app/plays' })
    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('uses a custom back label when backLabel is provided', () => {
    renderHeader({ backTo: '/app/plays', backLabel: 'Plays' })
    expect(screen.getByText('Plays')).toBeInTheDocument()
  })

  it('does not render a back link when backTo is absent', () => {
    renderHeader({ title: 'No Back' })
    expect(screen.queryByText('Back')).not.toBeInTheDocument()
  })

  it('renders the actions slot', () => {
    renderHeader({ actions: <button>Save</button> })
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('renders extra children under the title area', () => {
    renderHeader({ children: <span>extra content</span> })
    expect(screen.getByText('extra content')).toBeInTheDocument()
  })

  it('exposes the data-component attribute for the dev overlay', () => {
    const { container } = renderHeader({ title: 'Test' })
    expect(container.querySelector('header')).toHaveAttribute('data-component', 'AppHeader')
  })
})
