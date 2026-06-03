import type { ReactNode } from 'react'
import BrandMark from '../ui/BrandMark'
import Breadcrumbs, { type BreadcrumbItem } from './Breadcrumbs'

interface SiteHeaderProps {
  leading?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  /** Center slot (e.g. global search on home). */
  center?: ReactNode
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
  center,
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
  const useCenteredSearch = Boolean(center)

  const brandCluster = (
    <>
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
          <Breadcrumbs
            items={breadcrumbs!}
            className="min-w-0 flex-1 basis-full sm:basis-auto"
          />
        </>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-stone-200/80 bg-surface-raised/95 backdrop-blur-sm">
      <div
        className={
          useCenteredSearch
            ? `grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,36rem)_minmax(0,1fr)] sm:px-6 lg:px-8 ${innerMax}`.trim()
            : rowClass
        }
      >
        {useCenteredSearch ? (
          <>
            <div className="flex min-w-0 items-center gap-x-3 sm:col-start-1 sm:row-start-1">
              {brandCluster}
            </div>
            <div className="col-span-2 w-full min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:max-w-xl sm:justify-self-center">
              {center}
            </div>
            <div className="flex shrink-0 items-center justify-self-end gap-2 sm:col-start-3 sm:row-start-1">
              {actions}
            </div>
          </>
        ) : (
          <>
            {brandCluster}
            {nav && (
              <div className="flex min-w-0 flex-1 items-center sm:flex-initial">{nav}</div>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
          </>
        )}
      </div>
      {subheader && (
        <div className="border-t border-stone-100">
          <div className={`${innerPad} ${innerMax} py-3`.trim()}>{subheader}</div>
        </div>
      )}
    </header>
  )
}
