import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TableOfContents, { extractHeadings } from './TableOfContents'

describe('extractHeadings', () => {
  it('parses markdown headings', () => {
    const items = extractHeadings('# Title\n\n## Section\n\n### Sub')
    expect(items).toEqual([
      { level: 1, text: 'Title', id: 'title' },
      { level: 2, text: 'Section', id: 'section' },
      { level: 3, text: 'Sub', id: 'sub' },
    ])
  })

  it('matches headingToId for inline markup', () => {
    const items = extractHeadings('## Install **checklist**')
    expect(items).toEqual([
      { level: 2, text: 'Install checklist', id: 'install-checklist' },
    ])
  })
})

describe('TableOfContents', () => {
  it('renders heading links', () => {
    render(
      <TableOfContents
        locale="ko"
        content={'# Intro\n\n## Setup\n\nBody'}
      />,
    )

    expect(screen.getByRole('navigation', { name: '목차' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Intro' })).toHaveAttribute('href', '#intro')
    expect(screen.getByRole('link', { name: 'Setup' })).toHaveAttribute('href', '#setup')
  })

  it('returns null when no headings', () => {
    const { container } = render(
      <TableOfContents locale="ko" content="Plain paragraph only" />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
