import axios from 'axios'
import { isAccessTokenExpired } from '../utils/jwt'

export interface SessionUser {
  id: number
  email: string
  full_name: string | null
  is_superuser: boolean
}

export interface SessionTokens {
  access: string
  refresh: string
}

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
const REFRESH_LOCK_KEY = 'manual_web_auth_refresh_lock'
const LOCK_STALE_MS = 15_000

const rawApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

let bootstrapGeneration = 0
let onTokensChanged: ((tokens: SessionTokens | null) => void) | null = null

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function notifyTokensChanged() {
  onTokensChanged?.(loadTokens())
}

export function setSessionChangeHandler(
  handler: ((tokens: SessionTokens | null) => void) | null,
) {
  onTokensChanged = handler
}

export function loadTokens(): SessionTokens | null {
  const access = localStorage.getItem(ACCESS_KEY)
  const refresh = localStorage.getItem(REFRESH_KEY)
  return access && refresh ? { access, refresh } : null
}

export function saveTokens(access: string, refresh: string): SessionTokens {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
  const tokens = { access, refresh }
  notifyTokensChanged()
  return tokens
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  notifyTokensChanged()
}

export function hasStoredSession(): boolean {
  return loadTokens() !== null
}

export function getAccessToken(): string | null {
  return loadTokens()?.access ?? null
}

function recoverTokensAfterRefreshFailure(): SessionTokens | null {
  const tokens = loadTokens()
  if (!tokens || isAccessTokenExpired(tokens.access)) return null
  return tokens
}

function acquireLock(): boolean {
  const now = Date.now()
  const raw = localStorage.getItem(REFRESH_LOCK_KEY)
  if (raw) {
    const started = Number(raw)
    if (!Number.isNaN(started) && now - started < LOCK_STALE_MS) {
      return false
    }
  }
  localStorage.setItem(REFRESH_LOCK_KEY, String(now))
  return true
}

function releaseLock() {
  localStorage.removeItem(REFRESH_LOCK_KEY)
}

async function postRefresh(refreshToken: string): Promise<SessionTokens> {
  const res = await rawApi.post('/auth/refresh', {
    token: refreshToken,
    refresh_token: refreshToken,
  })
  return saveTokens(res.data.access_token as string, res.data.refresh_token as string)
}

/** Cross-tab safe refresh (rotation-safe). Returns null when refresh fails. */
export async function refresh(): Promise<SessionTokens | null> {
  const existing = loadTokens()
  if (!existing) return null

  if (!acquireLock()) {
    const previousRefresh = existing.refresh
    for (let i = 0; i < 40; i++) {
      await sleep(100)
      const tokens = loadTokens()
      if (tokens && tokens.refresh !== previousRefresh) {
        return tokens
      }
      if (!localStorage.getItem(REFRESH_LOCK_KEY)) {
        return loadTokens()
      }
    }
    return loadTokens()
  }

  let attemptedRefresh: string | null = null
  try {
    const latest = loadTokens()
    if (!latest) return null
    attemptedRefresh = latest.refresh
    return await postRefresh(latest.refresh)
  } catch {
    await sleep(200)
    const current = loadTokens()
    if (!current) return null
    if (attemptedRefresh && current.refresh !== attemptedRefresh) {
      return current
    }
    if (!isAccessTokenExpired(current.access)) {
      return current
    }
    return null
  } finally {
    releaseLock()
  }
}

export async function ensureValidAccess(): Promise<SessionTokens | null> {
  const tokens = loadTokens()
  if (!tokens) return null
  if (!isAccessTokenExpired(tokens.access)) return tokens
  return refresh()
}

export async function fetchUser(): Promise<SessionUser | null> {
  const tokens = await ensureValidAccess()
  if (!tokens) return null

  try {
    const res = await rawApi.get<SessionUser>('/auth/me', {
      headers: { Authorization: `Bearer ${tokens.access}` },
    })
    return res.data
  } catch {
    const recovered = recoverTokensAfterRefreshFailure()
    if (!recovered) return null
    try {
      const res = await rawApi.get<SessionUser>('/auth/me', {
        headers: { Authorization: `Bearer ${recovered.access}` },
      })
      return res.data
    } catch {
      return null
    }
  }
}

export interface BootstrapOptions {
  fetchUser?: boolean
}

export interface BootstrapResult {
  tokens: SessionTokens | null
  user: SessionUser | null
  hasSession: boolean
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const generation = ++bootstrapGeneration
  const isStale = () => generation !== bootstrapGeneration
  const shouldFetchUser = options.fetchUser ?? false

  try {
    const initial = loadTokens()
    if (!initial) {
      clearTokens()
      return { tokens: null, user: null, hasSession: false }
    }

    if (isAccessTokenExpired(initial.access)) {
      const refreshed = await refresh()
      if (!refreshed) {
        const recovered = recoverTokensAfterRefreshFailure()
        if (!recovered && !isStale()) {
          clearTokens()
          return { tokens: null, user: null, hasSession: false }
        }
      }
    }

    if (isStale()) {
      const tokens = loadTokens()
      return { tokens, user: null, hasSession: tokens !== null }
    }

    let user: SessionUser | null = null
    if (shouldFetchUser) {
      user = await fetchUser()
    }

    if (isStale()) {
      const tokens = loadTokens()
      return { tokens, user: null, hasSession: tokens !== null }
    }

    const tokens = loadTokens()
    return {
      tokens,
      user,
      hasSession: tokens !== null,
    }
  } catch {
    const tokens = loadTokens()
    return {
      tokens,
      user: null,
      hasSession: tokens !== null,
    }
  }
}

export async function logoutOnServer(): Promise<void> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  const access = getAccessToken()
  try {
    if (refresh) {
      await rawApi.post(
        '/auth/logout',
        { refresh_token: refresh },
        access ? { headers: { Authorization: `Bearer ${access}` } } : undefined,
      )
    }
  } catch {
    /* clear locally even when server call fails */
  }
}

export function initCrossTabSync(
  onSync: (tokens: SessionTokens | null) => void,
): void {
  if (typeof window === 'undefined') return

  window.addEventListener('storage', (event) => {
    if (event.key !== ACCESS_KEY && event.key !== REFRESH_KEY) return
    onSync(loadTokens())
  })
}

/** @deprecated Use sessionService.refresh — kept for transitional imports */
export const refreshAccessToken = refresh

/** @deprecated Use sessionService.loadTokens */
export const getStoredTokens = loadTokens
