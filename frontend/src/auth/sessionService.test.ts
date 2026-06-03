import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  clearTokens,
  loadTokens,
  saveTokens,
  setSessionChangeHandler,
} from './sessionService'

function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
}

describe('sessionService storage', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
    setSessionChangeHandler(null)
  })

  it('loadTokens returns null when empty', () => {
    expect(loadTokens()).toBeNull()
  })

  it('saveTokens writes both keys and notifies handler', () => {
    const handler = vi.fn()
    setSessionChangeHandler(handler)
    const tokens = saveTokens('access-a', 'refresh-b')
    expect(tokens).toEqual({ access: 'access-a', refresh: 'refresh-b' })
    expect(loadTokens()).toEqual(tokens)
    expect(handler).toHaveBeenCalledWith(tokens)
  })

  it('clearTokens removes keys and notifies null', () => {
    const handler = vi.fn()
    saveTokens('a', 'r')
    setSessionChangeHandler(handler)
    clearTokens()
    expect(loadTokens()).toBeNull()
    expect(handler).toHaveBeenCalledWith(null)
  })
})
