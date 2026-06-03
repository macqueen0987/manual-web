import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ArrowRight } from 'lucide-react'
import client from '../api/client'
import PublicHeader from '../components/layout/PublicHeader'
import PublicPageSubheader from '../components/layout/PublicPageSubheader'
import EmptyState from '../components/ui/EmptyState'
import PageLoader from '../components/ui/PageLoader'
import { useDocLocale } from '../hooks/useDocLocale'
import { translate } from '../i18n'

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
}

export default function HomePage() {
  const { locale } = useDocLocale()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .get('/products')
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader label={translate(locale, 'common.loading')} />

  return (
    <div className="min-h-screen bg-surface">
      <PublicHeader
        breadcrumbs={[{ label: translate(locale, 'home.title') }]}
        subheader={
          <PublicPageSubheader
            title={translate(locale, 'home.title')}
            description={translate(locale, 'home.description')}
          />
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {products.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={40} strokeWidth={1.25} />}
            title={translate(locale, 'home.noProducts')}
            description={translate(locale, 'home.noProductsHint')}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/${product.slug}`}
                  className="ui-card group flex h-full flex-col p-6"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent">
                    <BookOpen size={20} />
                  </div>
                  <h2 className="font-display text-lg font-semibold text-ink group-hover:text-accent-hover">
                    {product.name}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted line-clamp-3">
                    {product.description || translate(locale, 'home.noDescription')}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent">
                    {translate(locale, 'home.viewDocs')}
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
