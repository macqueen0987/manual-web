import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AuthShell from './AuthShell'

vi.mock('./PublicHeader', () => ({
  default: () => <header>Public header</header>,
}))

describe('AuthShell', () => {
  it('renders title, children, and home link', () => {
    render(
      <MemoryRouter>
        <AuthShell title="Login" subtitle="Sign in to continue">
          <form>Form body</form>
        </AuthShell>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    expect(screen.getByText('Form body')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '공개 문서 홈으로' })).toHaveAttribute('href', '/')
  })
})
