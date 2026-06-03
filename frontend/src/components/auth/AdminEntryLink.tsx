import { Link } from 'react-router-dom'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'
import { useAuthStore } from '../../stores/authStore'
import { useEnsureUser } from './useEnsureUser'
import AccountMenu from './AccountMenu'

interface AdminEntryLinkProps {
  className?: string
}

/** Public header admin control — login link, or account menu (admin + logout). */
export default function AdminEntryLink({ className }: AdminEntryLinkProps) {
  const locale = useLocaleStore((s) => s.locale)
  const hasSession = useAuthStore((s) => s.hasSession)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  useEnsureUser()

  if (!hasSession) {
    return (
      <Link to="/login" className={className}>
        {translate(locale, 'common.adminLogin')}
      </Link>
    )
  }

  const accountLabel =
    user?.email?.trim() || translate(locale, 'admin.accountMenu')

  return (
    <AccountMenu
      label={accountLabel}
      onLogout={logout}
      links={[{ to: '/admin', label: translate(locale, 'common.admin') }]}
    />
  )
}
