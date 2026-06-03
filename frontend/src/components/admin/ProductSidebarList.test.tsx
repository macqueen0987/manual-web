import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ProductSidebarList from './ProductSidebarList'

describe('ProductSidebarList', () => {
  it('selects product and shows version summary', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <ProductSidebarList
        groups={[
          {
            key: 'platform',
            label: 'Platform',
            products: [
              { id: 1, name: 'Alpha Docs', slug: 'alpha', category: 'Platform', sort_order: 0 },
            ],
          },
        ]}
        selectedId={null}
        versions={{ 1: [{ id: 10, name: 'latest', is_latest: true }] }}
        locale="ko"
        onSelect={onSelect}
        onReorder={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Alpha Docs/ }))
    expect(onSelect).toHaveBeenCalledWith(1)
    expect(screen.getByText(/latest/)).toBeInTheDocument()
  })
})
