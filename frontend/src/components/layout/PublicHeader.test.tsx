import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import PublicHeader from './PublicHeader'

vi.mock('../../hooks/useSiteBranding', () => ({
  useSiteBranding: () => ({
    title: 'Acme Docs',
    logo_url: null,
    logo_letter: 'A',
  }),
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ hasSession: false, user: null, logout: vi.fn() }),
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

vi.mock('../auth/useEnsureUser', () => ({
  useEnsureUser: vi.fn(),
}))

describe('PublicHeader', () => {
  it('renders default language switcher and admin entry', () => {
    render(
      <MemoryRouter>
        <PublicHeader />
      </MemoryRouter>,
    )

    expect(screen.getAllByRole('link', { name: 'Acme Docs' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('combobox', { name: '언어' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument()
  })

  it('renders custom actions when provided', () => {
    render(
      <MemoryRouter>
        <PublicHeader actions={<button type="button">Custom</button>} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument()
  })
})
