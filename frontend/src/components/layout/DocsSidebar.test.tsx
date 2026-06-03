import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import DocsSidebar from './DocsSidebar'

describe('DocsSidebar', () => {
  it('renders doc tree links with locale paths', () => {
    render(
      <MemoryRouter>
        <DocsSidebar
          docs={[
            {
              id: 1,
              slug: 'guide',
              title: 'Guide',
              children: [{ id: 2, slug: 'setup', title: 'Setup', children: [] }],
            },
          ]}
          productSlug="alpha"
          productName="Alpha"
          versionSlug="latest"
          locale="ko"
          currentDocSlug="guide"
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute('href', '/alpha/latest/guide')
  })

  it('renders nested doc links expanded by default', () => {
    render(
      <MemoryRouter>
        <DocsSidebar
          docs={[
            {
              id: 1,
              slug: 'guide',
              title: 'Guide',
              children: [{ id: 2, slug: 'setup', title: 'Setup', children: [] }],
            },
          ]}
          productSlug="alpha"
          versionSlug="latest"
          locale="ko"
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Setup' })).toBeInTheDocument()
  })
})
