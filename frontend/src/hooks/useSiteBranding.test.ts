import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import client from '../api/client'

describe('useSiteBranding', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.mocked(client.get).mockReset()
    document.title = 'initial'
  })

  it('loads branding from API and updates document title', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: {
        title: 'Acme Docs',
        logo_url: '/logo.png',
        logo_letter: 'A',
      },
    })

    const { useSiteBranding } = await import('./useSiteBranding')
    const { result } = renderHook(() => useSiteBranding())

    expect(result.current.title).toBe('Manual Web')

    await waitFor(() => {
      expect(result.current.title).toBe('Acme Docs')
    })
    expect(result.current.logo_url).toBe('/logo.png')
    expect(document.title).toBe('Acme Docs')
  })

  it('falls back to defaults when API fails', async () => {
    vi.mocked(client.get).mockRejectedValueOnce(new Error('network'))

    const { useSiteBranding } = await import('./useSiteBranding')
    const { result } = renderHook(() => useSiteBranding())

    await waitFor(() => {
      expect(result.current.title).toBe('Manual Web')
    })
    expect(result.current.logo_letter).toBe('M')
  })
})
