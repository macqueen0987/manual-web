import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import PageLoader from '../ui/PageLoader'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'

export default function AdminRoute({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale)
  const hasSession = useAuthStore((s) => s.hasSession)
  const sessionReady = useAuthStore((s) => s.sessionReady)

  if (!sessionReady) {
    return <PageLoader label={translate(locale, 'common.starting')} />
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />
  }

  return children
}
