import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import SessionRoute from './SessionRoute'

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

import { useAuthStore } from '../../stores/authStore'

function mockAuth(state: { hasSession: boolean; sessionReady: boolean }) {
  vi.mocked(useAuthStore).mockImplementation((selector: (s: typeof state) => unknown) =>
    selector(state as never),
  )
}

describe('SessionRoute', () => {
  it('shows loader until session is ready', () => {
    mockAuth({ hasSession: false, sessionReady: false })
    render(
      <MemoryRouter>
        <SessionRoute>
          <div>Protected</div>
        </SessionRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('redirects to login without session', () => {
    mockAuth({ hasSession: false, sessionReady: true })
    render(
      <MemoryRouter initialEntries={['/account/password']}>
        <SessionRoute>
          <div>Protected</div>
        </SessionRoute>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Protected')).not.toBeInTheDocument()
  })

  it('renders children when signed in', () => {
    mockAuth({ hasSession: true, sessionReady: true })
    render(
      <MemoryRouter>
        <SessionRoute>
          <div>Protected</div>
        </SessionRoute>
      </MemoryRouter>,
    )
    expect(screen.getByText('Protected')).toBeInTheDocument()
  })
})
