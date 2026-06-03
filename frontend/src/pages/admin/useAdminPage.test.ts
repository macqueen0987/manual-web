import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  draftVersion,
  publishedVersion,
  sampleProduct,
  workingVersion,
} from '../../test/adminFixtures'

const navigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}))

vi.mock('../../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    logout: vi.fn(),
    user: { email: 'admin@example.com' },
  }),
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

vi.mock('../../components/auth/useEnsureUser', () => ({
  useEnsureUser: vi.fn(),
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(),
}))

import client from '../../api/client'
import { useAdminPage } from './useAdminPage'

describe('useAdminPage', () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset()
    vi.mocked(client.post).mockReset()
    navigate.mockReset()
  })

  it('loads products and auto-selects the first one', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: [
        {
          product: sampleProduct,
          versions: [workingVersion, publishedVersion, draftVersion],
        },
      ],
    })

    const { result } = renderHook(() => useAdminPage())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.products).toHaveLength(1)
    expect(result.current.selected?.slug).toBe('alpha')
    expect(result.current.versionGroups.working).toHaveLength(1)
    expect(result.current.versionGroups.published).toHaveLength(1)
    expect(result.current.versionGroups.drafts).toHaveLength(1)
  })

  it('openEditProduct prefills edit form from selection', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: [{ product: sampleProduct, versions: [workingVersion] }],
    })

    const { result } = renderHook(() => useAdminPage())

    await waitFor(() => expect(result.current.selected).not.toBeNull())

    act(() => result.current.openEditProduct())

    expect(result.current.editName).toBe('Alpha Docs')
    expect(result.current.editDesc).toBe('Sample product')
    expect(result.current.editCategory).toBe('Platform')
    expect(result.current.editProductOpen).toBe(true)
  })

  it('creates a product via API', async () => {
    vi.mocked(client.get)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ product: sampleProduct, versions: [workingVersion] }],
      })
    vi.mocked(client.post).mockResolvedValueOnce({ data: sampleProduct })

    const { result } = renderHook(() => useAdminPage())

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setNewProductName('Alpha Docs')
      result.current.setProductModalOpen(true)
    })

    await act(async () => {
      await result.current.handleCreateProduct()
    })

    expect(client.post).toHaveBeenCalledWith('/products', expect.objectContaining({
      name: 'Alpha Docs',
      slug: expect.any(String),
    }))
    expect(result.current.productModalOpen).toBe(false)
  })
})
