import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}))

vi.mock('../components/layout/AuthShell', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

import client from '../api/client'
import SetupPage from './SetupPage'
import { slugifyProductName } from '../utils/slugify'

describe('SetupPage', () => {
  it('requires product name before submit', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()

    render(<SetupPage onComplete={onComplete} />)

    await user.type(screen.getByLabelText('이메일'), 'admin@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password-32chars-minimum-length!!')
    fireEvent.submit(screen.getByRole('button', { name: '설정 완료' }).closest('form')!)

    expect(await screen.findByText('제품명을 입력해 주세요.')).toBeInTheDocument()
    expect(client.post).not.toHaveBeenCalled()
  })

  it('posts setup payload and calls onComplete', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    vi.mocked(client.post).mockResolvedValue({ data: { ok: true } })

    render(<SetupPage onComplete={onComplete} />)

    await user.type(screen.getByLabelText('이메일'), 'admin@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password-32chars-minimum-length!!')
    await user.type(screen.getByLabelText('제품명'), 'Alpha Docs')
    await user.click(screen.getByRole('button', { name: '설정 완료' }))

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/setup/init', {
        admin: {
          email: 'admin@example.com',
          password: 'password-32chars-minimum-length!!',
          full_name: '',
        },
        product: {
          name: 'Alpha Docs',
          slug: slugifyProductName('Alpha Docs'),
          description: '',
        },
      })
    })
    expect(onComplete).toHaveBeenCalled()
  })
})
