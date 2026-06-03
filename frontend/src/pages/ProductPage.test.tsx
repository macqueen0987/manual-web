import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ productSlug: 'alpha', versionSlug: 'pub-01', '*': 'guide' }),
    useNavigate: () => navigate,
  }
})

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

vi.mock('../hooks/useDocLocale', () => ({
  useDocLocale: () => ({ locale: 'ko' as const, setDocLocale: vi.fn() }),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: null,
      hasSession: false,
      sessionReady: true,
      fetchUserProfile: vi.fn(),
    }),
}))

vi.mock('../components/layout/PublicSiteFooter', () => ({
  default: () => <footer>Footer</footer>,
}))

import client from '../api/client'
import ProductPage from './ProductPage'

describe('ProductPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/products/alpha') {
        return Promise.resolve({ data: { id: 1, name: 'Alpha', slug: 'alpha' } })
      }
      if (url === '/products/alpha/versions') {
        return Promise.resolve({
          data: [
            { id: 10, slug: 'pub-01', name: '2026.01', is_latest: false, is_published: true },
          ],
        })
      }
      if (url.includes('/documents') && !url.endsWith('/guide')) {
        return Promise.resolve({
          data: [{ id: 1, slug: 'guide', title: 'Guide', children: [] }],
        })
      }
      if (url.endsWith('/guide')) {
        return Promise.resolve({
          data: {
            id: 1,
            title: 'Guide',
            slug: 'guide',
            content: '# Guide\n\nHello world\n',
          },
        })
      }
      return Promise.reject(new Error(url))
    })
  })

  it('loads product docs and renders markdown content', async () => {
    render(
      <MemoryRouter initialEntries={['/alpha/pub-01/guide']}>
        <ProductPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Guide' })).toBeInTheDocument()
    })
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('opens mobile sidebar menu', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ProductPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Guide', level: 1 })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '문서 메뉴 열기' }))
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
  })

  it('shows empty body message when document content is blank', async () => {
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/products/alpha') {
        return Promise.resolve({ data: { id: 1, name: 'Alpha', slug: 'alpha' } })
      }
      if (url === '/products/alpha/versions') {
        return Promise.resolve({
          data: [
            { id: 10, slug: 'pub-01', name: '2026.01', is_latest: false, is_published: true },
          ],
        })
      }
      if (url.includes('/documents') && !url.endsWith('/guide')) {
        return Promise.resolve({
          data: [{ id: 1, slug: 'guide', title: 'Guide', children: [] }],
        })
      }
      if (url.endsWith('/guide')) {
        return Promise.resolve({
          data: {
            id: 1,
            title: 'Guide',
            slug: 'guide',
            content: '',
            locale_available: false,
          },
        })
      }
      return Promise.reject(new Error(url))
    })

    render(
      <MemoryRouter initialEntries={['/alpha/pub-01/guide']}>
        <ProductPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Guide' })).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('본문 내용이 없습니다.')
  })
})
