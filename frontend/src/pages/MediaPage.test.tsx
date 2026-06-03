import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), delete: vi.fn(), post: vi.fn() },
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { email: 'admin@example.com', is_superuser: true },
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

vi.mock('../components/auth/useEnsureUser', () => ({
  useEnsureUser: vi.fn(),
}))

vi.mock('../components/admin/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(),
}))

import client from '../api/client'
import MediaPage from './MediaPage'

const sampleItem = {
  id: 'm1',
  product_slug: 'alpha',
  version_slug: 'latest',
  filename: 'pic.png',
  original_name: 'pic.png',
  url: '/uploads/alpha/latest/pic.png',
  size: 2048,
  content_type: 'image/png',
  kind: 'image',
  created_at: '2026-01-01T00:00:00Z',
  referenced: true,
}

describe('MediaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/products') {
        return Promise.resolve({ data: [{ id: 1, name: 'Alpha', slug: 'alpha' }] })
      }
      if (url === '/products/alpha/versions') {
        return Promise.resolve({
          data: [{ id: 10, name: 'latest', slug: 'latest', is_latest: true }],
        })
      }
      if (url === '/media') {
        return Promise.resolve({ data: { items: [sampleItem] } })
      }
      return Promise.reject(new Error(url))
    })
  })

  it('renders media table after load', async () => {
    render(
      <MemoryRouter>
        <MediaPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('pic.png')).toBeInTheDocument()
    })
    expect(screen.getByText('사용 중')).toBeInTheDocument()
  })

  it('filters by product selection', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <MediaPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('pic.png')).toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('제품'), 'alpha')
    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/products/alpha/versions')
    })
  })
})
