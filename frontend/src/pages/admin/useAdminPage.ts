import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import client from '../../api/client'
import { notify } from '@/lib/notify'
import { useAuthStore } from '../../stores/authStore'
import { useEnsureUser } from '../../components/auth/useEnsureUser'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'
import {
  collectCategorySuggestions,
  groupProductsByCategory,
  type ProductWithCategory,
} from '../../utils/productCategories'
import { sortOrderPatches } from '../../utils/productSortOrder'
import { slugifyProductName, slugifyVersionName } from '../../utils/slugify'
import type { AdminProduct, AdminVersion } from './types'

export function useAdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [versions, setVersions] = useState<Record<number, AdminVersion[]>>({})
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
  const [renameVersionTarget, setRenameVersionTarget] = useState<AdminVersion | null>(null)
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

  const versionGroups = useMemo(
    () => ({
      working: selectedVersions.filter((v) => v.is_latest),
      published: selectedVersions.filter((v) => !v.is_latest && v.is_published),
      drafts: selectedVersions.filter((v) => !v.is_latest && !v.is_published),
    }),
    [selectedVersions],
  )

  const loadData = async () => {
    try {
      const res = await client.get('/products/with-versions')
      const rows = res.data as { product: AdminProduct; versions: AdminVersion[] }[]
      const prods = rows.map((row) => row.product)
      const vers: Record<number, AdminVersion[]> = {}
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
    void loadData()
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

  const handlePublishSnapshot = async (v: AdminVersion) => {
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

  const handleUnpublish = async (v: AdminVersion) => {
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

  const handleDeleteVersion = async (v: AdminVersion) => {
    const confirmKey = v.is_latest
      ? 'admin.deleteWorkingCopyConfirm'
      : 'admin.deleteVersionConfirm'
    if (!confirm(translate(locale, confirmKey, { name: v.name }))) {
      return
    }
    try {
      await client.delete(`/versions/${v.id}`)
      notify(
        translate(
          locale,
          v.is_latest ? 'admin.workingCopyReset' : 'admin.versionDeleted',
        ),
      )
      await loadData()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || translate(locale, 'admin.versionDeleteFailed'), 'error')
    }
  }

  const openEditor = (v: AdminVersion) => {
    navigate(
      `/admin/products/${selected!.slug}/${v.is_latest ? 'latest' : v.slug}/editor`,
    )
  }

  const openRenameVersion = (v: AdminVersion) => {
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

  const versionStatusSuffix = (v: AdminVersion) => {
    if (v.is_latest) return ` · ${translate(locale, 'admin.workingCopyStatus')}`
    return v.is_published
      ? ` · ${translate(locale, 'admin.publishedBadge')}`
      : ` · ${translate(locale, 'admin.draftSnapshotBadge')}`
  }

  const newVersionSlugPreview = slugifyVersionName(newVersionName)
  const publishSlugPreview = slugifyVersionName(publishName)
  const newProductSlugPreview = slugifyProductName(newProductName)

  const handleReorderProducts = async (_categoryKey: string, ordered: ProductWithCategory[]) => {
    const patches = sortOrderPatches(ordered)
    if (patches.length === 0) return

    const patchMap = new Map(patches.map((p) => [p.id, p.sort_order]))
    setProducts((prev) =>
      prev.map((p) =>
        patchMap.has(p.id) ? { ...p, sort_order: patchMap.get(p.id)! } : p,
      ),
    )

    try {
      for (const p of patches) {
        await client.put(`/products/${p.id}`, { sort_order: p.sort_order })
      }
    } catch {
      notify(translate(locale, 'admin.productReorderFailed'), 'error')
      await loadData()
    }
  }

  return {
    user,
    locale,
    products,
    versions,
    selectedId,
    setSelectedId,
    loading,
    selected,
    productGroups,
    categorySuggestions,
    versionGroups,
    selectedVersions,
    productModalOpen,
    setProductModalOpen,
    versionModalOpen,
    setVersionModalOpen,
    publishModalOpen,
    setPublishModalOpen,
    editProductOpen,
    setEditProductOpen,
    renameVersionOpen,
    setRenameVersionOpen,
    newProductName,
    setNewProductName,
    newProductDesc,
    setNewProductDesc,
    newProductCategory,
    setNewProductCategory,
    newIconUrl,
    setNewIconUrl,
    newProductSlugPreview,
    editName,
    setEditName,
    editDesc,
    setEditDesc,
    editCategory,
    setEditCategory,
    editIconUrl,
    setEditIconUrl,
    renameVersionName,
    setRenameVersionName,
    newVersionName,
    setNewVersionName,
    baseVersionId,
    setBaseVersionId,
    newVersionSlugPreview,
    publishName,
    setPublishName,
    publishSlugPreview,
    handleLogout,
    handleCreateProduct,
    handleUpdateProduct,
    handleDeleteProduct,
    handleCreateVersion,
    handlePublish,
    handleRenameVersion,
    openEditProduct,
    openNewVersion,
    openEditor,
    openRenameVersion,
    openPublish,
    handlePublishSnapshot,
    handleUnpublish,
    handleDeleteVersion,
    handleReorderProducts,
    versionStatusSuffix,
    navigate,
  }
}

export type UseAdminPageReturn = ReturnType<typeof useAdminPage>
