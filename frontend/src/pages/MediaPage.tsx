import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, Loader2, Trash2 } from 'lucide-react'
import client from '../api/client'
import AdminLayout from '../components/admin/AdminLayout'
import Toast, { type ToastMessage } from '../components/admin/Toast'
import EmptyState from '../components/ui/EmptyState'
import { useAuthStore } from '../stores/authStore'
import { translate } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'

interface Product {
  id: number
  name: string
  slug: string
}

interface Version {
  id: number
  name: string
  slug: string
  is_latest: boolean
}

interface MediaItem {
  id: string
  product_slug: string
  version_slug: string
  filename: string
  original_name: string | null
  url: string
  size: number
  content_type: string
  kind: string
  created_at: string
  referenced: boolean
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const locale = useLocaleStore((s) => s.locale)

  const [user, setUser] = useState<{ email: string } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [orphansOnly, setOrphansOnly] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  const productSlug = searchParams.get('product') || ''
  const versionSlug = searchParams.get('version') || 'latest'

  const notify = (text: string, variant: 'success' | 'error' = 'success') => {
    setToast({ text, variant })
  }

  const loadProducts = useCallback(async () => {
    const res = await client.get('/products')
    setProducts(res.data)
    return res.data as Product[]
  }, [])

  const loadVersions = useCallback(async (slug: string) => {
    if (!slug) {
      setVersions([])
      return
    }
    const res = await client.get(`/products/${slug}/versions`)
    setVersions(res.data)
  }, [])

  const loadMedia = useCallback(async () => {
    if (!productSlug) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await client.get('/media', {
        params: {
          product_slug: productSlug,
          version_slug: versionSlug,
          orphans_only: orphansOnly || undefined,
        },
      })
      setItems(res.data.items)
    } catch {
      notify(translate(locale, 'admin.mediaLoadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }, [productSlug, versionSlug, orphansOnly])

  useEffect(() => {
    client.get('/auth/me').then((res) => setUser(res.data)).catch(() => {})
    void loadProducts().then((prods) => {
      if (!searchParams.get('product') && prods.length > 0) {
        setSearchParams({ product: prods[0].slug, version: 'latest' }, { replace: true })
      }
    })
  }, [loadProducts, searchParams, setSearchParams])

  useEffect(() => {
    void loadVersions(productSlug)
  }, [productSlug, loadVersions])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const setFilter = (product: string, version: string) => {
    setSearchParams({ product, version })
  }

  const handleDelete = async (item: MediaItem) => {
    const label = item.original_name || item.filename
    if (!confirm(`"${label}" 파일을 삭제할까요?`)) return
    try {
      await client.delete(`/media/${item.id}`)
      notify('파일을 삭제했습니다')
      await loadMedia()
    } catch {
      notify('삭제에 실패했습니다', 'error')
    }
  }

  const copyUrl = async (url: string) => {
    const full =
      typeof window !== 'undefined' ? `${window.location.origin}${url}` : url
    try {
      await navigator.clipboard.writeText(full)
      notify('URL을 복사했습니다')
    } catch {
      notify('복사에 실패했습니다', 'error')
    }
  }

  const handleCleanupOrphans = async () => {
    if (!productSlug) return
    setCleaning(true)
    try {
      const res = await client.post('/media/cleanup-orphans', null, {
        params: { product_slug: productSlug, version_slug: versionSlug },
      })
      notify(translate(locale, 'admin.orphansCleaned', { count: res.data.count }))
      await loadMedia()
    } catch {
      notify(translate(locale, 'admin.cleanupFailed'), 'error')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <AdminLayout userEmail={user?.email} onLogout={handleLogout}>
      <div className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="font-display text-xl font-semibold text-ink">미디어 관리</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {translate(locale, 'admin.navMedia')} — {translate(locale, 'admin.orphansOnly')}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            className="ui-input w-auto min-w-[10rem]"
            value={productSlug}
            onChange={(e) => setFilter(e.target.value, versionSlug)}
            aria-label="제품"
          >
            <option value="">제품 선택</option>
            {products.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="admin-input w-auto min-w-[8rem]"
            value={versionSlug}
            onChange={(e) => setFilter(productSlug, e.target.value)}
            aria-label="버전"
            disabled={!productSlug}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.slug}>
                {v.name}
                {v.is_latest ? ' (작업 중)' : ''}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              className="rounded border-stone-300"
              checked={orphansOnly}
              onChange={(e) => setOrphansOnly(e.target.checked)}
              disabled={!productSlug}
            />
            {translate(locale, 'admin.orphansOnly')}
          </label>
          <button
            type="button"
            className="admin-btn-secondary py-1.5 text-sm"
            disabled={!productSlug || cleaning}
            onClick={() => void handleCleanupOrphans()}
          >
            {cleaning ? <Loader2 size={16} className="animate-spin" /> : null}
            {translate(locale, 'admin.cleanupOrphans')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-ink-muted">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : !productSlug ? (
          <EmptyState title="제품을 선택하세요" description="필터에서 제품을 고르면 업로드 파일이 표시됩니다." />
        ) : items.length === 0 ? (
          <EmptyState
            title={orphansOnly ? translate(locale, 'admin.noOrphans') : translate(locale, 'admin.noMedia')}
            description={
              orphansOnly
                ? '모든 업로드 파일이 문서 본문에서 참조되고 있습니다.'
                : '에디터에서 이미지·파일을 업로드하면 여기에 표시됩니다.'
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-surface-raised shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-surface-muted text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">미리보기</th>
                  <th className="px-4 py-2 font-medium">이름</th>
                  <th className="px-4 py-2 font-medium">상태</th>
                  <th className="px-4 py-2 font-medium">종류</th>
                  <th className="px-4 py-2 font-medium">크기</th>
                  <th className="px-4 py-2 font-medium text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted/50">
                    <td className="px-4 py-2">
                      {item.kind === 'image' ? (
                        <img
                          src={item.url}
                          alt=""
                          className="h-10 w-10 rounded border object-cover"
                        />
                      ) : (
                        <span className="text-xs uppercase text-ink-faint">{item.kind}</span>
                      )}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-2" title={item.original_name || item.filename}>
                      {item.original_name || item.filename}
                    </td>
                    <td className="px-4 py-2">
                      {item.referenced ? (
                        <span className="text-xs text-emerald-700">사용 중</span>
                      ) : (
                        <span className="text-xs font-medium text-amber-700">미사용</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-ink-muted">{item.kind}</td>
                    <td className="px-4 py-2 text-ink-muted">{formatBytes(item.size)}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="admin-btn-secondary p-1.5"
                          title="URL 복사"
                          onClick={() => void copyUrl(item.url)}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="admin-btn-secondary p-1.5 text-red-600 hover:bg-red-50"
                          title="삭제"
                          onClick={() => void handleDelete(item)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AdminLayout>
  )
}
