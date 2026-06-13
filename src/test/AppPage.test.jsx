// @vitest-environment jsdom
/**
 * AppPage.test.jsx
 *
 * RTL rendering tests for src/components/layout/AppPage.jsx.
 * Verifies the scroll-rule invariant (overflow-y-auto must always be present),
 * max-width token mapping, and basic child rendering.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppPage from '../components/layout/AppPage'

describe('AppPage', () => {
  it('has overflow-y-auto on the root element (scroll-rule invariant)', () => {
    const { container } = render(<AppPage>content</AppPage>)
    expect(container.firstChild).toHaveClass('overflow-y-auto')
  })

  it('renders children', () => {
    render(<AppPage><span>Hello World</span></AppPage>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('applies max-w-4xl by default', () => {
    const { container } = render(<AppPage>x</AppPage>)
    expect(container.firstChild).toHaveClass('max-w-4xl')
  })

  it('applies max-w-2xl when maxWidth="2xl"', () => {
    const { container } = render(<AppPage maxWidth="2xl">x</AppPage>)
    expect(container.firstChild).toHaveClass('max-w-2xl')
  })

  it('applies max-w-6xl when maxWidth="6xl"', () => {
    const { container } = render(<AppPage maxWidth="6xl">x</AppPage>)
    expect(container.firstChild).toHaveClass('max-w-6xl')
  })

  it('applies max-w-none when maxWidth="full"', () => {
    const { container } = render(<AppPage maxWidth="full">x</AppPage>)
    expect(container.firstChild).toHaveClass('max-w-none')
  })

  it('falls back to max-w-4xl for an unknown maxWidth token', () => {
    const { container } = render(<AppPage maxWidth="bogus">x</AppPage>)
    expect(container.firstChild).toHaveClass('max-w-4xl')
  })

  it('is horizontally centered with mx-auto', () => {
    const { container } = render(<AppPage>x</AppPage>)
    expect(container.firstChild).toHaveClass('mx-auto')
  })

  it('exposes the data-component attribute for the dev overlay', () => {
    const { container } = render(<AppPage>x</AppPage>)
    expect(container.firstChild).toHaveAttribute('data-component', 'AppPage')
  })
})
