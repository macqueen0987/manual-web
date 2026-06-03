import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExploreProductDirectory from './ExploreProductDirectory'

describe('ExploreProductDirectory', () => {
  const products = [
    { id: 1, name: 'Alpha Docs', slug: 'alpha', category: 'Platform', description: 'Main docs' },
    { id: 2, name: 'Beta Docs', slug: 'beta', category: 'Platform', description: 'Beta' },
  ]

  it('renders product cards and filters by search', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <ExploreProductDirectory products={products} locale="ko" />
      </MemoryRouter>,
    )

    expect(screen.getByText('Alpha Docs')).toBeInTheDocument()
    expect(screen.getByText('Beta Docs')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'Beta')
    expect(screen.queryByText('Alpha Docs')).not.toBeInTheDocument()
    expect(screen.getByText('Beta Docs')).toBeInTheDocument()
  })
})
