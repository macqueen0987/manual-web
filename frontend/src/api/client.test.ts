import { beforeEach, describe, expect, it, vi } from 'vitest'

const axiosHandlers = vi.hoisted(() => ({
  request: null as ((config: Record<string, unknown>) => Record<string, unknown>) | null,
  responseError: null as ((error: unknown) => Promise<unknown>) | null,
  instance: vi.fn(),
}))

const authStoreMocks = vi.hoisted(() => ({
  syncFromStorage: vi.fn(),
  setState: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const instance = Object.assign(axiosHandlers.instance, {
        interceptors: {
          request: {
            use: (fn: typeof axiosHandlers.request) => {
              axiosHandlers.request = fn
            },
          },
          response: {
            use: (_ok: unknown, err: typeof axiosHandlers.responseError) => {
              axiosHandlers.responseError = err
            },
          },
        },
      })
      return instance
    }),
  },
}))

vi.mock('../auth/sessionService', () => ({
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(),
  refresh: vi.fn(),
  loadTokens: vi.fn(),
}))

vi.mock('../utils/jwt', () => ({
  isAccessTokenExpired: vi.fn(),
}))

vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ syncFromStorage: authStoreMocks.syncFromStorage }),
    setState: authStoreMocks.setState,
  },
}))

import { clearTokens, getAccessToken, loadTokens, refresh } from '../auth/sessionService'
import { isAccessTokenExpired } from '../utils/jwt'
import '../api/client'

describe('api client interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    axiosHandlers.instance.mockReset()
  })

  it('adds Authorization header when access token exists', () => {
    vi.mocked(getAccessToken).mockReturnValue('token-abc')
    const config = { headers: {} as Record<string, string> }
    const next = axiosHandlers.request!(config)
    expect(next.headers.Authorization).toBe('Bearer token-abc')
  })

  it('retries request after successful refresh on 401', async () => {
    vi.mocked(loadTokens).mockReturnValue({ access: 'old', refresh: 'refresh-1' })
    vi.mocked(refresh).mockResolvedValue({ access: 'new-access', refresh: 'refresh-1' })
    axiosHandlers.instance.mockResolvedValue({ data: 'ok' })

    const originalRequest = { headers: {}, _retry: false }
    const error = { response: { status: 401 }, config: originalRequest }

    await axiosHandlers.responseError!(error)

    expect(refresh).toHaveBeenCalled()
    expect(originalRequest.headers.Authorization).toBe('Bearer new-access')
    expect(authStoreMocks.syncFromStorage).toHaveBeenCalled()
    expect(axiosHandlers.instance).toHaveBeenCalledWith(originalRequest)
  })

  it('clears session and redirects from admin on refresh failure', async () => {
    vi.mocked(loadTokens).mockReturnValue({ access: 'old', refresh: 'refresh-1' })
    vi.mocked(refresh).mockResolvedValue(null)
    vi.mocked(isAccessTokenExpired).mockReturnValue(true)

    const originalRequest = { headers: {}, _retry: false }
    const error = { response: { status: 401 }, config: originalRequest }

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/admin/products', href: '' },
    })

    await expect(axiosHandlers.responseError!(error)).rejects.toEqual(error)

    expect(clearTokens).toHaveBeenCalled()
    expect(authStoreMocks.setState).toHaveBeenCalledWith({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasSession: false,
    })
    expect(window.location.href).toBe('/login')
  })
})
