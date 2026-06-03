import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockLocalStorage } from '../test/helpers'

vi.mock('../auth/sessionService', () => ({
  bootstrap: vi.fn(),
  clearTokens: vi.fn(),
  initCrossTabSync: vi.fn(),
  loadTokens: vi.fn(),
  logoutOnServer: vi.fn(),
  saveTokens: vi.fn(),
  setSessionChangeHandler: vi.fn(),
  fetchUser: vi.fn(),
}))

import {
  bootstrap,
  clearTokens,
  loadTokens,
  logoutOnServer,
  saveTokens,
  fetchUser,
} from '../auth/sessionService'
import { useAuthStore } from './authStore'

function resetStore() {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    hasSession: false,
    sessionReady: false,
  })
}

describe('authStore', () => {
  beforeEach(() => {
    mockLocalStorage()
    resetStore()
    vi.clearAllMocks()
  })

  it('loginWithTokens saves tokens and marks session ready', () => {
    useAuthStore.getState().loginWithTokens('access-a', 'refresh-b')

    expect(saveTokens).toHaveBeenCalledWith('access-a', 'refresh-b')
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'access-a',
      refreshToken: 'refresh-b',
      hasSession: true,
      sessionReady: true,
    })
  })

  it('logout clears server session and local state', async () => {
    useAuthStore.setState({
      accessToken: 'a',
      refreshToken: 'r',
      hasSession: true,
      user: { email: 'a@b.com', is_superuser: true },
    })

    await useAuthStore.getState().logout()

    expect(logoutOnServer).toHaveBeenCalled()
    expect(clearTokens).toHaveBeenCalled()
    expect(useAuthStore.getState()).toMatchObject({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasSession: false,
      sessionReady: true,
    })
  })

  it('fetchUserProfile updates user when API returns profile', async () => {
    vi.mocked(fetchUser).mockResolvedValue({ email: 'admin@example.com', is_superuser: true })
    vi.mocked(loadTokens).mockReturnValue({ access: 'a', refresh: 'r' })

    await useAuthStore.getState().fetchUserProfile()

    expect(useAuthStore.getState().user?.email).toBe('admin@example.com')
    expect(useAuthStore.getState().hasSession).toBe(true)
  })

  it('bootstrap sets session state and marks ready', async () => {
    vi.mocked(bootstrap).mockResolvedValue({
      hasSession: true,
      tokens: { access: 'a', refresh: 'r' },
      user: { email: 'admin@example.com', is_superuser: true },
    })

    await useAuthStore.getState().bootstrap({ fetchUser: true })

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'a',
      refreshToken: 'r',
      hasSession: true,
      sessionReady: true,
    })
  })

  it('syncFromStorage mirrors tokens from local storage', () => {
    vi.mocked(loadTokens).mockReturnValue({ access: 'stored', refresh: 'refresh' })

    useAuthStore.getState().syncFromStorage()

    expect(useAuthStore.getState()).toMatchObject({
      accessToken: 'stored',
      refreshToken: 'refresh',
      hasSession: true,
    })
  })
})
