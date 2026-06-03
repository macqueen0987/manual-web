import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BrandMark from './BrandMark'

vi.mock('../../hooks/useSiteBranding', () => ({
  useSiteBranding: () => ({
    title: 'Acme Docs',
    logo_url: null,
    logo_letter: 'A',
  }),
}))

describe('BrandMark', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders logo letter and title with home link', () => {
    render(
      <MemoryRouter>
        <BrandMark />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Acme Docs' })).toHaveAttribute('href', '/')
    expect(screen.getByText('Acme Docs')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('hides title in compact mode', () => {
    render(
      <MemoryRouter>
        <BrandMark compact />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Acme Docs')).not.toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders static div when link target is disabled', () => {
    render(
      <MemoryRouter>
        <BrandMark to="" />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Acme Docs')).toBeInTheDocument()
  })
})
