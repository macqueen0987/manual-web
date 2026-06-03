import { create } from 'zustand'
import {
  bootstrap as sessionBootstrap,
  clearTokens,
  initCrossTabSync,
  loadTokens,
  logoutOnServer,
  saveTokens,
  setSessionChangeHandler,
  fetchUser as sessionFetchUser,
  type SessionUser,
} from '../auth/sessionService'

export type User = SessionUser

function mirrorFromTokens(): Pick<
  AuthState,
  'accessToken' | 'refreshToken' | 'hasSession'
> {
  const tokens = loadTokens()
  if (!tokens) {
    return { accessToken: null, refreshToken: null, hasSession: false }
  }
  return {
    accessToken: tokens.access,
    refreshToken: tokens.refresh,
    hasSession: true,
  }
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  hasSession: boolean
  sessionReady: boolean
  loginWithTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => Promise<void>
  bootstrap: (options?: { fetchUser?: boolean }) => Promise<void>
  fetchUserProfile: () => Promise<void>
  syncFromStorage: () => void
}

let bootstrapGeneration = 0

export const useAuthStore = create<AuthState>((set) => {
  const applyMirror = (partial?: Partial<AuthState>) => {
    set({ ...mirrorFromTokens(), ...partial })
  }

  setSessionChangeHandler((tokens) => {
    if (!tokens) {
      set({
        accessToken: null,
        refreshToken: null,
        hasSession: false,
        user: null,
      })
      return
    }
    set({
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      hasSession: true,
    })
  })

  initCrossTabSync((tokens) => {
    if (!tokens) {
      set({
        accessToken: null,
        refreshToken: null,
        hasSession: false,
        user: null,
      })
      return
    }
    set({
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
      hasSession: true,
    })
  })

  return {
    ...mirrorFromTokens(),
    user: null,
    sessionReady: false,
    loginWithTokens: (access, refresh) => {
      saveTokens(access, refresh)
      set({
        accessToken: access,
        refreshToken: refresh,
        hasSession: true,
        sessionReady: true,
      })
    },
    setUser: (user) => set({ user }),
    syncFromStorage: () => applyMirror(),
    logout: async () => {
      await logoutOnServer()
      clearTokens()
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        hasSession: false,
        sessionReady: true,
      })
    },
    fetchUserProfile: async () => {
      const user = await sessionFetchUser()
      if (user) {
        applyMirror({ user })
      }
    },
    bootstrap: async (options) => {
      const generation = ++bootstrapGeneration
      const isStale = () => generation !== bootstrapGeneration

      try {
        const result = await sessionBootstrap(options)
        if (isStale()) return
        set({
          accessToken: result.tokens?.access ?? null,
          refreshToken: result.tokens?.refresh ?? null,
          hasSession: result.hasSession,
          user: result.user,
        })
      } finally {
        if (!isStale()) set({ sessionReady: true })
      }
    },
  }
})

/** @deprecated Use hasSession */
export function useHasSession(): boolean {
  return useAuthStore((s) => s.hasSession)
}
