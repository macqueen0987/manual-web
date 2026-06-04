import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../hooks/useDocLocale', () => ({
  useDocLocale: () => ({ locale: 'ko' as const }),
}))

vi.mock('../hooks/useHomeHero', () => ({
  useHomeHero: () => null,
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: { sessionReady: boolean; user: null }) => unknown) =>
    selector({ sessionReady: true, user: null }),
}))

vi.mock('../components/layout/PublicHeader', () => ({
  default: ({ center }: { center?: React.ReactNode }) => <header>{center}</header>,
}))

vi.mock('../components/layout/PublicSiteFooter', () => ({
  default: () => <footer>Site footer</footer>,
}))

vi.mock('../components/search/DocSearchCombobox', () => ({
  default: () => <input aria-label="search" />,
}))

vi.mock('../components/home/HomeHeroSection', () => ({
  default: () => <div>Hero section</div>,
}))

vi.mock('../components/home/CategoryShowcase', () => ({
  default: () => <div>Category showcase</div>,
}))

vi.mock('../components/home/ExploreProductDirectory', () => ({
  default: () => <div>Product directory</div>,
}))

import client from '../api/client'
import HomePage from './HomePage'

const homePayload = {
  en: {
    hero_tagline: 'Hero EN',
    quick_link_columns: [],
    showcase_slots: [],
  },
  ko: {
    hero_tagline: '히어로',
    quick_link_columns: [],
    showcase_slots: [
      {
        id: 'blue',
        title: 'Blue',
        tagline: 'Tag',
        detail: 'Detail',
        primary_product_slug: 'bluefit',
      },
    ],
  },
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no public products', async () => {
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/products') return Promise.resolve({ data: [] })
      if (url === '/site/home') return Promise.resolve({ data: homePayload })
      return Promise.reject(new Error(url))
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('등록된 제품이 없습니다')).toBeInTheDocument()
    expect(screen.getByText('Hero section')).toBeInTheDocument()
    expect(screen.getByText('Site footer')).toBeInTheDocument()
  })

  it('renders showcase and directory when products exist', async () => {
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/products') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: 'Bluefit',
              slug: 'bluefit',
              category: 'Platform',
              is_active: true,
            },
          ],
        })
      }
      if (url === '/site/home') return Promise.resolve({ data: homePayload })
      return Promise.reject(new Error(url))
    })

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Category showcase')).toBeInTheDocument()
    })
    expect(screen.getByText('Product directory')).toBeInTheDocument()
  })
})
