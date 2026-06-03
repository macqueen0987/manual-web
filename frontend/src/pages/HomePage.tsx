import { useEffect, useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import CategoryShowcase from '../components/home/CategoryShowcase'
import HomeHeroSection from '../components/home/HomeHeroSection'
import { useHomeHero } from '../hooks/useHomeHero'
import ExploreProductDirectory from '../components/home/ExploreProductDirectory'
import client from '../api/client'
import PublicHeader from '../components/layout/PublicHeader'
import EmptyState from '../components/ui/EmptyState'
import PageLoader from '../components/ui/PageLoader'
import DocSearchCombobox from '../components/search/DocSearchCombobox'
import { useDocLocale } from '../hooks/useDocLocale'
import { translate } from '../i18n'
import type { HomeContent } from '../types/homeContent'
import { normalizeHomeContent, visibleShowcaseSlots } from '../utils/showcaseSlots'
import {
  filterPublicProducts,
  type ProductWithCategory,
} from '../utils/productCategories'

export default function HomePage() {
  const { locale } = useDocLocale()
  const heroHtml = useHomeHero(locale)
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [homeContent, setHomeContent] = useState<HomeContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([client.get('/products'), client.get('/site/home')])
      .then(([productsRes, homeRes]) => {
        setProducts(productsRes.data)
        setHomeContent(normalizeHomeContent(homeRes.data))
      })
      .finally(() => setLoading(false))
  }, [])

  const localeContent = homeContent?.[locale]
  const publicProducts = useMemo(() => filterPublicProducts(products), [products])
  const showcaseSlots = useMemo(
    () => (localeContent ? visibleShowcaseSlots(localeContent.showcase_slots) : []),
    [localeContent],
  )
  const showShowcase = showcaseSlots.length > 0

  if (loading || !localeContent) {
    return <PageLoader label={translate(locale, 'common.loading')} />
  }

  return (
    <div className="min-h-screen bg-surface">
      <PublicHeader
        contentMaxWidth="none"
        center={
          <DocSearchCombobox
            placeholder={translate(locale, 'home.searchPlaceholder')}
            className="w-full"
            panelAlign="stretch"
          />
        }
      />

      <HomeHeroSection locale={locale} customHtml={heroHtml} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        {publicProducts.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={40} strokeWidth={1.25} />}
            title={translate(locale, 'home.noProducts')}
            description={translate(locale, 'home.noProductsHint')}
          />
        ) : (
          <>
            {showShowcase && (
              <div className="mb-10 lg:mb-12">
                <CategoryShowcase
                  slots={showcaseSlots}
                  products={publicProducts}
                  locale={locale}
                />
              </div>
            )}

            <ExploreProductDirectory
              products={publicProducts}
              locale={locale}
              showCategoryOnCards={!showShowcase}
            />
          </>
        )}
      </main>
    </div>
  )
}
