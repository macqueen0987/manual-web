import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import type { BreadcrumbItem } from './Breadcrumbs'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'

interface PublicHeaderProps {
  breadcrumbs?: BreadcrumbItem[]
  nav?: ReactNode
  actions?: ReactNode
  subheader?: ReactNode
  leading?: ReactNode
  contentMaxWidth?: '6xl' | 'none'
}

export default function PublicHeader({
  breadcrumbs,
  nav,
  actions,
  subheader,
  leading,
  contentMaxWidth = '6xl',
}: PublicHeaderProps) {
  const locale = useLocaleStore((s) => s.locale)

  return (
    <SiteHeader
      leading={leading}
      breadcrumbs={breadcrumbs}
      nav={nav}
      subheader={subheader}
      contentMaxWidth={contentMaxWidth}
      actions={
        actions ?? (
          <>
            <LanguageSwitcher />
            <Link to="/login" className="ui-btn-secondary py-1.5 text-sm">
              {translate(locale, 'common.adminLogin')}
            </Link>
          </>
        )
      }
    />
  )
}
