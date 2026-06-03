import type { ReactNode } from 'react'
import SiteHeader from './SiteHeader'
import type { BreadcrumbItem } from './Breadcrumbs'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import AdminEntryLink from '../auth/AdminEntryLink'

interface PublicHeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  center?: ReactNode
  nav?: ReactNode
  actions?: ReactNode
  subheader?: ReactNode
  leading?: ReactNode
  contentMaxWidth?: '6xl' | 'none'
}

export default function PublicHeader({
  breadcrumbs,
  center,
  nav,
  actions,
  subheader,
  leading,
  contentMaxWidth = '6xl',
}: PublicHeaderProps) {
  const defaultActions = (
    <>
      <LanguageSwitcher />
      <AdminEntryLink className="ui-btn-secondary py-1.5 text-sm" />
    </>
  )

  return (
    <SiteHeader
      leading={leading}
      breadcrumbs={breadcrumbs}
      center={center}
      nav={nav}
      subheader={subheader}
      contentMaxWidth={contentMaxWidth}
      actions={actions ?? defaultActions}
    />
  )
}
