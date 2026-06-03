import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mockLocalStorage, makeJwt } from '../test/helpers'

const { apiInstance } = vi.hoisted(() => ({
  apiInstance: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => apiInstance),
  },
}))

import {
  bootstrap,
  clearTokens,
  ensureValidAccess,
  fetchUser,
  getAccessToken,
  hasStoredSession,
  initCrossTabSync,
  loadTokens,
  logoutOnServer,
  refresh,
  saveTokens,
  setSessionChangeHandler,
} from './sessionService'

function mockApi() {
  return apiInstance
}

function validAccessToken() {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return makeJwt({ exp })
}

describe('sessionService storage', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
    setSessionChangeHandler(null)
    vi.clearAllMocks()
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

  it('hasStoredSession and getAccessToken reflect storage', () => {
    expect(hasStoredSession()).toBe(false)
    saveTokens('access-a', 'refresh-b')
    expect(hasStoredSession()).toBe(true)
    expect(getAccessToken()).toBe('access-a')
  })
})

describe('sessionService refresh', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
    setSessionChangeHandler(null)
    vi.clearAllMocks()
  })

  it('returns null when no tokens exist', async () => {
    await expect(refresh()).resolves.toBeNull()
  })

  it('posts refresh and saves rotated tokens', async () => {
    const api = mockApi()
    saveTokens('old-access', 'old-refresh')
    api.post.mockResolvedValueOnce({
      data: { access_token: 'new-access', refresh_token: 'new-refresh' },
    })

    await expect(refresh()).resolves.toEqual({
      access: 'new-access',
      refresh: 'new-refresh',
    })
    expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
      token: 'old-refresh',
      refresh_token: 'old-refresh',
    })
  })

  it('ensureValidAccess skips refresh for valid access token', async () => {
    const api = mockApi()
    const access = validAccessToken()
    saveTokens(access, 'refresh-token')
    await expect(ensureValidAccess()).resolves.toEqual({
      access,
      refresh: 'refresh-token',
    })
    expect(api.post).not.toHaveBeenCalled()
  })
})

describe('sessionService fetchUser', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('loads user profile with bearer token', async () => {
    const api = mockApi()
    const access = validAccessToken()
    saveTokens(access, 'refresh-token')
    api.get.mockResolvedValueOnce({
      data: {
        id: 1,
        email: 'admin@example.com',
        full_name: 'Admin',
        is_superuser: true,
      },
    })

    await expect(fetchUser()).resolves.toEqual({
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin',
      is_superuser: true,
    })
    expect(api.get).toHaveBeenCalledWith('/auth/me', {
      headers: { Authorization: `Bearer ${access}` },
    })
  })

  it('returns null when session is missing', async () => {
    await expect(fetchUser()).resolves.toBeNull()
  })
})

describe('sessionService bootstrap', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('clears invalid empty storage', async () => {
    await expect(bootstrap()).resolves.toEqual({
      tokens: null,
      user: null,
      hasSession: false,
    })
  })

  it('returns session without fetching user by default', async () => {
    const access = validAccessToken()
    saveTokens(access, 'refresh-token')
    await expect(bootstrap()).resolves.toEqual({
      tokens: { access, refresh: 'refresh-token' },
      user: null,
      hasSession: true,
    })
  })
})

describe('sessionService logoutOnServer', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('posts refresh token to logout endpoint', async () => {
    const api = mockApi()
    saveTokens('access-token', 'refresh-token')
    api.post.mockResolvedValueOnce({})
    await logoutOnServer()
    expect(api.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refresh_token: 'refresh-token' },
      { headers: { Authorization: 'Bearer access-token' } },
    )
  })
})

describe('initCrossTabSync', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
  })

  it('notifies when auth storage keys change', () => {
    const onSync = vi.fn()
    initCrossTabSync(onSync)
    saveTokens('access-a', 'refresh-b')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'access_token', newValue: 'access-a' }),
    )
    expect(onSync).toHaveBeenCalledWith({ access: 'access-a', refresh: 'refresh-b' })
  })
})
