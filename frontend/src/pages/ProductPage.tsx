import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { Menu, X, Search } from 'lucide-react'
import client from '../api/client'
import Sidebar from '../components/layout/Sidebar'

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
}

interface Version {
  id: number
  slug: string
  name: string
  is_latest: boolean
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

export default function ProductPage() {
  const navigate = useNavigate()
  const { productSlug, versionSlug, maybeDocOrVersion, '*': docSplat } = useParams<{
    productSlug: string
    versionSlug?: string
    maybeDocOrVersion?: string
    '*'?: string
  }>()

  const [docs, setDocs] = useState<DocNode[]>([])
  const [document, setDocument] = useState<DocumentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState<Version[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  const { versionSlug: effectiveVersion, docSlug } = useMemo(
    () => resolveVersionAndDoc(versions, versionSlug, maybeDocOrVersion, docSplat),
    [versions, versionSlug, maybeDocOrVersion, docSplat],
  )

  useEffect(() => {
    if (!productSlug) return
    client.get(`/products/${productSlug}/versions`).then((res) => setVersions(res.data))
  }, [productSlug])

  useEffect(() => {
    if (!productSlug) return
    setLoading(true)
    client
      .get(`/products/${productSlug}/versions/${effectiveVersion}/documents`)
      .then((res) => setDocs(res.data))
      .finally(() => setLoading(false))
  }, [productSlug, effectiveVersion])

  const activeDocSlug = docSlug || (docs.length > 0 && !docSlug ? 'index' : '')

  useEffect(() => {
    if (!productSlug || !activeDocSlug) {
      setDocument(null)
      return
    }
    client
      .get(`/products/${productSlug}/versions/${effectiveVersion}/documents/${activeDocSlug}`)
      .then((res) => setDocument(res.data))
      .catch(() => setDocument(null))
  }, [productSlug, effectiveVersion, activeDocSlug])

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
    }
  }

  const changeVersion = (newVersion: string) => {
    const docPart = activeDocSlug ? `/${activeDocSlug}` : ''
    navigate(`/${productSlug}/${newVersion}${docPart}`)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full w-64 bg-white">
          <div className="flex items-center justify-between border-b p-4 md:hidden">
            <span className="font-semibold">Menu</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <Sidebar
            docs={docs}
            productSlug={productSlug!}
            versionSlug={effectiveVersion}
            currentDocSlug={activeDocSlug || undefined}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 border-b bg-white px-4 py-3 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded p-1 hover:bg-gray-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-1 items-center justify-between gap-4">
              <h1 className="text-lg font-bold md:text-2xl">
                {document?.title || 'Documentation'}
              </h1>
              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-48 rounded border pl-3 pr-8 py-1 text-sm transition-all focus:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1"
                  >
                    <Search size={14} />
                  </button>
                </div>
                <select
                  className="rounded border px-2 py-1 text-sm"
                  value={effectiveVersion}
                  onChange={(e) => changeVersion(e.target.value)}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.slug}>
                      {v.name} {v.is_latest ? '(latest)' : ''}
                    </option>
                  ))}
                </select>
                <Link to="/admin" className="hidden text-sm text-blue-600 hover:underline md:block">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
          {searchOpen && (
            <div className="mb-6 rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Search Results ({searchResults.length})</h2>
                <button onClick={() => setSearchOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
                  Close
                </button>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-gray-500">No results found.</p>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((r) => (
                    <Link
                      key={r.id}
                      to={`/${r.product_slug}/${r.version_slug}/${r.slug}`}
                      className="block rounded border p-3 hover:bg-gray-50"
                      onClick={() => setSearchOpen(false)}
                    >
                      <h3 className="font-medium text-blue-600">{r.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{r.excerpt}</p>
                      <span className="mt-1 text-xs text-gray-400">
                        {r.product_name} / {r.version_name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {document ? (
            <article className="prose prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {document.content}
              </ReactMarkdown>
            </article>
          ) : (
            <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
              Select a document from the sidebar
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
