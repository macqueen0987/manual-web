import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { docRemarkPlugins } from '../utils/markdownSanitize'
import { Menu, X, FileText } from 'lucide-react'
import client from '../api/client'
import DocsTopBar from '../components/layout/DocsTopBar'
import DocsSidebar from '../components/layout/DocsSidebar'
import Breadcrumbs from '../components/layout/Breadcrumbs'
import type { BreadcrumbItem } from '../components/layout/Breadcrumbs'
import TableOfContents, { extractHeadings } from '../components/docs/TableOfContents'
import PublicSiteFooter from '../components/layout/PublicSiteFooter'
import EmptyState from '../components/ui/EmptyState'
import PageLoader from '../components/ui/PageLoader'
import { headingToId } from '../utils/markdown'
import { docContentRehypePlugins } from '../utils/markdownSanitize'
import { useDocLocale } from '../hooks/useDocLocale'
import { translate, withLocalePath } from '../i18n'
import { isSecondaryContentLocale, localeDisplayLabel } from '../utils/contentLocale'
import { useAuthStore } from '../stores/authStore'
import { resolveVersionAndDoc, versionRouteSlug } from '../utils/productDocRouting'

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

function mdImg({
  src,
  alt,
  width,
  height,
  style,
  className,
}: {
  src?: string
  alt?: string
  width?: string | number
  height?: string | number
  style?: CSSProperties
  className?: string
}) {
  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={width}
      height={height}
      style={style}
      className={className}
      loading="lazy"
      decoding="async"
    />
  )
}

const markdownComponents = {
  h1: mdHeading(1, 'scroll-mt-20'),
  h2: mdHeading(2, 'scroll-mt-20'),
  h3: mdHeading(3, 'scroll-mt-20'),
  a: mdAnchor(),
  img: mdImg,
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
  is_published: boolean
}

function contentHasH1(markdown: string): boolean {
  return /^#\s+.+/m.test(markdown)
}

function hasMarkdownBody(markdown: string): boolean {
  const trimmed = markdown.trim()
  if (!trimmed) return false
  return trimmed.replace(/^#\s+.+\n?/, '').trim().length > 0
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
  const user = useAuthStore((s) => s.user)
  const hasSession = useAuthStore((s) => s.hasSession)
  const sessionReady = useAuthStore((s) => s.sessionReady)
  const fetchUserProfile = useAuthStore((s) => s.fetchUserProfile)
  const isAdmin = user?.is_superuser ?? false

  useEffect(() => {
    if (!sessionReady || !hasSession || user) return
    void fetchUserProfile()
  }, [sessionReady, hasSession, user, fetchUserProfile])
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
  const [versionsReady, setVersionsReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mainScrollRef = useRef<HTMLDivElement>(null)
  const defaultVersionSlug = useMemo(() => {
    if (versions.length === 0) return 'latest'
    if (isAdmin) {
      const latest = versions.find((v) => v.is_latest)
      if (latest) return 'latest'
    }
    const first = versions[0]
    return first.is_latest ? 'latest' : first.slug
  }, [versions, isAdmin])

  const { versionSlug: effectiveVersion, docSlug } = useMemo(
    () =>
      resolveVersionAndDoc(
        versions,
        defaultVersionSlug,
        versionSlug,
        maybeDocOrVersion,
        docSplat,
      ),
    [versions, defaultVersionSlug, versionSlug, maybeDocOrVersion, docSplat],
  )

  const allowedVersionSlugs = useMemo(
    () => new Set(versions.map(versionRouteSlug)),
    [versions],
  )

  useEffect(() => {
    if (!productSlug) return
    setVersionsReady(false)
    client
      .get(`/products/${productSlug}`)
      .then((res) => setProduct(res.data))
      .catch(() => setProduct(null))
    client
      .get(`/products/${productSlug}/versions`)
      .then((res) => setVersions(res.data))
      .catch(() => setVersions([]))
      .finally(() => setVersionsReady(true))
  }, [productSlug, isAdmin])

  useEffect(() => {
    if (!productSlug || versions.length === 0) return
    if (!allowedVersionSlugs.has(effectiveVersion)) {
      const docPart = docSlug ? `/${docSlug}` : ''
      navigate(
        withLocalePath(`/${productSlug}/${defaultVersionSlug}${docPart}`, locale),
        { replace: true },
      )
    }
  }, [
    productSlug,
    versions.length,
    allowedVersionSlugs,
    effectiveVersion,
    docSlug,
    defaultVersionSlug,
    locale,
    navigate,
  ])

  useEffect(() => {
    if (!productSlug || !versionsReady) return
    if (versions.length === 0) {
      setDocs([])
      setLoading(false)
      return
    }
    setLoading(true)
    client
      .get(`/products/${productSlug}/versions/${effectiveVersion}/documents`, {
        params: { locale },
      })
      .then((res) => setDocs(res.data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [productSlug, effectiveVersion, versionsReady, versions.length, locale])

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
  const documentHasBody = document ? hasMarkdownBody(document.content) : false
  const showTableOfContents =
    document != null && extractHeadings(document.content).length > 0

  if (loading) return <PageLoader label={translate(locale, 'common.loading')} />

  return (
    <div className="flex h-screen flex-col bg-white">
      <DocsTopBar
        productName={product?.name}
        productSlug={productSlug}
        versions={versions}
        versionSlug={effectiveVersion}
        onVersionChange={changeVersion}
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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div ref={mainScrollRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex min-h-full flex-col">
              <div className="flex flex-1 flex-col">
                <div className="flex justify-center px-4 py-6 sm:px-6 lg:py-10 xl:px-8">
                  <div className="flex w-full max-w-[72rem] items-start justify-center gap-10 xl:gap-14">
              <article className="w-full min-w-0 max-w-[42rem] xl:max-w-[48rem]">
                <Breadcrumbs items={contentBreadcrumbs} className="mb-4 text-xs sm:text-sm" />

                {versionsReady && versions.length === 0 && (
                  <div
                    className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    role="status"
                  >
                    <p className="font-medium">
                      {translate(locale, 'home.noPublishedVersions')}
                    </p>
                    <p className="mt-1 text-amber-900/90">
                      {translate(locale, 'home.noPublishedVersionsHint')}
                    </p>
                  </div>
                )}

                {document &&
                  isSecondaryContentLocale(locale) &&
                  document.locale_available === false && (
                  <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {translate(
                      locale,
                      documentHasBody
                        ? 'docs.noTranslationShowingDefault'
                        : 'docs.noTranslationAvailable',
                      {
                        lang: localeDisplayLabel(locale, locale),
                      },
                    )}
                  </p>
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
                    {documentHasBody ? (
                      <div
                        className="doc-prose wmde-markdown max-w-none"
                        data-color-mode="light"
                      >
                        <ReactMarkdown
                          remarkPlugins={docRemarkPlugins}
                          rehypePlugins={docContentRehypePlugins}
                          components={markdownComponents}
                        >
                          {document.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-stone-500" role="status">
                        {translate(locale, 'docs.noBodyContent')}
                      </p>
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon={<FileText size={40} strokeWidth={1.25} />}
                    title={translate(
                      locale,
                      docs.length === 0 ? 'docs.noDocs' : 'docs.selectDoc',
                    )}
                    description={
                      docs.length === 0
                        ? undefined
                        : translate(locale, 'docs.selectDocHint')
                    }
                  />
                )}
              </article>

              {showTableOfContents && (
                <TableOfContents
                  content={document.content}
                  locale={locale}
                  scrollContainerRef={mainScrollRef}
                />
              )}
                  </div>
                </div>
              </div>
              <PublicSiteFooter locale={locale} contentMaxWidth="docs" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
