import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AdminRoute from './AdminRoute'

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

import { useAuthStore } from '../../stores/authStore'

function mockAuth(state: {
  hasSession: boolean
  sessionReady: boolean
  user?: { email: string; is_superuser: boolean } | null
}) {
  vi.mocked(useAuthStore).mockImplementation((selector: (s: typeof state) => unknown) =>
    selector(state as never),
  )
}

describe('AdminRoute', () => {
  it('shows loader until session is ready', () => {
    mockAuth({ hasSession: false, sessionReady: false })
    render(
      <MemoryRouter>
        <AdminRoute>
          <div>Admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('redirects to login without session', () => {
    mockAuth({ hasSession: false, sessionReady: true })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute>
          <div>Admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('redirects non-superuser to home', () => {
    mockAuth({
      hasSession: true,
      sessionReady: true,
      user: { email: 'user@example.com', is_superuser: false },
    })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute>
          <div>Admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument()
  })

  it('renders children for superuser', () => {
    mockAuth({
      hasSession: true,
      sessionReady: true,
      user: { email: 'admin@example.com', is_superuser: true },
    })
    render(
      <MemoryRouter>
        <AdminRoute>
          <div>Admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    )
    expect(screen.getByText('Admin content')).toBeInTheDocument()
  })
})
