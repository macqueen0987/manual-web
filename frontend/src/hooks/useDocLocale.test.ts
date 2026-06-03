import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockLocalStorage } from '../test/helpers'

vi.mock('../stores/localeStore', () => ({
  useLocaleStore: vi.fn(),
}))

import { useLocaleStore } from '../stores/localeStore'
import { useDocLocale } from './useDocLocale'

describe('useDocLocale', () => {
  beforeEach(() => {
    mockLocalStorage()
    vi.mocked(useLocaleStore).mockImplementation((selector) => {
      const state = {
        locale: 'ko' as const,
        setLocale: vi.fn(),
      }
      return selector(state)
    })
  })

  it('returns locale and setter from store', () => {
    const { result } = renderHook(() => useDocLocale())
    expect(result.current.locale).toBe('ko')
    expect(result.current.setDocLocale).toBeTypeOf('function')
  })
})
