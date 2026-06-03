import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileSearch, Search, X } from 'lucide-react'
import SearchField from '../ui/SearchField'
import HighlightText from '../ui/HighlightText'
import { useDocSearch } from '../../hooks/useDocSearch'
import { useDocLocale } from '../../hooks/useDocLocale'
import { translate, withLocalePath } from '../../i18n'
import type { SearchHit } from '../../types/search'
import { plainSearchExcerpt } from '../../utils/searchExcerpt'

const PREVIEW_LIMIT = 5

interface DocSearchComboboxProps {
  productSlug?: string
  placeholder?: string
  size?: 'default' | 'large'
  className?: string
  panelAlign?: 'stretch' | 'end'
}

function SearchResultItem({
  hit,
  locale,
  query,
  onNavigate,
}: {
  hit: SearchHit
  locale: ReturnType<typeof useDocLocale>['locale']
  query: string
  onNavigate: () => void
}) {
  const excerpt = hit.excerpt ? plainSearchExcerpt(hit.excerpt, 120) : ''

  return (
    <li>
      <Link
        to={withLocalePath(`/${hit.product_slug}/${hit.version_slug}/${hit.slug}`, locale)}
        className="group flex gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-stone-50/90 focus-visible:bg-stone-50/90 focus-visible:outline-none"
        onClick={onNavigate}
      >
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-gradient-to-br from-surface-raised to-stone-50 text-accent shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
          aria-hidden
        >
          <Search size={18} strokeWidth={2} className="opacity-80" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-left font-display text-[0.9375rem] font-semibold leading-snug text-ink group-hover:text-accent-hover">
            <HighlightText text={hit.title} query={query} />
          </span>
          {excerpt ? (
            <span className="mt-1 block truncate text-sm leading-snug text-ink-muted">
              <HighlightText text={excerpt} query={query} />
            </span>
          ) : null}
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="ui-badge-muted max-w-[12rem] truncate">{hit.product_name}</span>
            <span className="text-ink-faint" aria-hidden>
              ·
            </span>
            <span className="text-xs text-ink-faint">{hit.version_name}</span>
          </span>
        </span>
        <ArrowRight
          size={16}
          className="mt-1 shrink-0 text-ink-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100"
          aria-hidden
        />
      </Link>
    </li>
  )
}

function SearchSkeleton() {
  return (
    <ul className="space-y-0 px-4 py-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex gap-3.5 py-3.5">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-stone-100" />
          <div className="flex-1 space-y-2 border-b border-stone-100 pb-3.5">
            <div className="h-4 w-2/5 animate-pulse rounded-md bg-stone-100" />
            <div className="h-3 w-full animate-pulse rounded-md bg-stone-50" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function DocSearchCombobox({
  productSlug,
  placeholder,
  size = 'default',
  className = '',
  panelAlign = 'stretch',
}: DocSearchComboboxProps) {
  const { locale } = useDocLocale()
  const { query, setQuery, results, open, loading, close, submit } = useDocSearch(productSlug)
  const [showAll, setShowAll] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setShowAll(false)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open, close])

  const handleNavigate = () => {
    close()
    setShowAll(false)
  }

  const visible = showAll ? results : results.slice(0, PREVIEW_LIMIT)
  const hasMore = results.length > PREVIEW_LIMIT && !showAll

  const panelPosition =
    panelAlign === 'end'
      ? 'right-0 w-[min(calc(100vw-1.5rem),30rem)] sm:w-[34rem]'
      : 'left-0 right-0 w-full'

  return (
    <div ref={rootRef} className={`relative text-left ${className}`}>
      <SearchField
        size={size}
        value={query}
        onChange={setQuery}
        onSubmit={submit}
        placeholder={placeholder}
        active={open}
        ariaExpanded={open}
        ariaControls={open ? 'doc-search-results' : undefined}
      />

      {open && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-stone-900/20 backdrop-blur-[1px]"
            aria-hidden
            onClick={close}
          />
          <div
            id="doc-search-results"
            role="dialog"
            aria-label={translate(locale, 'search.resultsDialog')}
            className={`absolute top-[calc(100%+0.625rem)] z-[70] ${panelPosition}`}
          >
            <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white text-left shadow-[0_16px_48px_-12px_rgba(28,25,23,0.18)]">
              <button
                type="button"
                onClick={close}
                className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-stone-100 hover:text-ink"
                aria-label={translate(locale, 'common.close')}
              >
                <X size={18} />
              </button>

              {!loading && results.length > 0 && (
                <p className="border-b border-stone-100 px-4 py-2.5 pr-12 text-xs font-medium uppercase tracking-wide text-ink-faint">
                  {translate(locale, 'search.resultCount', { count: results.length })}
                </p>
              )}

              <div className="max-h-[min(70vh,26rem)] overflow-y-auto overscroll-contain">
                {loading ? (
                  <SearchSkeleton />
                ) : results.length === 0 ? (
                  <div className="flex flex-col items-start px-5 py-10 text-left">
                    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50 text-ink-faint">
                      <FileSearch size={22} strokeWidth={1.5} />
                    </span>
                    <p className="text-sm font-medium text-ink">{translate(locale, 'search.noResults')}</p>
                    <p className="mt-1 max-w-xs text-sm text-ink-muted">
                      {translate(locale, 'search.noResultsHint')}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {visible.map((hit) => (
                      <SearchResultItem
                        key={hit.id}
                        hit={hit}
                        locale={locale}
                        query={query}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {!loading && hasMore && (
                <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                  >
                    {translate(locale, 'search.viewAll', { count: results.length })}
                    <ArrowRight size={15} aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
