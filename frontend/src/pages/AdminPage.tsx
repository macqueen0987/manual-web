import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import client from '../api/client'
import AdminLayout from '../components/admin/AdminLayout'
import Modal from '../components/admin/Modal'
import Toast, { type ToastMessage } from '../components/admin/Toast'
import { useAuthStore } from '../stores/authStore'
import { translate } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
}

interface Version {
  id: number
  name: string
  slug: string
  is_published: boolean
  is_latest: boolean
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [versions, setVersions] = useState<Record<number, Version[]>>({})
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [loading, setLoading] = useState(true)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [editProductOpen, setEditProductOpen] = useState(false)

  const [newProductName, setNewProductName] = useState('')
  const [newProductSlug, setNewProductSlug] = useState('')
  const [newProductDesc, setNewProductDesc] = useState('')
  const [autoSlug, setAutoSlug] = useState(true)

  const [newVersionName, setNewVersionName] = useState('')
  const [newVersionSlug, setNewVersionSlug] = useState('')
  const [baseVersionId, setBaseVersionId] = useState<number | ''>('')

  const [publishName, setPublishName] = useState('')
  const [publishSlug, setPublishSlug] = useState('')

  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const locale = useLocaleStore((s) => s.locale)

  const selected = products.find((p) => p.id === selectedId) ?? products[0] ?? null
  const selectedVersions = selected ? versions[selected.id] ?? [] : []

  const notify = (text: string, variant: 'success' | 'error' = 'success') => {
    setToast({ text, variant })
  }

  const loadData = async () => {
    try {
      const res = await client.get('/products/with-versions')
      const rows = res.data as { product: Product; versions: Version[] }[]
      const prods = rows.map((row) => row.product)
      const vers: Record<number, Version[]> = {}
      for (const row of rows) {
        vers[row.product.id] = row.versions
      }
      setProducts(prods)
      setVersions(vers)
      if (prods.length > 0 && selectedId === null) {
        setSelectedId(prods[0].id)
      }
    } catch {
      notify(translate(locale, 'admin.loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    client.get('/auth/me').then((res) => setUser(res.data)).catch(() => {})
    loadData()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleCreateProduct = async () => {
    try {
      await client.post('/products', {
        name: newProductName,
        slug: newProductSlug,
        description: newProductDesc || null,
      })
      setProductModalOpen(false)
      setNewProductName('')
      setNewProductSlug('')
      setNewProductDesc('')
      notify(translate(locale, 'admin.productCreated'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.productCreateFailed'), 'error')
    }
  }

  const handleUpdateProduct = async () => {
    if (!selected) return
    try {
      await client.put(`/products/${selected.id}`, {
        name: editName,
        description: editDesc || null,
      })
      setEditProductOpen(false)
      notify(translate(locale, 'admin.productSaved'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.productSaveFailed'), 'error')
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm(translate(locale, 'admin.deleteProductConfirm'))) return
    try {
      await client.delete(`/products/${id}`)
      if (selectedId === id) setSelectedId(null)
      notify(translate(locale, 'admin.productDeleted'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.productDeleteFailed'), 'error')
    }
  }

  const handleCreateVersion = async () => {
    if (!selected) return
    try {
      await client.post('/versions', {
        product_id: selected.id,
        name: newVersionName,
        slug: newVersionSlug,
        base_version_id: baseVersionId || null,
      })
      setVersionModalOpen(false)
      setNewVersionName('')
      setNewVersionSlug('')
      setBaseVersionId('')
      notify(translate(locale, 'admin.versionCreated'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.versionCreateFailed'), 'error')
    }
  }

  const handlePublish = async () => {
    if (!selected) return
    try {
      await client.post(`/products/${selected.slug}/versions/publish`, {
        name: publishName,
        slug: publishSlug,
      })
      setPublishModalOpen(false)
      setPublishName('')
      setPublishSlug('')
      notify(translate(locale, 'admin.published'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.publishFailed'), 'error')
    }
  }

  const openEditProduct = () => {
    if (!selected) return
    setEditName(selected.name)
    setEditDesc(selected.description || '')
    setEditProductOpen(true)
  }

  const openPublish = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setPublishName(`${y}.${m}.${day}`)
    setPublishSlug(`${y}-${m}-${day}`)
    setPublishModalOpen(true)
  }

  return (
    <AdminLayout userEmail={user?.email} onLogout={handleLogout}>
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-surface-raised px-4 py-3 sm:px-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">제품 관리</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            제품·버전을 관리하고 문서 편집으로 이동합니다
          </p>
        </div>
        <button
          type="button"
          onClick={() => setProductModalOpen(true)}
          className="admin-btn-primary"
        >
          <Plus size={16} />
          새 제품
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Product list */}
        <div className="w-60 shrink-0 overflow-y-auto border-r border-stone-200 bg-surface-muted/50 p-3 lg:w-64">
          {loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-200/60" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
              <p className="text-sm text-ink-muted">등록된 제품이 없습니다</p>
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="admin-btn-primary mt-4 w-full"
              >
                첫 제품 만들기
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {products.map((p) => {
                const isSelected = selected?.id === p.id
                const latest = (versions[p.id] || []).find((v) => v.is_latest)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                        isSelected
                          ? 'bg-white shadow-card ring-1 ring-accent/20'
                          : 'hover:bg-white/80'
                      }`}
                    >
                      <p className="truncate font-medium text-ink">{p.name}</p>
                      <p className="truncate text-xs text-ink-faint">/{p.slug}</p>
                      {latest && (
                        <p className="mt-1 text-xs text-ink-muted">
                          작업 중: {latest.name}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-ink-muted">왼쪽에서 제품을 선택하거나 새로 만드세요</p>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">{selected.name}</h2>
                  <p className="mt-1 font-mono text-sm text-ink-faint">/{selected.slug}</p>
                  {selected.description && (
                    <p className="mt-3 max-w-xl text-sm text-ink-muted">
                      {selected.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/admin/products/${selected.slug}/latest/editor`)
                    }
                    className="admin-btn-primary"
                  >
                    <Pencil size={16} />
                    문서 편집
                  </button>
                  <a
                    href={`/${selected.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-btn-secondary"
                  >
                    <ExternalLink size={16} />
                    공개 보기
                  </a>
                  <button type="button" onClick={openEditProduct} className="admin-btn-secondary">
                    정보 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(selected.id)}
                    className="admin-btn-danger"
                  >
                    <Trash2 size={16} />
                    삭제
                  </button>
                </div>
              </div>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
                    버전
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVersionModalOpen(true)}
                      className="admin-btn-secondary py-1.5 text-xs"
                    >
                      <Plus size={14} />
                      버전 복제
                    </button>
                    <button
                      type="button"
                      onClick={openPublish}
                      className="admin-btn-secondary py-1.5 text-xs"
                    >
                      <Upload size={14} />
                      스냅샷 발행
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-surface-muted/80 text-xs uppercase tracking-wider text-ink-faint">
                        <th className="px-4 py-3 font-medium">이름</th>
                        <th className="px-4 py-3 font-medium">Slug</th>
                        <th className="px-4 py-3 font-medium">상태</th>
                        <th className="px-4 py-3 text-right font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVersions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-ink-muted">
                            버전이 없습니다
                          </td>
                        </tr>
                      ) : (
                        selectedVersions.map((v) => (
                          <tr key={v.id} className="border-t border-stone-50">
                            <td className="px-4 py-3 font-medium">{v.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                              {v.slug}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                {v.is_latest && (
                                  <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent-hover">
                                    작업 중
                                  </span>
                                )}
                                {v.is_published && (
                                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-ink-muted">
                                    발행됨
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {v.is_latest ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/admin/products/${selected.slug}/latest/editor`,
                                    )
                                  }
                                  className="text-sm font-medium text-accent hover:underline"
                                >
                                  편집
                                </button>
                              ) : (
                                <a
                                  href={`/${selected.slug}/${v.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm text-ink-muted hover:text-ink hover:underline"
                                >
                                  보기
                                </a>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  작업 중(latest)에서 편집한 뒤 스냅샷 발행으로 고정 버전을 만듭니다.
                </p>
              </section>
            </>
          )}
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Modal
        open={productModalOpen}
        title="새 제품"
        onClose={() => setProductModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="admin-btn-secondary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreateProduct}
              disabled={!newProductName || !newProductSlug}
              className="admin-btn-primary"
            >
              만들기
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">제품명</label>
            <input
              className="admin-input"
              value={newProductName}
              onChange={(e) => {
                setNewProductName(e.target.value)
                if (autoSlug) setNewProductSlug(slugifyName(e.target.value))
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Slug</label>
            <input
              className="admin-input font-mono"
              value={newProductSlug}
              onChange={(e) => {
                setAutoSlug(false)
                setNewProductSlug(e.target.value)
              }}
              placeholder="my-product"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">설명 (선택)</label>
            <textarea
              className="admin-input"
              rows={2}
              value={newProductDesc}
              onChange={(e) => setNewProductDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={editProductOpen}
        title="제품 정보 수정"
        onClose={() => setEditProductOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditProductOpen(false)}
              className="admin-btn-secondary"
            >
              취소
            </button>
            <button type="button" onClick={handleUpdateProduct} className="admin-btn-primary">
              저장
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">제품명</label>
            <input
              className="admin-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">설명</label>
            <textarea
              className="admin-input"
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={versionModalOpen}
        title="버전 복제"
        onClose={() => setVersionModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setVersionModalOpen(false)}
              className="admin-btn-secondary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreateVersion}
              disabled={!newVersionName || !newVersionSlug}
              className="admin-btn-primary"
            >
              만들기
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">복사 원본</label>
            <select
              className="admin-input"
              value={baseVersionId}
              onChange={(e) =>
                setBaseVersionId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">latest (기본)</option>
              {selectedVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">새 버전 이름</label>
            <input
              className="admin-input"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="2026.06.02-draft"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Slug</label>
            <input
              className="admin-input font-mono"
              value={newVersionSlug}
              onChange={(e) => setNewVersionSlug(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={publishModalOpen}
        title="스냅샷 발행"
        onClose={() => setPublishModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPublishModalOpen(false)}
              className="admin-btn-secondary"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!publishName || !publishSlug}
              className="admin-btn-primary"
            >
              발행
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-muted">
          현재 작업 중(latest) 내용을 고정 버전으로 저장합니다. 발행 후에도 latest에서 계속
          편집할 수 있습니다.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">버전 이름</label>
            <input
              className="admin-input"
              value={publishName}
              onChange={(e) => setPublishName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Slug</label>
            <input
              className="admin-input font-mono"
              value={publishSlug}
              onChange={(e) => setPublishSlug(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}
