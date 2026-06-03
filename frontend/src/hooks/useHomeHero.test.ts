import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import client from '../api/client'

describe('useHomeHero', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.mocked(client.get).mockReset()
  })

  it('loads hero HTML for locale', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: { html: '<p>Hero</p>' },
    })

    const { useHomeHero } = await import('./useHomeHero')
    const { result } = renderHook(() => useHomeHero('ko'))

    await waitFor(() => {
      expect(result.current).toBe('<p>Hero</p>')
    })
    expect(client.get).toHaveBeenCalledWith('/site/home-hero', { params: { locale: 'ko' } })
  })

  it('returns null when API fails', async () => {
    vi.mocked(client.get).mockRejectedValueOnce(new Error('fail'))

    const { useHomeHero } = await import('./useHomeHero')
    const { result } = renderHook(() => useHomeHero('en'))

    await waitFor(() => {
      expect(result.current).toBeNull()
    })
  })
})
