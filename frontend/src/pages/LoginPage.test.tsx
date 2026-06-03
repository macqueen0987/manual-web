import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()
const loginWithTokens = vi.fn()
const fetchUserProfile = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

vi.mock('../components/layout/AuthShell', () => ({
  default: ({
    children,
    title,
  }: {
    children: React.ReactNode
    title: string
    subtitle?: string
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({ loginWithTokens, fetchUserProfile }),
}))

vi.mock('../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

import client from '../api/client'
import LoginPage from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchUserProfile.mockResolvedValue(undefined)
  })

  it('renders login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('submits credentials and navigates to admin', async () => {
    const user = userEvent.setup()
    vi.mocked(client.post).mockResolvedValue({
      data: { access_token: 'access', refresh_token: 'refresh' },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('이메일'), 'admin@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password123456789012345678')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@example.com',
        password: 'password123456789012345678',
      })
    })
    expect(loginWithTokens).toHaveBeenCalledWith('access', 'refresh')
    expect(fetchUserProfile).toHaveBeenCalled()
    expect(navigate).toHaveBeenCalledWith('/admin')
  })

  it('shows API error detail on failure', async () => {
    const user = userEvent.setup()
    vi.mocked(client.post).mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('이메일'), 'bad@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password-1234567890')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })
})
