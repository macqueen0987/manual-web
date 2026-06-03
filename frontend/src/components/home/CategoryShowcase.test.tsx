import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import CategoryShowcase from './CategoryShowcase'

describe('CategoryShowcase', () => {
  it('switches tabs and shows slot detail', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <CategoryShowcase
          locale="ko"
          products={[{ id: 1, name: 'Alpha', slug: 'alpha', category: 'Platform' }]}
          slots={[
            {
              id: 'blue',
              title: 'Blue',
              tagline: 'Fitness',
              detail: 'Blue family docs',
              primary_product_slug: 'alpha',
            },
            {
              id: 'besrt',
              title: 'beSRT',
              tagline: 'Studio',
              detail: 'Automation docs',
              primary_product_slug: null,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Blue family docs')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /beSRT/ }))
    expect(screen.getByText('Automation docs')).toBeInTheDocument()
  })

  it('hides illustration panel when slot has no image', () => {
    render(
      <MemoryRouter>
        <CategoryShowcase
          locale="ko"
          products={[]}
          slots={[
            {
              id: 'blue',
              title: 'Blue',
              tagline: 'Fitness',
              detail: 'Blue family docs without image',
              primary_product_slug: null,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Blue family docs without image')).toBeInTheDocument()
    expect(screen.queryByText('Preview')).not.toBeInTheDocument()
  })

  it('shows illustration when slot has image_url', () => {
    const { container } = render(
      <MemoryRouter>
        <CategoryShowcase
          locale="en"
          products={[]}
          slots={[
            {
              id: 'blue',
              title: 'Blue',
              tagline: 'Fitness',
              detail: 'With image',
              image_url: '/uploads/demo.png',
              primary_product_slug: null,
            },
          ]}
        />
      </MemoryRouter>,
    )

    expect(container.querySelector('img[src="/uploads/demo.png"]')).toBeTruthy()
  })
})
