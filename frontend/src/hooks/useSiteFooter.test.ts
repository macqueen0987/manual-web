import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import client from '../api/client'

describe('useSiteFooter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.mocked(client.get).mockReset()
  })

  it('loads footer HTML for locale', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: { html: '<footer><p>Footer</p></footer>' },
    })

    const { useSiteFooter } = await import('./useSiteFooter')
    const { result } = renderHook(() => useSiteFooter('ko'))

    await waitFor(() => {
      expect(result.current).toBe('<footer><p>Footer</p></footer>')
    })
    expect(client.get).toHaveBeenCalledWith('/site/footer', { params: { locale: 'ko' } })
  })

  it('returns null when API fails', async () => {
    vi.mocked(client.get).mockRejectedValueOnce(new Error('fail'))

    const { useSiteFooter } = await import('./useSiteFooter')
    const { result } = renderHook(() => useSiteFooter('en'))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })
})
