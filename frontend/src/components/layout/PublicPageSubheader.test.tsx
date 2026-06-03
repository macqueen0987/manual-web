import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PublicPageSubheader from './PublicPageSubheader'

describe('PublicPageSubheader', () => {
  it('renders title and optional description', () => {
    render(
      <PublicPageSubheader title="Products" description="Browse documentation" />,
    )

    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getByText('Browse documentation')).toBeInTheDocument()
  })

  it('renders tools slot', () => {
    render(
      <PublicPageSubheader
        title="Docs"
        tools={<button type="button">Search</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })
})
