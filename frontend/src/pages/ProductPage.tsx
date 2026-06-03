import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Menu, X, FileText } from 'lucide-react'
import client from '../api/client'
import DocsTopBar from '../components/layout/DocsTopBar'
import DocsSidebar from '../components/layout/DocsSidebar'
import Breadcrumbs from '../components/layout/Breadcrumbs'
import type { BreadcrumbItem } from '../components/layout/Breadcrumbs'
import TableOfContents from '../components/docs/TableOfContents'
import EmptyState from '../components/ui/EmptyState'
import PageLoader from '../components/ui/PageLoader'
import { headingToId } from '../utils/markdown'
import { docContentRehypePlugins } from '../utils/markdownSanitize'
import { useDocLocale } from '../hooks/useDocLocale'
import { translate, withLocalePath } from '../i18n'

function mdHeading(level: 1 | 2 | 3, className: string) {
  return ({ children }: { children?: ReactNode }) => {
    const id = headingToId(String(children))
    if (level === 1) return <h1 id={id} className={className}>{children}</h1>
    if (level === 2) return <h2 id={id} className={className}>{children}</h2>
    return <h3 id={id} className={className}>{children}</h3>
  }
}

function mdAnchor() {
  return ({ href, children }: { href?: string; children?: ReactNode }) => {
    if (href && /\.mp4(\?|#|$)/i.test(href)) {
      return (
        <video controls className="my-4 w-full max-w-3xl rounded-lg border border-stone-200" src={href}>
          <track kind="captions" />
        </video>
      )
    }
    return (
      <a href={href} className="ui-link" target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }
}

function mdPre({ children }: { children?: ReactNode }) {
  return (
    <pre className="doc-code-block">
      {children}
    </pre>
  )
}

function mdCode({ className, children }: { className?: string; children?: ReactNode }) {
  return <code className={className}>{children}</code>
}

const markdownComponents = {
  h1: mdHeading(1, 'scroll-mt-20'),
  h2: mdHeading(2, 'scroll-mt-20'),
  h3: mdHeading(3, 'scroll-mt-20'),
  a: mdAnchor(),
  pre: mdPre,
  code: mdCode,
  div: ({ className, children }: { className?: string; children?: ReactNode }) => {
    if (className === 'video-embed') {
      return <div className="video-embed my-4">{children}</div>
    }
    return <div className={className}>{children}</div>
  },
}

interface Product {
  id: number
  name: string
  slug: string
}

interface DocNode {
  id: number
  slug: string
  title: string
  children: DocNode[]
}

interface DocumentData {
  id: number
  title: string
  slug: string
  content: string
  locale?: string
  locale_available?: boolean
}

interface Version {
  id: number
  slug: string
  name: string
  is_latest: boolean
}

interface SearchHit {
  id: number
  title: string
  slug: string
  product_slug: string
  product_name: string
  version_slug: string
  version_name: string
  excerpt: string
}

function resolveVersionAndDoc(
  versions: Version[],
  versionSlugParam?: string,
  maybeSegment?: string,
  docSplat?: string,
): { versionSlug: string; docSlug: string } {
  const versionSlugs = new Set(versions.map((v) => v.slug))

  if (versionSlugParam !== undefined) {
    return {
      versionSlug: versionSlugParam,
      docSlug: (docSplat || '').replace(/^\/+/, ''),
    }
  }

  if (maybeSegment) {
    if (versionSlugs.has(maybeSegment)) {
      return { versionSlug: maybeSegment, docSlug: '' }
    }
    return { versionSlug: 'latest', docSlug: maybeSegment }
  }

  return { versionSlug: 'latest', docSlug: '' }
}

function contentHasH1(markdown: string): boolean {
  return /^#\s+.+/m.test(markdown)
}

function findDocPath(nodes: DocNode[], slug: string, trail: DocNode[] = []): DocNode[] | null {
  for (const node of nodes) {
    if (node.slug === slug) {
      return [...trail, node]
    }
    if (node.children?.length) {
      const found = findDocPath(node.children, slug, [...trail, node])
      if (found) return found
    }
  }
  return null
}

export default function ProductPage() {
  const navigate = useNavigate()
  const { locale, setDocLocale } = useDocLocale()
  const { productSlug, versionSlug, maybeDocOrVersion, '*': docSplat } = useParams<{
    productSlug: string
    versionSlug?: string
    maybeDocOrVersion?: string
    '*'?: string
  }>()

  const [docs, setDocs] = useState<DocNode[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState<Version[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchHit[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  const { versionSlug: effectiveVersion, docSlug } = useMemo(
    () => resolveVersionAndDoc(versions, versionSlug, maybeDocOrVersion, docSplat),
    [versions, versionSlug, maybeDocOrVersion, docSplat],
  )

  useEffect(() => {
    if (!productSlug) return
    client
      .get(`/products/${productSlug}`)
      .then((res) => setProduct(res.data))
      .catch(() => setProduct(null))
    client
      .get(`/products/${productSlug}/versions`)
      .then((res) => setVersions(res.data))
      .catch(() => setVersions([]))
  }, [productSlug])

  const needsVersionList = effectiveVersion === 'latest' && versions.length === 0

  useEffect(() => {
    if (!productSlug || needsVersionList) return
    setLoading(true)
    client
      .get(`/products/${productSlug}/versions/${effectiveVersion}/documents`, {
        params: { locale },
      })
      .then((res) => setDocs(res.data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [productSlug, effectiveVersion, needsVersionList, locale])

  const activeDocSlug = docSlug || (docs.length > 0 && !docSlug ? 'index' : '')

  useEffect(() => {
    if (!productSlug || !activeDocSlug) {
      setDocument(null)
      return
    }
    client
      .get(`/products/${productSlug}/versions/${effectiveVersion}/documents/${activeDocSlug}`, {
        params: { locale },
      })
      .then((res) => setDocument(res.data))
      .catch(() => setDocument(null))
  }, [productSlug, effectiveVersion, activeDocSlug, locale])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      const res = await client.get('/search', {
        params: { q: searchQuery, product: productSlug },
      })
      setSearchResults(res.data.results)
      setSearchOpen(true)
    } catch {
      setSearchResults([])
      setSearchOpen(true)
    }
  }

  const changeVersion = (newVersion: string) => {
    const docPart = activeDocSlug ? `/${activeDocSlug}` : ''
    navigate(withLocalePath(`/${productSlug}/${newVersion}${docPart}`, locale))
  }

  const contentBreadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = []
    if (product) {
      const productTo = withLocalePath(`/${productSlug}/${effectiveVersion}`, locale)
      const onProductHome = !activeDocSlug || activeDocSlug === 'index'
      items.push({
        label: product.name,
        ...(onProductHome ? {} : { to: productTo }),
      })
    }
    if (activeDocSlug) {
      const path = findDocPath(docs, activeDocSlug)
      if (path) {
        path.forEach((node, index) => {
          const isLast = index === path.length - 1
          items.push({
            label: node.title,
            ...(isLast
              ? {}
              : { to: withLocalePath(`/${productSlug}/${effectiveVersion}/${node.slug}`, locale) }),
          })
        })
      } else if (document) {
        items.push({ label: document.title })
      }
    }
    return items
  }, [locale, product, productSlug, effectiveVersion, document, activeDocSlug, docs])

  const showPageTitle = document && !contentHasH1(document.content)

  if (loading) return <PageLoader label={translate(locale, 'common.loading')} />

  return (
    <div className="flex h-screen flex-col bg-white">
      <DocsTopBar
        productName={product?.name}
        productSlug={productSlug}
        versions={versions}
        versionSlug={effectiveVersion}
        onVersionChange={changeVersion}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        onLocaleChange={setDocLocale}
        leading={
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="ui-btn-ghost p-2 lg:hidden"
            aria-label={translate(locale, 'docs.openMenuAria')}
          >
            <Menu size={20} />
          </button>
        }
      />

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <button
            type="button"
            className="absolute inset-0 z-40 bg-stone-900/40 lg:hidden"
            aria-label={translate(locale, 'docs.closeSidebar')}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`absolute inset-y-0 left-0 z-50 flex w-[17.5rem] shrink-0 flex-col border-r border-stone-200 bg-surface-raised transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2 lg:hidden">
            <span className="text-sm font-medium text-ink-muted">
              {translate(locale, 'docs.docList')}
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ui-btn-ghost p-2"
              aria-label={translate(locale, 'common.close')}
            >
              <X size={20} />
            </button>
          </div>
          <DocsSidebar
            docs={docs}
            productSlug={productSlug!}
            productName={product?.name}
            versionSlug={effectiveVersion}
            locale={locale}
            currentDocSlug={activeDocSlug || undefined}
            onNavigate={() => setSidebarOpen(false)}
          />
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex justify-center px-4 py-6 sm:px-6 lg:py-10 xl:px-8">
            <div className="flex w-full max-w-[72rem] justify-center gap-10 xl:gap-14">
              <article className="w-full min-w-0 max-w-[42rem] xl:max-w-[48rem]">
                <Breadcrumbs items={contentBreadcrumbs} className="mb-4 text-xs sm:text-sm" />

                {document && locale !== 'en' && document.locale_available === false && (
                  <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {locale === 'ko'
                      ? '이 페이지의 한국어 번역이 없어 기본 문서를 표시합니다.'
                      : 'No translation for this locale; showing default content.'}
                  </p>
                )}

                {searchOpen && (
                  <section className="mb-8 rounded-lg border border-stone-200 bg-surface-muted/50 p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold text-ink">
                        {translate(locale, 'docs.searchResults', { count: searchResults.length })}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSearchOpen(false)}
                        className="ui-btn-ghost py-1 text-sm"
                      >
                        {translate(locale, 'common.close')}
                      </button>
                    </div>
                    {searchResults.length === 0 ? (
                      <p className="text-sm text-ink-muted">{translate(locale, 'docs.noResults')}</p>
                    ) : (
                      <ul className="space-y-2">
                        {searchResults.map((r) => (
                          <li key={r.id}>
                            <Link
                              to={withLocalePath(
                                `/${r.product_slug}/${r.version_slug}/${r.slug}`,
                                locale,
                              )}
                              className="block rounded-md border border-stone-100 bg-white p-4 transition-colors duration-150 hover:border-stone-200"
                              onClick={() => setSearchOpen(false)}
                            >
                              <h3 className="font-medium text-accent">{r.title}</h3>
                              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
                                {r.excerpt}
                              </p>
                              <span className="mt-2 inline-block text-xs text-ink-faint">
                                {r.product_name} / {r.version_name}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                {document ? (
                  <>
                    {showPageTitle && (
                      <header className="mb-8 border-b border-stone-100 pb-6">
                        <h1 className="font-sans text-[1.75rem] font-semibold leading-snug text-ink sm:text-3xl">
                          {document.title}
                        </h1>
                      </header>
                    )}
                    <div
                      className="doc-prose wmde-markdown max-w-none"
                      data-color-mode="light"
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={docContentRehypePlugins}
                        components={markdownComponents}
                      >
                        {document.content}
                      </ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon={<FileText size={40} strokeWidth={1.25} />}
                    title={translate(locale, 'docs.selectDoc')}
                    description={translate(locale, 'docs.selectDocHint')}
                  />
                )}
              </article>

              {document && (
                <div className="hidden shrink-0 xl:block">
                  <TableOfContents content={document.content} locale={locale} />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
