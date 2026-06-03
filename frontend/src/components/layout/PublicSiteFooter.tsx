import { translate, type Locale } from '../../i18n'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { useSiteFooter } from '../../hooks/useSiteFooter'
import SiteFooter from './SiteFooter'

interface PublicSiteFooterProps {
  locale: Locale
  contentMaxWidth?: '6xl' | 'docs'
  pinned?: boolean
}

export default function PublicSiteFooter({
  locale,
  contentMaxWidth = '6xl',
  pinned = false,
}: PublicSiteFooterProps) {
  const customHtml = useSiteFooter(locale)
  const { title } = useSiteBranding()
  const year = new Date().getFullYear()

  if (customHtml) {
    return (
      <div
        className={
          pinned
            ? 'site-footer-template sticky bottom-0 z-10 shrink-0 border-t border-stone-200/80 bg-surface/95 backdrop-blur-sm'
            : 'site-footer-template shrink-0'
        }
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    )
  }

  return (
    <SiteFooter contentMaxWidth={contentMaxWidth} pinned={pinned}>
      <p className="text-center text-xs text-ink-muted sm:text-sm">
        {translate(locale, 'common.footerCopyright', { year, siteTitle: title })}
      </p>
    </SiteFooter>
  )
}
