import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import client from '../api/client'
import AdminLayout from '../components/admin/AdminLayout'
import CategoryCombobox from '../components/admin/CategoryCombobox'
import ProductIconField from '../components/admin/ProductIconField'
import ProductSidebarList from '../components/admin/ProductSidebarList'
import AdminDialog from '../components/admin/AdminDialog'
import { notify } from '@/lib/notify'
import { useAuthStore } from '../stores/authStore'
import { useEnsureUser } from '../components/auth/useEnsureUser'
import { translate } from '../i18n'
import { useLocaleStore } from '../stores/localeStore'
import {
  ADMIN_ONLY_CATEGORY,
  categoryDisplayLabel,
  collectCategorySuggestions,
  groupProductsByCategory,
  isAdminOnlyCategory,
  type ProductWithCategory,
} from '../utils/productCategories'
import { sortOrderPatches } from '../utils/productSortOrder'
import { slugifyProductName, slugifyVersionName } from '../utils/slugify'

type Product = ProductWithCategory

interface Version {
  id: number
  name: string
  slug: string
  is_published: boolean
  is_latest: boolean
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [versions, setVersions] = useState<Record<number, Version[]>>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [productModalOpen, setProductModalOpen] = useState(false)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [editProductOpen, setEditProductOpen] = useState(false)

  const [newProductName, setNewProductName] = useState('')
  const [newProductDesc, setNewProductDesc] = useState('')
  const [newProductCategory, setNewProductCategory] = useState('')

  const [newVersionName, setNewVersionName] = useState('')
  const [baseVersionId, setBaseVersionId] = useState<number | ''>('')

  const [publishName, setPublishName] = useState('')

  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editIconUrl, setEditIconUrl] = useState<string | null>(null)
  const [newIconUrl, setNewIconUrl] = useState<string | null>(null)

  const [renameVersionOpen, setRenameVersionOpen] = useState(false)
  const [renameVersionTarget, setRenameVersionTarget] = useState<Version | null>(null)
  const [renameVersionName, setRenameVersionName] = useState('')

  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const locale = useLocaleStore((s) => s.locale)
  useEnsureUser()

  const selected = products.find((p) => p.id === selectedId) ?? products[0] ?? null
  const productGroups = groupProductsByCategory(products)
  const categorySuggestions = collectCategorySuggestions(products)
  const selectedVersions = selected
    ? [...(versions[selected.id] ?? [])].sort((a, b) => {
        if (a.is_published !== b.is_published) return a.is_published ? 1 : -1
        if (a.is_latest !== b.is_latest) return a.is_latest ? -1 : 1
        return 0
      })
    : []

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
    loadData()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleCreateProduct = async () => {
    const slug = slugifyProductName(newProductName)
    if (!slug) {
      notify(translate(locale, 'admin.productSlugInvalid'), 'error')
      return
    }
    try {
      await client.post('/products', {
        name: newProductName.trim(),
        slug,
        description: newProductDesc || null,
        category: newProductCategory.trim() || null,
        icon_url: newIconUrl,
      })
      setProductModalOpen(false)
      setNewProductName('')
      setNewProductDesc('')
      setNewProductCategory('')
      setNewIconUrl(null)
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
        category: editCategory.trim() || null,
        icon_url: editIconUrl,
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
    const slug = slugifyVersionName(newVersionName)
    if (!slug || slug === 'latest') {
      notify(translate(locale, 'admin.versionSlugInvalid'), 'error')
      return
    }
    try {
      await client.post('/versions', {
        product_id: selected.id,
        name: newVersionName.trim(),
        slug,
        base_version_id: baseVersionId,
      })
      setVersionModalOpen(false)
      setNewVersionName('')
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
    const slug = slugifyVersionName(publishName)
    if (!slug || slug === 'latest') {
      notify(translate(locale, 'admin.versionSlugInvalid'), 'error')
      return
    }
    try {
      await client.post(`/products/${selected.slug}/versions/publish`, {
        name: publishName.trim(),
        slug,
      })
      setPublishModalOpen(false)
      setPublishName('')
      notify(translate(locale, 'admin.published'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.publishFailed'), 'error')
    }
  }

  const handlePublishSnapshot = async (v: Version) => {
    if (!confirm(`「${v.name}」을(를) 게시할까요? 독자에게 공개됩니다.`)) return
    try {
      await client.post(`/versions/${v.id}/publish`)
      notify(translate(locale, 'admin.published'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.publishFailed'), 'error')
    }
  }

  const handleUnpublish = async (v: Version) => {
    if (!confirm(`「${v.name}」 게시를 취소할까요? 독자에게 더 이상 보이지 않습니다.`)) return
    try {
      await client.post(`/versions/${v.id}/unpublish`)
      notify(translate(locale, 'admin.unpublished'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.unpublishFailed'), 'error')
    }
  }

  const openEditor = (v: Version) => {
    navigate(
      `/admin/products/${selected!.slug}/${v.is_latest ? 'latest' : v.slug}/editor`,
    )
  }

  const openRenameVersion = (v: Version) => {
    setRenameVersionTarget(v)
    setRenameVersionName(v.name === 'latest' ? translate(locale, 'admin.latestBadge') : v.name)
    setRenameVersionOpen(true)
  }

  const handleRenameVersion = async () => {
    if (!renameVersionTarget || !renameVersionName.trim()) return
    try {
      await client.put(`/versions/${renameVersionTarget.id}`, {
        name: renameVersionName.trim(),
      })
      setRenameVersionOpen(false)
      setRenameVersionTarget(null)
      notify(translate(locale, 'admin.versionRenamed'))
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.versionRenameFailed'), 'error')
    }
  }

  const openEditProduct = () => {
    if (!selected) return
    setEditName(selected.name)
    setEditDesc(selected.description || '')
    setEditCategory(selected.category || '')
    setEditIconUrl(selected.icon_url ?? null)
    setEditProductOpen(true)
  }

  const openPublish = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setPublishName(`${y}.${m}.${day}`)
    setPublishModalOpen(true)
  }

  const openNewVersion = () => {
    const latest = selectedVersions.find((v) => v.is_latest)
    setBaseVersionId(latest?.id ?? '')
    setNewVersionName('')
    setVersionModalOpen(true)
  }

  const versionStatusSuffix = (v: Version) => {
    if (v.is_latest) return ' · 작업 중'
    return v.is_published ? ' · 게시됨' : ' · 게시되지 않음'
  }

  const newVersionSlugPreview = slugifyVersionName(newVersionName)
  const publishSlugPreview = slugifyVersionName(publishName)
  const newProductSlugPreview = slugifyProductName(newProductName)

  const handleReorderProducts = async (
    _categoryKey: string,
    ordered: Product[],
  ) => {
    const patches = sortOrderPatches(ordered)
    if (patches.length === 0) return

    const patchMap = new Map(patches.map((p) => [p.id, p.sort_order]))
    setProducts((prev) =>
      prev.map((p) =>
        patchMap.has(p.id) ? { ...p, sort_order: patchMap.get(p.id)! } : p,
      ),
    )

    try {
      await Promise.all(
        patches.map((p) => client.put(`/products/${p.id}`, { sort_order: p.sort_order })),
      )
    } catch {
      notify(translate(locale, 'admin.productReorderFailed'), 'error')
      await loadData()
    }
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
            <ProductSidebarList
              groups={productGroups}
              selectedId={selectedId}
              versions={versions}
              locale={locale}
              onSelect={setSelectedId}
              onReorder={handleReorderProducts}
            />
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
                  {selected.category?.trim() && (
                    <p
                      className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        isAdminOnlyCategory(selected.category)
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-accent-muted text-accent'
                      }`}
                    >
                      {categoryDisplayLabel(selected.category, locale)}
                      {isAdminOnlyCategory(selected.category)
                        ? ` · ${translate(locale, 'admin.adminOnlyBadge')}`
                        : null}
                    </p>
                  )}
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
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
                    버전
                  </h3>
                  <button
                    type="button"
                    onClick={openNewVersion}
                    disabled={selectedVersions.length === 0}
                    className="admin-btn-secondary py-1.5 text-xs"
                  >
                    <Plus size={14} />
                    새 버전
                  </button>
                </div>

                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-surface-muted/80 text-xs uppercase tracking-wider text-ink-faint">
                        <th className="px-4 py-3 font-medium">이름</th>
                        <th className="px-4 py-3 font-medium">상태</th>
                        <th className="px-4 py-3 text-right font-medium">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedVersions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-ink-muted">
                            버전이 없습니다
                          </td>
                        </tr>
                      ) : (
                        selectedVersions.map((v) => (
                          <tr key={v.id} className="border-t border-stone-50">
                            <td className="px-4 py-3 font-medium">
                              <span className="inline-flex items-center gap-1">
                                {v.name}
                                <button
                                  type="button"
                                  onClick={() => openRenameVersion(v)}
                                  className="inline-flex rounded p-0.5 text-accent transition-colors hover:bg-accent/10"
                                  title={translate(locale, 'admin.renameVersion')}
                                  aria-label={translate(locale, 'admin.renameVersion')}
                                >
                                  <Pencil size={14} />
                                </button>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  v.is_latest
                                    ? 'rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent-hover'
                                    : v.is_published
                                      ? 'rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-ink-muted'
                                      : 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900'
                                }
                              >
                                {v.is_latest
                                  ? translate(locale, 'admin.workingCopyStatus')
                                  : v.is_published
                                    ? translate(locale, 'admin.publishedBadge')
                                    : '게시되지 않음'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                                <button
                                  type="button"
                                  onClick={() => openEditor(v)}
                                  className="text-sm font-medium text-accent hover:underline"
                                >
                                  편집
                                </button>
                                {v.is_published && (
                                  <a
                                    href={`/${selected.slug}/${v.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-ink-muted hover:text-ink hover:underline"
                                  >
                                    보기
                                  </a>
                                )}
                                {v.is_published ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnpublish(v)}
                                    className="text-sm text-ink-muted hover:text-ink hover:underline"
                                  >
                                    게시 취소
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      v.is_latest
                                        ? openPublish()
                                        : handlePublishSnapshot(v)
                                    }
                                    className="text-sm font-medium text-accent hover:underline"
                                  >
                                    게시하기
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  새 버전으로 원하는 스냅샷을 복사해 만들 수 있습니다. 게시됨은 독자에게 공개되며,
                  게시 취소로 비공개로 돌릴 수 있습니다.
                </p>
              </section>
            </>
          )}
        </div>
      </div>

      <AdminDialog
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
              disabled={!newProductName.trim()}
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
              onChange={(e) => setNewProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {translate(locale, 'admin.category')}
            </label>
            <CategoryCombobox
              value={newProductCategory}
              onChange={setNewProductCategory}
              suggestions={categorySuggestions}
              locale={locale}
              placeholder={translate(locale, 'admin.categoryHint')}
            />
            <p className="mt-1 text-xs text-ink-faint">
              {translate(locale, 'admin.adminOnlyCategoryNote', {
                name: translate(locale, 'admin.categoryAdminOnly'),
                code: ADMIN_ONLY_CATEGORY,
              })}
            </p>
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
          <ProductIconField
            productSlug={newProductSlugPreview}
            value={newIconUrl}
            onChange={setNewIconUrl}
            disabled={!newProductSlugPreview}
            onUploadError={(msg) => notify(msg, 'error')}
          />
        </div>
      </AdminDialog>

      <AdminDialog
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
            <label className="mb-1 block text-sm font-medium text-ink">
              {translate(locale, 'admin.category')}
            </label>
            <CategoryCombobox
              value={editCategory}
              onChange={setEditCategory}
              suggestions={categorySuggestions}
              locale={locale}
              placeholder={translate(locale, 'admin.categoryHint')}
            />
            <p className="mt-1 text-xs text-ink-faint">
              {translate(locale, 'admin.adminOnlyCategoryNote', {
                name: translate(locale, 'admin.categoryAdminOnly'),
                code: ADMIN_ONLY_CATEGORY,
              })}
            </p>
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
          {selected ? (
            <ProductIconField
              productSlug={selected.slug}
              value={editIconUrl}
              onChange={setEditIconUrl}
              onUploadError={(msg) => notify(msg, 'error')}
            />
          ) : null}
        </div>
      </AdminDialog>

      <AdminDialog
        open={renameVersionOpen}
        title={translate(locale, 'admin.renameVersion')}
        onClose={() => setRenameVersionOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRenameVersionOpen(false)}
              className="admin-btn-secondary"
            >
              {translate(locale, 'common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleRenameVersion}
              disabled={!renameVersionName.trim()}
              className="admin-btn-primary"
            >
              {translate(locale, 'common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {translate(locale, 'admin.versionDisplayName')}
            </label>
            <input
              className="admin-input"
              value={renameVersionName}
              onChange={(e) => setRenameVersionName(e.target.value)}
            />
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        open={versionModalOpen}
        title="새 버전"
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
              disabled={
                !newVersionName.trim() ||
                !baseVersionId ||
                !newVersionSlugPreview ||
                newVersionSlugPreview === 'latest'
              }
              className="admin-btn-primary"
            >
              만들기
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">원본 버전</label>
            <select
              className="admin-input"
              value={baseVersionId}
              onChange={(e) => setBaseVersionId(Number(e.target.value))}
            >
              {selectedVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {versionStatusSuffix(v)}
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
        </div>
      </AdminDialog>

      <AdminDialog
        open={publishModalOpen}
        title="게시하기"
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
              disabled={
                !publishName.trim() ||
                !publishSlugPreview ||
                publishSlugPreview === 'latest'
              }
              className="admin-btn-primary"
            >
              게시
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-muted">
          작업 중(latest) 내용을 게시된 스냅샷으로 저장합니다. 게시 후에도 작업 중에서 계속
          편집할 수 있습니다.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">버전 이름</label>
            <input
              className="admin-input"
              value={publishName}
              onChange={(e) => setPublishName(e.target.value)}
              placeholder="2026.06.03"
            />
          </div>
        </div>
      </AdminDialog>
    </AdminLayout>
  )
}
