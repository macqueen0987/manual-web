import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Search } from 'lucide-react'
import type { Locale } from '../../i18n'
import { translate, withLocalePath } from '../../i18n'
import {
  categoryGroupLabel,
  categorySectionId,
  groupProductsByCategory,
  type ProductWithCategory,
} from '../../utils/productCategories'

interface ExploreProductDirectoryProps {
  products: ProductWithCategory[]
  locale: Locale
  /** Per-category headings; disable when the home showcase already groups by family. */
  groupByCategory?: boolean
  /** Category pill on cards; off when the showcase already labels each family. */
  showCategoryOnCards?: boolean
}

export default function ExploreProductDirectory({
  products,
  locale,
  groupByCategory = true,
  showCategoryOnCards = true,
}: ExploreProductDirectoryProps) {
  const [filter, setFilter] = useState('')
  const groups = useMemo(() => groupProductsByCategory(products), [products])
  const showCategorySections =
    groupByCategory &&
    (groups.length > 1 || (groups.length === 1 && groups[0].label !== null))
  const q = filter.trim().toLowerCase()

  const filteredGroups = useMemo(() => {
    if (!q) return groups
    return groups
      .map((group) => ({
        ...group,
        products: group.products.filter((p) => {
          const haystack = `${p.name} ${p.description ?? ''} ${p.category ?? ''}`.toLowerCase()
          return haystack.includes(q)
        }),
      }))
      .filter((g) => g.products.length > 0)
  }, [groups, q])

  const flatFiltered = useMemo(() => {
    const list = q
      ? products.filter((p) => `${p.name} ${p.description ?? ''}`.toLowerCase().includes(q))
      : products
    return list
  }, [products, q])

  return (
    <ExploreLayout filter={filter} onFilterChange={setFilter} locale={locale}>
      {showCategorySections ? (
        <div className="space-y-10">
          {filteredGroups.map((group) => {
            const label = categoryGroupLabel(group, locale)
            const anchor = categorySectionId(group.key)
            return (
              <section
                key={group.key || '__uncategorized'}
                id={anchor}
                className="scroll-mt-24"
                aria-labelledby={`heading-${anchor}`}
              >
                <h3
                  id={`heading-${anchor}`}
                  className="mb-4 text-base font-semibold text-ink sm:text-lg"
                >
                  {label}
                </h3>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((product) => (
                    <ProductExploreCard
                      key={product.id}
                      product={product}
                      locale={locale}
                      showCategory={false}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
          {filteredGroups.length === 0 && <ExploreEmpty locale={locale} />}
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flatFiltered.map((product) => (
              <ProductExploreCard
                key={product.id}
                product={product}
                locale={locale}
                showCategory={showCategoryOnCards}
              />
            ))}
          </ul>
          {flatFiltered.length === 0 && <ExploreEmpty locale={locale} />}
        </>
      )}
    </ExploreLayout>
  )
}

function ExploreLayout({
  filter,
  onFilterChange,
  locale,
  children,
}: {
  filter: string
  onFilterChange: (v: string) => void
  locale: Locale
  children: ReactNode
}) {
  return (
    <section aria-labelledby="home-explore">
      <div className="mb-6 flex flex-col gap-2 border-b border-stone-200 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2
            id="home-explore"
            className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
          >
            {translate(locale, 'home.exploreAll')}
          </h2>
          <p className="mt-1.5 text-sm text-ink-muted sm:text-base">
            {translate(locale, 'home.exploreSubtitle')}
          </p>
        </div>
        <label className="relative block w-full shrink-0 sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={translate(locale, 'home.exploreFilterPlaceholder')}
            className="ui-input w-full py-2 pl-9 pr-3 text-sm"
          />
        </label>
      </div>
      {children}
    </section>
  )
}

function ProductExploreCard({
  product,
  locale,
  showCategory = false,
}: {
  product: ProductWithCategory
  locale: Locale
  showCategory?: boolean
}) {
  const category = showCategory ? product.category?.trim() : null

  return (
    <li>
      <Link
        to={withLocalePath(`/${product.slug}`, locale)}
        className="group flex h-full flex-col rounded-xl border border-stone-200/90 bg-surface-raised p-5 shadow-card transition-[border-color,box-shadow] hover:border-accent/25 hover:shadow-md sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent transition-colors group-hover:bg-accent group-hover:text-white"
            aria-hidden
          >
            {product.icon_url?.trim() ? (
              <img
                src={product.icon_url}
                alt=""
                className="h-7 w-7 object-contain"
              />
            ) : (
              <BookOpen size={22} strokeWidth={1.5} />
            )}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-display text-base font-semibold leading-snug text-ink transition-colors group-hover:text-accent sm:text-lg">
              {product.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {category ? (
                <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-ink-muted">
                  {category}
                </span>
              ) : null}
              {product.has_public_docs === false ? (
                <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                  {translate(locale, 'home.docsNotPublishedYet')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {product.description ? (
          <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-muted">
            {product.description}
          </p>
        ) : (
          <p className="mt-4 flex-1 text-sm text-ink-faint">
            {translate(locale, 'home.noDescription')}
          </p>
        )}
        <span
          className={`mt-5 inline-flex items-center gap-1 text-sm font-medium ${
            product.has_public_docs === false ? 'text-ink-muted' : 'text-accent'
          }`}
        >
          {product.has_public_docs === false
            ? translate(locale, 'home.docsNotPublishedYet')
            : translate(locale, 'home.viewDocs')}
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </Link>
    </li>
  )
}

function ExploreEmpty({ locale }: { locale: Locale }) {
  return (
    <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-8 text-center text-sm text-ink-muted">
      {translate(locale, 'home.exploreNoMatch')}
    </p>
  )
}
