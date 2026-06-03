import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}))

import client from '../api/client'
import { useDocSearch } from './useDocSearch'

describe('useDocSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(client.get).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not search until query reaches minimum length', async () => {
    const { result } = renderHook(() => useDocSearch())
    act(() => result.current.setQuery('a'))
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(client.get).not.toHaveBeenCalled()
    expect(result.current.open).toBe(false)
  })

  it('debounces API search requests', async () => {
    vi.mocked(client.get).mockResolvedValue({
      data: {
        results: [
          {
            id: 1,
            title: 'Guide',
            slug: 'guide',
            product_slug: 'alpha',
            product_name: 'Alpha',
            version_slug: 'v1',
            version_name: 'v1',
            excerpt: 'Intro',
          },
        ],
      },
    })

    const { result } = renderHook(() => useDocSearch('alpha'))
    act(() => result.current.setQuery('guide'))
    await act(async () => {
      vi.advanceTimersByTime(320)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(client.get).toHaveBeenCalledWith('/search', {
      params: { q: 'guide', product: 'alpha' },
    })
    expect(result.current.results).toHaveLength(1)
    expect(result.current.loading).toBe(false)
  })

  it('clears results when query is emptied', async () => {
    const { result } = renderHook(() => useDocSearch())
    act(() => result.current.setQuery('ab'))
    await act(async () => {
      vi.advanceTimersByTime(320)
    })
    act(() => result.current.setQuery(''))
    expect(result.current.results).toEqual([])
    expect(result.current.open).toBe(false)
  })
})
