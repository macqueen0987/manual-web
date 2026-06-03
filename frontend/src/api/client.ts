import axios from 'axios'
import { clearTokens, getAccessToken, refresh, loadTokens } from '../auth/sessionService'
import { isAccessTokenExpired } from '../utils/jwt'
import { useAuthStore } from '../stores/authStore'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      if (loadTokens()?.refresh) {
        const tokens = await refresh()
        const active =
          tokens ??
          (() => {
            const stored = loadTokens()
            return stored && !isAccessTokenExpired(stored.access) ? stored : null
          })()
        if (active) {
          originalRequest.headers.Authorization = `Bearer ${active.access}`
          useAuthStore.getState().syncFromStorage()
          return client(originalRequest)
        }
        clearTokens()
        useAuthStore.setState({
          accessToken: null,
          refreshToken: null,
          user: null,
          hasSession: false,
        })
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

export default client
