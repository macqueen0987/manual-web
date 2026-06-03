import { create } from 'zustand'
import axios from 'axios'
import client from '../api/client'
import { isAccessTokenExpired } from '../utils/jwt'

interface User {
  id: number
  email: string
  full_name: string | null
  is_superuser: boolean
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => Promise<void>
  validateSession: () => Promise<void>
}

function clearStoredAuth(set: (partial: Partial<AuthState>) => void) {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  set({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  })
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true })
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    const refresh = localStorage.getItem('refresh_token')
    try {
      if (refresh) {
        await client.post('/auth/logout', { refresh_token: refresh })
      } else {
        await client.post('/auth/logout')
      }
    } catch {
      /* clear local session even if server call fails */
    }
    clearStoredAuth(set)
  },
  validateSession: async () => {
    const access = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    if (!access || !refresh) {
      clearStoredAuth(set)
      return
    }

    let activeAccess = access
    if (isAccessTokenExpired(access)) {
      try {
        const res = await axios.post('/api/auth/refresh', {
          token: refresh,
          refresh_token: refresh,
        })
        activeAccess = res.data.access_token
        localStorage.setItem('access_token', activeAccess)
        localStorage.setItem('refresh_token', res.data.refresh_token)
      } catch {
        clearStoredAuth(set)
        return
      }
    }

    try {
      const res = await client.get('/auth/me', {
        headers: { Authorization: `Bearer ${activeAccess}` },
      })
      set({
        accessToken: activeAccess,
        refreshToken: localStorage.getItem('refresh_token'),
        user: res.data,
        isAuthenticated: true,
      })
    } catch {
      clearStoredAuth(set)
    }
  },
}))
