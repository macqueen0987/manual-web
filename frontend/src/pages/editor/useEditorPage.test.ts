import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ productSlug: 'alpha', versionSlug: 'latest', docId: undefined }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/admin/products/alpha/latest/editor' }),
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

vi.mock('../../hooks/useEditorMode', () => ({
  useEditorMode: () => ({
    mode: 'markdown',
    setMode: vi.fn(),
    requestModeChange: vi.fn(() => true),
  }),
}))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(),
}))

import client from '../../api/client'
import { notify } from '@/lib/notify'
import { useEditorPage } from './useEditorPage'

describe('useEditorPage', () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset()
    vi.mocked(client.post).mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === '/products') {
        return Promise.resolve({
          data: [{ id: 1, name: 'Alpha', slug: 'alpha' }],
        })
      }
      if (url === '/products/alpha/versions') {
        return Promise.resolve({
          data: [
            {
              id: 10,
              name: 'latest',
              slug: 'latest',
              is_latest: true,
              is_published: false,
            },
          ],
        })
      }
      if (url.includes('/documents')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.reject(new Error(`unexpected GET ${url}`))
    })
  })

  it('startNewDoc enters new-page editing mode', async () => {
    const { result } = renderHook(() => useEditorPage())

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => result.current.startNewDoc(''))

    expect(result.current.isNewDoc).toBe(true)
    expect(result.current.selectedDocSlug).toBe('')
    expect(result.current.title).toBe('')
    expect(result.current.dirty).toBe(false)
    expect(result.current.newPageModalOpen).toBe(false)
  })

  it('switchEditLocale respects dirty guard', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)

    const { result } = renderHook(() => useEditorPage())

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => {
      result.current.setDirty(true)
    })

    act(() => {
      result.current.switchEditLocale('en')
    })

    expect(result.current.editLocale).toBe('ko')
  })

  it('handleSave requires title for new documents', async () => {
    const { result } = renderHook(() => useEditorPage())

    await waitFor(() => expect(result.current.products).toHaveLength(1))

    act(() => result.current.startNewDoc(''))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(notify).toHaveBeenCalledWith('제목을 입력하세요', 'error')
    expect(client.post).not.toHaveBeenCalledWith('/documents', expect.anything())
  })
})
