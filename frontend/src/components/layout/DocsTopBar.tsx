import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../ui/BrandMark'
import DocSearchCombobox from '../search/DocSearchCombobox'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import AdminEntryLink from '../auth/AdminEntryLink'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'
import type { Locale } from '../../i18n'

interface DocsTopBarProps {
  productName?: string
  productSlug?: string
  versions: {
    id: number
    slug: string
    name: string
    is_latest: boolean
    is_published: boolean
  }[]
  versionSlug: string
  onVersionChange: (slug: string) => void
  onLocaleChange?: (locale: Locale) => void
  leading?: ReactNode
}

export default function DocsTopBar({
  productName,
  productSlug,
  versions,
  versionSlug,
  onVersionChange,
  onLocaleChange,
  leading,
}: DocsTopBarProps) {
  const locale = useLocaleStore((s) => s.locale)

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-stone-200 bg-surface-raised px-3 sm:gap-3 sm:px-4 lg:px-6">
      {leading}

      <span className="sm:hidden">
        <BrandMark to="/" compact />
      </span>
      <span className="hidden sm:inline-flex">
        <BrandMark to="/" />
      </span>

      {productName && productSlug && (
        <>
          <div className="hidden h-5 w-px bg-stone-200 md:block" aria-hidden />
          <Link
            to={`/${productSlug}`}
            className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink transition-colors hover:text-accent lg:max-w-[14rem] xl:inline-block"
            title={productName}
          >
            {productName}
          </Link>
        </>
      )}

      <select
        className="ui-input hidden w-auto min-w-[7rem] py-1.5 text-sm sm:block"
        value={versionSlug === 'latest' ? 'latest' : versionSlug}
        onChange={(e) => onVersionChange(e.target.value)}
        aria-label={translate(locale, 'docs.version')}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.is_latest ? 'latest' : v.slug}>
            {v.name}
            {v.is_latest ? ` ${translate(locale, 'docs.versionLatest')}` : ''}
            {!v.is_published ? ` ${translate(locale, 'docs.versionDraft')}` : ''}
          </option>
        ))}
      </select>

      <LanguageSwitcher onChange={onLocaleChange} />

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-xs md:max-w-sm lg:max-w-md">
        <DocSearchCombobox
          productSlug={productSlug}
          placeholder={translate(locale, 'docs.searchPlaceholder')}
          className="w-full"
          panelAlign="end"
        />
        <AdminEntryLink className="ui-btn-secondary hidden shrink-0 py-1.5 text-sm lg:inline-flex" />
      </div>
    </header>
  )
}
