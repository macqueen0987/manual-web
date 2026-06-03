import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AdminLayout from './AdminLayout'

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

describe('AdminLayout', () => {
  it('renders admin nav links and children', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminLayout userEmail="admin@example.com" onLogout={vi.fn()}>
                <div>Admin body</div>
              </AdminLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin body')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /제품 관리/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /홈 화면/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /미디어/i })).toBeInTheDocument()
  })

  it('calls onLogout from account menu', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminLayout userEmail="admin@example.com" onLogout={onLogout}>
                <div>Body</div>
              </AdminLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'admin@example.com' }))
    await user.click(screen.getByRole('menuitem', { name: /로그아웃/i }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('editor variant omits public docs link in account menu', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/admin/products/a/latest/editor']}>
        <Routes>
          <Route
            path="/admin/products/:slug/:version/editor"
            element={
              <AdminLayout variant="editor" userEmail="admin@example.com" onLogout={vi.fn()}>
                <div>Editor body</div>
              </AdminLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'admin@example.com' }))
    expect(screen.queryByRole('menuitem', { name: /공개 문서/i })).not.toBeInTheDocument()
  })
})
