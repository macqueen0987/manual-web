import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

vi.mock('./hooks/useSiteBranding', () => ({
  useSiteBranding: vi.fn(),
}))

vi.mock('./pages/HomePage', () => ({ default: () => <div>Home page</div> }))
vi.mock('./pages/SetupPage', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" onClick={onComplete}>
      Setup page
    </button>
  ),
}))
vi.mock('./pages/LoginPage', () => ({ default: () => <div>Login page</div> }))
vi.mock('./pages/AdminPage', () => ({ default: () => <div>Admin page</div> }))
vi.mock('./pages/AdminHomePage', () => ({ default: () => <div>Admin home page</div> }))
vi.mock('./pages/ProductPage', () => ({ default: () => <div>Product page</div> }))
vi.mock('./pages/EditorPage', () => ({ default: () => <div>Editor page</div> }))
vi.mock('./pages/MediaPage', () => ({ default: () => <div>Media page</div> }))
vi.mock('./pages/ChangePasswordPage', () => ({ default: () => <div>Change password</div> }))
vi.mock('./components/auth/AdminRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('./components/auth/SessionRoute', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import client from './api/client'
import App from './App'
import { useAuthStore } from './stores/authStore'

function mockBootstrap(sessionReady = true) {
  vi.mocked(useAuthStore).mockImplementation((selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      bootstrap: vi.fn().mockResolvedValue(undefined),
      sessionReady,
    }
    return selector(state)
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBootstrap(true)
  })

  it('shows loader until setup and session are ready', () => {
    mockBootstrap(false)
    vi.mocked(client.get).mockReturnValue(new Promise(() => {}))

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Home page')).not.toBeInTheDocument()
  })

  it('redirects to setup when setup is incomplete', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { is_setup_complete: false } })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Setup page')).toBeInTheDocument()
    })
  })

  it('renders home when setup is complete', async () => {
    vi.mocked(client.get).mockResolvedValue({ data: { is_setup_complete: true } })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Home page')).toBeInTheDocument()
    })
  })
})
