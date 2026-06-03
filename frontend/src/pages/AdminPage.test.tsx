import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AdminPage from './AdminPage'
import { sampleProduct } from '../test/adminFixtures'

vi.mock('./admin/useAdminPage', () => ({
  useAdminPage: vi.fn(),
}))

vi.mock('../components/admin/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/admin/ProductSidebarList', () => ({
  default: () => <div>Product list</div>,
}))

vi.mock('./admin/AdminPageDialogs', () => ({
  default: () => null,
}))

vi.mock('./admin/AdminProductDetail', () => ({
  default: () => <div>Product detail</div>,
}))

import { useAdminPage } from './admin/useAdminPage'

const baseAdmin = {
  user: { email: 'admin@example.com', is_superuser: true },
  handleLogout: vi.fn(),
  loading: false,
  products: [sampleProduct],
  productGroups: [],
  selectedId: sampleProduct.id,
  versions: [],
  locale: 'ko' as const,
  setSelectedId: vi.fn(),
  handleReorderProducts: vi.fn(),
  setProductModalOpen: vi.fn(),
  selected: sampleProduct,
  versionGroups: { working: [], published: [], drafts: [] },
  selectedVersions: [],
  navigate: vi.fn(),
  openEditProduct: vi.fn(),
  handleDeleteProduct: vi.fn(),
  openNewVersion: vi.fn(),
  openEditor: vi.fn(),
  openRenameVersion: vi.fn(),
  openPublish: vi.fn(),
  handlePublishSnapshot: vi.fn(),
  handleUnpublish: vi.fn(),
  handleDeleteVersion: vi.fn(),
}

describe('AdminPage', () => {
  it('renders empty state when no product selected', () => {
    vi.mocked(useAdminPage).mockReturnValue({
      ...baseAdmin,
      selected: null,
      selectedId: null,
    } as never)

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('왼쪽에서 제품을 선택하거나 새로 만드세요')).toBeInTheDocument()
  })

  it('opens new product modal from header button', async () => {
    const setProductModalOpen = vi.fn()
    vi.mocked(useAdminPage).mockReturnValue({
      ...baseAdmin,
      selected: null,
      selectedId: null,
      setProductModalOpen,
    } as never)

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '새 제품' }))
    expect(setProductModalOpen).toHaveBeenCalledWith(true)
  })

  it('renders product detail when selected', () => {
    vi.mocked(useAdminPage).mockReturnValue(baseAdmin as never)

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Product detail')).toBeInTheDocument()
  })
})
