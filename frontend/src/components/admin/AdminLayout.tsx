import { Link, useLocation } from 'react-router-dom'
import { BookOpen, FolderOpen, LayoutTemplate } from 'lucide-react'
import AccountMenu from '../auth/AccountMenu'
import SiteHeader from '../layout/SiteHeader'
import type { BreadcrumbItem } from '../layout/Breadcrumbs'
import type { ReactNode } from 'react'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'

interface AdminLayoutProps {
  children: ReactNode
  userEmail?: string
  onLogout: () => void
  variant?: 'default' | 'editor'
  breadcrumbs?: BreadcrumbItem[]
}

export default function AdminLayout({
  children,
  userEmail,
  onLogout,
  variant = 'default',
  breadcrumbs,
}: AdminLayoutProps) {
  const location = useLocation()
  const locale = useLocaleStore((s) => s.locale)
  const isEditor = variant === 'editor'

  const navItems = [
    {
      to: '/admin',
      label: translate(locale, 'admin.navProducts'),
      icon: BookOpen,
      match: (p: string) => p === '/admin' || p.includes('/editor'),
    },
    {
      to: '/admin/home',
      label: translate(locale, 'admin.navHome'),
      icon: LayoutTemplate,
      match: (p: string) => p === '/admin/home',
    },
    {
      to: '/admin/media',
      label: translate(locale, 'admin.navMedia'),
      icon: FolderOpen,
      match: (p: string) => p.startsWith('/admin/media'),
    },
  ]

  const adminNav = (
    <nav className="flex items-center gap-0.5 overflow-x-auto">
      {navItems.map((item) => {
        const active = item.match(location.pathname)
        const Icon = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors sm:px-3 ${
              active
                ? 'bg-accent-muted font-medium text-accent-hover'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={active ? 2.25 : 2} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const accountMenuLinks = isEditor
    ? [{ to: '/account/password', label: translate(locale, 'account.changePassword') }]
    : [
        { to: '/', label: translate(locale, 'admin.navPublicDocs') },
        { to: '/account/password', label: translate(locale, 'account.changePassword') },
      ]

  return (
    <div
      className={`flex flex-col bg-surface ${isEditor ? 'h-screen overflow-hidden' : 'min-h-screen'}`}
    >
      <SiteHeader
        contentMaxWidth="none"
        brandTo="/admin"
        breadcrumbs={breadcrumbs ?? [{ label: translate(locale, 'admin.breadcrumb') }]}
        nav={adminNav}
        actions={
          userEmail ? (
            <AccountMenu
              label={userEmail}
              onLogout={onLogout}
              links={accountMenuLinks}
            />
          ) : null
        }
      />

      <main className={`flex min-h-0 min-w-0 flex-1 flex-col ${isEditor ? 'overflow-hidden' : ''}`}>
        {children}
      </main>
    </div>
  )
}
