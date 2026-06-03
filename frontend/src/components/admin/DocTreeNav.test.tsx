import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DocTreeNav, { type DocNode } from './DocTreeNav'

const tree: DocNode[] = [
  {
    id: 1,
    title: 'Guide',
    slug: 'guide',
    parent_id: null,
    children: [
      {
        id: 2,
        title: 'Setup',
        slug: 'setup',
        parent_id: 1,
        children: [],
      },
    ],
  },
  { id: 3, title: 'FAQ', slug: 'faq', parent_id: null, children: [] },
]

describe('DocTreeNav', () => {
  it('selects doc and opens new page dialog trigger', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onNewPage = vi.fn()

    render(
      <DocTreeNav
        docs={tree}
        currentSlug="guide"
        onSelect={onSelect}
        onNewPage={onNewPage}
      />,
    )

    await user.click(screen.getByText('FAQ'))
    expect(onSelect).toHaveBeenCalledWith('faq')

    await user.click(screen.getByRole('button', { name: '새 페이지' }))
    expect(onNewPage).toHaveBeenCalled()
  })

  it('collapses and expands nested children', async () => {
    const user = userEvent.setup()

    render(
      <DocTreeNav docs={tree} onSelect={vi.fn()} onNewPage={vi.fn()} />,
    )

    expect(screen.getByText('Setup')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(screen.queryByText('Setup')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('Setup')).toBeInTheDocument()
  })
})
