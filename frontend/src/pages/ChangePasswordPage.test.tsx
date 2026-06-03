import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const navigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('../api/client', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}))

vi.mock('../components/layout/AuthShell', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

vi.mock('../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

import client from '../api/client'
import ChangePasswordPage from './ChangePasswordPage'

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates minimum password length', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('현재 비밀번호'), 'old-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호'), 'short')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'short')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('새 비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument()
    expect(client.post).not.toHaveBeenCalled()
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('현재 비밀번호'), 'old-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호'), 'new-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'different-password-123456')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('새 비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
  })

  it('submits change and shows success message', async () => {
    const user = userEvent.setup()
    vi.mocked(client.post).mockResolvedValue({ data: { message: 'Password updated' } })

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('현재 비밀번호'), 'old-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호'), 'new-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-1234567890')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/auth/change-password', {
        current_password: 'old-password-1234567890',
        new_password: 'new-password-1234567890',
      })
    })
    expect(await screen.findByText('비밀번호를 변경했습니다.')).toBeInTheDocument()
  })

  it('maps incorrect current password API error', async () => {
    const user = userEvent.setup()
    vi.mocked(client.post).mockRejectedValue({
      response: { data: { detail: 'Current password is incorrect' } },
    })

    render(
      <MemoryRouter>
        <ChangePasswordPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('현재 비밀번호'), 'wrong-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호'), 'new-password-1234567890')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-1234567890')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('현재 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
  })
})
