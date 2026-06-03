import { useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

/** Loads `/auth/me` into the store when a session exists but profile is missing. */
export function useEnsureUser() {
  const user = useAuthStore((s) => s.user)
  const hasSession = useAuthStore((s) => s.hasSession)
  const sessionReady = useAuthStore((s) => s.sessionReady)
  const fetchUserProfile = useAuthStore((s) => s.fetchUserProfile)

  useEffect(() => {
    if (!sessionReady || !hasSession || user) return
    void fetchUserProfile()
  }, [sessionReady, hasSession, user, fetchUserProfile])
}
