import { translate, type Locale } from '../../i18n'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import { useSiteFooter } from '../../hooks/useSiteFooter'
import SiteFooter from './SiteFooter'

interface PublicSiteFooterProps {
  locale: Locale
  contentMaxWidth?: '6xl' | 'docs'
}

export default function PublicSiteFooter({
  locale,
  contentMaxWidth = '6xl',
}: PublicSiteFooterProps) {
  const customHtml = useSiteFooter(locale)
  const { title } = useSiteBranding()
  const year = new Date().getFullYear()

  if (customHtml) {
    return (
      <div
        className="site-footer-template mt-auto shrink-0"
        dangerouslySetInnerHTML={{ __html: customHtml }}
      />
    )
  }

  return (
    <SiteFooter contentMaxWidth={contentMaxWidth}>
      <p className="text-center text-xs text-ink-muted sm:text-sm">
        {translate(locale, 'common.footerCopyright', { year, siteTitle: title })}
      </p>
    </SiteFooter>
  )
}
