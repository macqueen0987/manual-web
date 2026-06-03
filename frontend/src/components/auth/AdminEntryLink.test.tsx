import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AdminEntryLink from './AdminEntryLink'

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

vi.mock('./useEnsureUser', () => ({
  useEnsureUser: vi.fn(),
}))

import { useAuthStore } from '../../stores/authStore'

describe('AdminEntryLink', () => {
  it('shows login link when signed out', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({ hasSession: false, user: null, logout: vi.fn() }),
    )

    render(
      <MemoryRouter>
        <AdminEntryLink />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute('href', '/login')
  })

  it('shows account menu for signed-in superuser', async () => {
    vi.mocked(useAuthStore).mockImplementation((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        hasSession: true,
        user: { email: 'admin@example.com', is_superuser: true },
        logout: vi.fn(),
      }),
    )

    render(
      <MemoryRouter>
        <AdminEntryLink />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'admin@example.com' })).toBeInTheDocument()
  })
})
