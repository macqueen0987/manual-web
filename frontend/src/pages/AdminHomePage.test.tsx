import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { email: 'admin@example.com', is_superuser: true },
    logout: vi.fn(),
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

vi.mock('../components/admin/CategoryImageField', () => ({
  default: ({ value, onChange }: { value?: string | null; onChange: (v: string) => void }) => (
    <input
      aria-label="slot-image"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(),
}))

import client from '../api/client'
import AdminHomePage from './AdminHomePage'

const homePayload = {
  en: { hero_tagline: 'Hero', quick_link_columns: [], showcase_slots: [] },
  ko: {
    hero_tagline: '히어로',
    quick_link_columns: [],
    showcase_slots: [
      {
        id: 'blue',
        title: 'Blue',
        tagline: 'Tag',
        detail: 'Detail',
        primary_product_slug: 'alpha',
      },
    ],
  },
}

describe('AdminHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/site/home') return Promise.resolve({ data: homePayload })
      if (url === '/products') {
        return Promise.resolve({
          data: [{ id: 1, name: 'Alpha', slug: 'alpha', category: 'Platform', sort_order: 0 }],
        })
      }
      return Promise.reject(new Error(url))
    })
    vi.mocked(client.put).mockResolvedValue({ data: homePayload })
  })

  it('loads editor and shows showcase slot', async () => {
    render(<AdminHomePage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Blue')).toBeInTheDocument()
    })
  })

  it('saves home content on button click', async () => {
    const user = userEvent.setup()
    render(<AdminHomePage />)

    await waitFor(() => expect(screen.getByDisplayValue('Blue')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(client.put).toHaveBeenCalledWith('/site/home', expect.any(Object))
    })
  })
})
