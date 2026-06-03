import type { ReactNode } from 'react'
import BrandMark from '../ui/BrandMark'
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs'

interface SiteHeaderProps {
  leading?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  nav?: ReactNode
  actions?: ReactNode
  subheader?: ReactNode
  /** Constrain header inner content (home listing); docs use full inner width */
  contentMaxWidth?: '6xl' | 'none'
  /** Brand link target (default: public home) */
  brandTo?: string
}

/** Single header shell — public pages share identical layout. */
export default function SiteHeader({
  leading,
  breadcrumbs,
  nav,
  actions,
  subheader,
  contentMaxWidth = '6xl',
  brandTo = '/',
}: SiteHeaderProps) {
  const innerPad = 'w-full px-4 py-2 sm:px-6 lg:px-8'
  const innerMax =
    contentMaxWidth === '6xl' ? 'mx-auto max-w-6xl' : ''
  const rowClass = `flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 ${innerPad} ${innerMax}`.trim()

  const hasTrail = breadcrumbs && breadcrumbs.length > 0

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-stone-200/80 bg-surface-raised/95 backdrop-blur-sm">
      <div className={rowClass}>
        {leading}
        <span className="shrink-0 sm:hidden">
          <BrandMark to={brandTo} compact />
        </span>
        <span className="hidden shrink-0 sm:block">
          <BrandMark to={brandTo} />
        </span>
        {hasTrail && (
          <>
            <div className="hidden h-5 w-px shrink-0 bg-stone-200 sm:block" aria-hidden />
            <Breadcrumbs items={breadcrumbs!} className="min-w-0 flex-1 basis-full sm:basis-auto" />
          </>
        )}
        {nav && <div className="flex min-w-0 flex-1 items-center sm:flex-initial">{nav}</div>}
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      {subheader && (
        <div className="border-t border-stone-100">
          <div className={`${innerPad} ${innerMax} py-3`.trim()}>{subheader}</div>
        </div>
      )}
    </header>
  )
}
