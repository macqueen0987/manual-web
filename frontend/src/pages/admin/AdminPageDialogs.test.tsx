import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AdminPageDialogs from './AdminPageDialogs'
import { sampleProduct, workingVersion } from '../../test/adminFixtures'

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

vi.mock('../../api/client', () => ({
  default: { post: vi.fn() },
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(),
}))

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    locale: 'ko' as const,
    selected: sampleProduct,
    categorySuggestions: ['Platform'],
    productModalOpen: false,
    setProductModalOpen: vi.fn(),
    editProductOpen: false,
    setEditProductOpen: vi.fn(),
    renameVersionOpen: false,
    setRenameVersionOpen: vi.fn(),
    versionModalOpen: false,
    setVersionModalOpen: vi.fn(),
    publishModalOpen: false,
    setPublishModalOpen: vi.fn(),
    newProductName: '',
    setNewProductName: vi.fn(),
    newProductDesc: '',
    setNewProductDesc: vi.fn(),
    newProductCategory: '',
    setNewProductCategory: vi.fn(),
    newIconUrl: null,
    setNewIconUrl: vi.fn(),
    newProductSlugPreview: 'alpha-preview',
    editName: sampleProduct.name,
    setEditName: vi.fn(),
    editDesc: sampleProduct.description ?? '',
    setEditDesc: vi.fn(),
    editCategory: sampleProduct.category ?? '',
    setEditCategory: vi.fn(),
    editIconUrl: null,
    setEditIconUrl: vi.fn(),
    renameVersionName: '',
    setRenameVersionName: vi.fn(),
    newVersionName: '',
    setNewVersionName: vi.fn(),
    baseVersionId: workingVersion.id,
    setBaseVersionId: vi.fn(),
    newVersionSlugPreview: '20260604',
    selectedVersions: [workingVersion],
    versionStatusSuffix: () => '',
    publishName: '',
    setPublishName: vi.fn(),
    publishSlugPreview: '20260603',
    handleCreateProduct: vi.fn(),
    handleUpdateProduct: vi.fn(),
    handleRenameVersion: vi.fn(),
    handleCreateVersion: vi.fn(),
    handlePublish: vi.fn(),
    ...overrides,
  }
}

describe('AdminPageDialogs', () => {
  it('renders new product dialog and submits create', async () => {
    const user = userEvent.setup()
    const handleCreateProduct = vi.fn()
    const setNewProductName = vi.fn()

    render(
      <AdminPageDialogs
        {...makeProps({
          productModalOpen: true,
          newProductName: 'Beta Docs',
          handleCreateProduct,
          setNewProductName,
        })}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('새 제품')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '만들기' }))
    expect(handleCreateProduct).toHaveBeenCalled()
  })

  it('renders publish dialog with disabled submit until name is valid', () => {
    render(
      <AdminPageDialogs
        {...makeProps({
          publishModalOpen: true,
          publishName: '',
          publishSlugPreview: '',
        })}
      />,
    )

    expect(screen.getByText('작업 중 → 발행 스냅샷')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '게시' })).toBeDisabled()
  })
})
