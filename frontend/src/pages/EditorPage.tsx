import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import MDEditor from '@uiw/react-md-editor'
import {
  ExternalLink,
  FileUp,
  ImagePlus,
  Loader2,
  Save,
  Settings2,
  Trash2,
  Video,
} from 'lucide-react'
import client from '../api/client'
import AdminLayout from '../components/admin/AdminLayout'
import DocTreeNav, { type DocNode } from '../components/admin/DocTreeNav'
import Modal from '../components/admin/Modal'
import Toast, { type ToastMessage } from '../components/admin/Toast'
import { useAuthStore } from '../stores/authStore'
import {
  focusTextareaAt,
  getEditorTextarea,
  getImageFromClipboard,
  insertAtSelection,
  isPasteableUrl,
  markdownLink,
} from '../utils/editorPaste'
import {
  markdownForUpload,
  markdownForVideoEmbed,
  uploadKindFromFilename,
} from '../utils/mediaMarkdown'
import type { Locale } from '../i18n'
import { SUPPORTED_LOCALES } from '../i18n'

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

export default function EditorPage() {
  const { productSlug, versionSlug, docId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuthStore()

  const [user, setUser] = useState<{ email: string } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [docTree, setDocTree] = useState<DocNode[]>([])
  const [flatDocs, setFlatDocs] = useState<DocNode[]>([])

  const [selectedProduct, setSelectedProduct] = useState(productSlug || '')
  const [selectedVersion, setSelectedVersion] = useState(versionSlug || 'latest')
  const [selectedDocSlug, setSelectedDocSlug] = useState(docId || '')
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [isNewDoc, setIsNewDoc] = useState(false)

  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [parentId, setParentId] = useState<number | ''>('')
  const [newPageModalOpen, setNewPageModalOpen] = useState(false)
  const [newPageParentId, setNewPageParentId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [dirty, setDirty] = useState(false)
  const [editLocale, setEditLocale] = useState<Locale>('en')
  const [localeAvailable, setLocaleAvailable] = useState(true)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef(content)
  contentRef.current = content

  const product = products.find((p) => p.slug === selectedProduct)
  const version = versions.find((v) => v.slug === selectedVersion)
  const isLatest = version?.is_latest ?? selectedVersion === 'latest'

  const notify = (text: string, variant: 'success' | 'error' = 'success') => {
    setToast({ text, variant })
  }

  const flattenTree = (nodes: DocNode[]): DocNode[] => {
    const result: DocNode[] = []
    for (const node of nodes) {
      result.push({
        id: node.id,
        title: node.title,
        slug: node.slug,
        parent_id: node.parent_id ?? null,
        children: node.children,
      })
      if (node.children?.length) result.push(...flattenTree(node.children))
    }
    return result
  }

  const findNodeInTree = (nodes: DocNode[], id: number): DocNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children?.length) {
        const found = findNodeInTree(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  const invalidParentIds = useMemo(() => {
    if (!selectedDocId) return new Set<number>()
    const node = findNodeInTree(docTree, selectedDocId)
    if (!node) return new Set<number>([selectedDocId])
    const ids = new Set<number>([selectedDocId])
    const walk = (n: DocNode) => {
      for (const child of n.children ?? []) {
        ids.add(child.id)
        walk(child)
      }
    }
    walk(node)
    return ids
  }, [docTree, selectedDocId])

  const reloadDocs = useCallback(async () => {
    if (!selectedProduct || !selectedVersion) return
    const res = await client.get(
      `/products/${selectedProduct}/versions/${selectedVersion}/documents`,
      { params: { locale: editLocale } },
    )
    setDocTree(res.data)
    setFlatDocs(flattenTree(res.data))
  }, [selectedProduct, selectedVersion, editLocale])

  useEffect(() => {
    client.get('/auth/me').then((res) => setUser(res.data)).catch(() => {})
    client.get('/products').then((res) => {
      setProducts(res.data)
      if (!selectedProduct && res.data.length > 0) {
        setSelectedProduct(productSlug || res.data[0].slug)
      }
    })
  }, [])

  useEffect(() => {
    if (productSlug) setSelectedProduct(productSlug)
    if (versionSlug) setSelectedVersion(versionSlug)
    if (docId) {
      setSelectedDocSlug(docId)
      setIsNewDoc(false)
    }
  }, [productSlug, versionSlug, docId])

  useEffect(() => {
    if (!selectedProduct) return
    client.get(`/products/${selectedProduct}/versions`).then((res) => {
      setVersions(res.data)
      if (!res.data.find((v: Version) => v.slug === selectedVersion)) {
        const latest = res.data.find((v: Version) => v.is_latest)
        setSelectedVersion(latest?.slug || res.data[0]?.slug || 'latest')
      }
    })
  }, [selectedProduct])

  useEffect(() => {
    reloadDocs()
  }, [reloadDocs])

  useEffect(() => {
    if (!selectedProduct || !selectedVersion) return
    const expected = selectedDocSlug
      ? `/admin/products/${selectedProduct}/${selectedVersion}/editor/${selectedDocSlug}`
      : `/admin/products/${selectedProduct}/${selectedVersion}/editor`
    if (location.pathname !== expected) {
      navigate(expected, { replace: true })
    }
  }, [selectedProduct, selectedVersion, selectedDocSlug, location.pathname, navigate])

  useEffect(() => {
    if (!selectedDocSlug || isNewDoc) {
      if (!isNewDoc) {
        setSelectedDocId(null)
        setContent('')
        setTitle('')
        setParentId('')
      }
      return
    }
    client
      .get(
        `/products/${selectedProduct}/versions/${selectedVersion}/documents/${selectedDocSlug}`,
        { params: { locale: editLocale } },
      )
      .then((res) => {
        setSelectedDocId(res.data.id)
        const hasTranslation = editLocale === 'en' || res.data.locale_available !== false
        setLocaleAvailable(hasTranslation)
        setContent(hasTranslation ? res.data.content : '')
        setTitle(hasTranslation ? res.data.title : '')
        setParentId(res.data.parent_id ?? '')
        setDirty(false)
      })
      .catch(() => notify('문서를 불러오지 못했습니다', 'error'))
  }, [selectedDocSlug, selectedProduct, selectedVersion, isNewDoc, editLocale])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const selectDoc = (docSlug: string) => {
    setIsNewDoc(false)
    setSelectedDocSlug(docSlug)
    setSettingsOpen(false)
  }

  const openNewPageModal = () => {
    setNewPageParentId(parentId === '' ? '' : parentId)
    setNewPageModalOpen(true)
  }

  const startNewDoc = (chosenParentId: number | '' = '') => {
    setIsNewDoc(true)
    setSelectedDocSlug('')
    setSelectedDocId(null)
    setContent('')
    setTitle('')
    setParentId(chosenParentId)
    setDirty(false)
    setSettingsOpen(false)
    setNewPageModalOpen(false)
  }

  const handleReposition = async (
    docId: number,
    newParentId: number | null,
    sortOrder: number,
  ) => {
    try {
      await client.post(`/documents/${docId}/reposition`, {
        parent_id: newParentId,
        sort_order: sortOrder,
      })
      notify('문서 위치를 변경했습니다')
      await reloadDocs()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || '이동에 실패했습니다', 'error')
    }
  }

  const switchEditLocale = (next: Locale) => {
    if (next === editLocale) return
    if (dirty && !window.confirm('저장하지 않은 변경이 있습니다. 언어 탭을 바꿀까요?')) return
    setEditLocale(next)
    setDirty(false)
  }

  const handleSave = useCallback(async () => {
    if (isNewDoc && editLocale !== 'en') {
      notify('새 페이지는 English 탭에서 먼저 만드세요', 'error')
      return
    }
    if (isNewDoc) {
      if (!title.trim()) {
        notify('제목을 입력하세요', 'error')
        return
      }
      if (!version) return
      setSaving(true)
      try {
        const res = await client.post('/documents', {
          version_id: version.id,
          title,
          content,
          parent_id: parentId === '' ? null : parentId,
          locale: editLocale === 'en' ? undefined : editLocale,
        })
        setIsNewDoc(false)
        setSelectedDocId(res.data.id)
        setSelectedDocSlug(res.data.slug)
        setDirty(false)
        notify('페이지를 만들었습니다')
        await reloadDocs()
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        notify(detail || '생성에 실패했습니다', 'error')
      } finally {
        setSaving(false)
      }
      return
    }

    if (!selectedDocId) return
    setSaving(true)
    try {
      await client.put(`/documents/${selectedDocId}`, {
        content,
        title,
        locale: editLocale === 'en' ? undefined : editLocale,
      })
      setLocaleAvailable(true)
      setDirty(false)
      notify(editLocale === 'ko' ? '한국어 번역을 저장했습니다' : '저장했습니다')
      await reloadDocs()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || '저장에 실패했습니다', 'error')
    } finally {
      setSaving(false)
    }
  }, [
    isNewDoc,
    title,
    content,
    parentId,
    version,
    selectedDocId,
    selectedDocSlug,
    selectedProduct,
    selectedVersion,
    reloadDocs,
    editLocale,
  ])

  const handleDelete = async () => {
    if (!selectedDocId) return
    const node = findNodeInTree(docTree, selectedDocId)
    if (node?.children?.length) {
      notify('하위 페이지가 있어 삭제할 수 없습니다. 하위 페이지를 먼저 이동하거나 삭제하세요.', 'error')
      return
    }
    if (!confirm('이 페이지를 삭제할까요?')) return
    try {
      await client.delete(`/documents/${selectedDocId}`)
      setSelectedDocId(null)
      setSelectedDocSlug('')
      setIsNewDoc(false)
      notify('페이지를 삭제했습니다')
      await reloadDocs()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || '삭제에 실패했습니다', 'error')
    }
  }

  const handleMoveParent = async () => {
    if (!selectedDocId) return
    try {
      await client.post(`/documents/${selectedDocId}/reposition`, {
        parent_id: parentId === '' ? null : parentId,
        sort_order: 9999,
      })
      notify('상위 페이지를 변경했습니다')
      await reloadDocs()
      setSettingsOpen(false)
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      notify(detail || '변경에 실패했습니다', 'error')
    }
  }

  const insertSnippet = useCallback(
    (snippet: string, range?: { start: number; end: number }) => {
      const textarea = editorWrapRef.current
        ? getEditorTextarea(editorWrapRef.current)
        : null
      const current = contentRef.current

      if (range) {
        const next = insertAtSelection(current, snippet, range.start, range.end)
        setContent(next)
        setDirty(true)
        if (textarea) focusTextareaAt(textarea, range.start + snippet.length)
        return
      }

      if (textarea && document.activeElement === textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const next = insertAtSelection(current, snippet, start, end)
        setContent(next)
        setDirty(true)
        focusTextareaAt(textarea, start + snippet.length)
        return
      }

      setContent((prev) => `${prev}${snippet}`)
      setDirty(true)
    },
    [],
  )

  const handleMediaUpload = useCallback(
    async (file: File, range?: { start: number; end: number }) => {
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await client.post('/upload', formData, {
          params: {
            product_slug: selectedProduct,
            version_slug: selectedVersion,
          },
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const url = res.data.url as string
        const kind =
          (res.data.kind as 'image' | 'video' | 'file') || uploadKindFromFilename(file.name)
        const name = (res.data.original_name as string) || file.name
        const snippet = markdownForUpload(url, name, kind)
        insertSnippet(snippet, range)
        notify(kind === 'image' ? '이미지를 삽입했습니다' : '파일을 삽입했습니다')
      } catch {
        notify('업로드에 실패했습니다', 'error')
      } finally {
        setUploading(false)
      }
    },
    [selectedProduct, selectedVersion, insertSnippet],
  )

  const handleVideoEmbed = () => {
    const url = window.prompt('YouTube 또는 Vimeo URL을 입력하세요')
    if (!url?.trim()) return
    const snippet = markdownForVideoEmbed(url.trim())
    if (!snippet) {
      notify('지원하지 않는 동영상 URL입니다', 'error')
      return
    }
    insertSnippet(snippet)
    notify('동영상 embed를 삽입했습니다')
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = editorWrapRef.current
      if (!el) return

      const target = e.target
      if (!(target instanceof Node) || !el.contains(target)) return

      const textarea =
        target instanceof HTMLTextAreaElement ? target : getEditorTextarea(el)
      if (!textarea || !el.contains(textarea)) return

      const imageFile = getImageFromClipboard(e)
      if (imageFile) {
        e.preventDefault()
        e.stopPropagation()
        void handleMediaUpload(imageFile, {
          start: textarea.selectionStart,
          end: textarea.selectionEnd,
        })
        return
      }

      const pastedText = e.clipboardData?.getData('text/plain')?.trim()
      if (!pastedText || !isPasteableUrl(pastedText)) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      if (start === end) return

      const selectedText = contentRef.current.slice(start, end)
      if (!selectedText.trim()) return

      e.preventDefault()
      e.stopPropagation()
      const link = markdownLink(selectedText, pastedText)
      const next = insertAtSelection(contentRef.current, link, start, end)
      setContent(next)
      setDirty(true)
      focusTextareaAt(textarea, start + link.length)
    }

    document.addEventListener('paste', onPaste, true)
    return () => document.removeEventListener('paste', onPaste, true)
  }, [handleMediaUpload])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  const changeProduct = (slug: string) => {
    setSelectedProduct(slug)
    setSelectedVersion('latest')
    setSelectedDocSlug('')
    setIsNewDoc(false)
  }

  const changeVersion = (slug: string) => {
    setSelectedVersion(slug)
    setSelectedDocSlug('')
    setIsNewDoc(false)
  }

  const editorHeight =
    typeof window !== 'undefined' ? Math.max(400, window.innerHeight - 148) : 600

  const editorBreadcrumbs = useMemo(() => {
    const items: { label: string; to?: string }[] = [{ label: '관리', to: '/admin' }]
    if (product) {
      items.push({
        label: product.name,
        to: `/admin/products/${selectedProduct}/${selectedVersion}/editor`,
      })
    }
    if (version) {
      items.push({ label: version.name })
    }
    if (isNewDoc) {
      items.push({ label: '새 페이지' })
    } else if (selectedDocSlug) {
      items.push({ label: title.trim() || selectedDocSlug })
    }
    return items
  }, [
    product,
    version,
    selectedProduct,
    selectedVersion,
    isNewDoc,
    selectedDocSlug,
    title,
  ])

  return (
    <AdminLayout
      userEmail={user?.email}
      onLogout={handleLogout}
      variant="editor"
      breadcrumbs={editorBreadcrumbs}
    >
      {/* Editor toolbar */}
      <header className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-stone-200 bg-surface-raised px-3 py-2">
          <select
            className="admin-input w-auto min-w-[8rem] py-1.5"
            value={selectedProduct}
            onChange={(e) => changeProduct(e.target.value)}
            aria-label="제품"
          >
            {products.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className="admin-input w-auto min-w-[7rem] py-1.5"
            value={selectedVersion}
            onChange={(e) => changeVersion(e.target.value)}
            aria-label="버전"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.slug}>
                {v.name}
                {v.is_latest ? ' (작업 중)' : ''}
              </option>
            ))}
          </select>

          {!isLatest && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
              읽기 전용 — latest에서 편집하세요
            </span>
          )}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleMediaUpload(file)
              e.target.value = ''
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.zip,.mp4,application/pdf,application/zip,video/mp4"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleMediaUpload(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading || !isLatest}
            className="admin-btn-secondary py-1.5"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImagePlus size={16} />
            )}
            이미지
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !isLatest}
            className="admin-btn-secondary py-1.5"
            title="PDF, ZIP, MP4"
          >
            <FileUp size={16} />
            파일
          </button>
          <button
            type="button"
            onClick={handleVideoEmbed}
            disabled={!isLatest}
            className="admin-btn-secondary py-1.5"
            title="YouTube / Vimeo embed"
          >
            <Video size={16} />
            동영상
          </button>
          {selectedProduct && (
            <a
              href={`/${selectedProduct}/${selectedVersion}${selectedDocSlug ? `/${selectedDocSlug}` : ''}`}
              target="_blank"
              rel="noreferrer"
              className="admin-btn-secondary py-1.5"
              title="현재 페이지를 공개 문서에서 미리보기"
            >
              <ExternalLink size={16} />
              미리보기
            </a>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || (!isNewDoc && !selectedDocId) || !isLatest}
            className="admin-btn-primary py-1.5"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? '저장 중…' : '저장'}
            <span className="sr-only">(Ctrl+S)</span>
          </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DocTreeNav
          docs={docTree}
          currentSlug={isNewDoc ? undefined : selectedDocSlug}
          onSelect={selectDoc}
          onNewPage={openNewPageModal}
          onReposition={isLatest ? handleReposition : undefined}
          dragEnabled={isLatest}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Page toolbar */}
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-stone-100 bg-surface-raised px-4 py-3">
            {(selectedDocId || isNewDoc) && (
              <div
                className="flex rounded-lg border border-stone-200 bg-surface-muted/50 p-0.5"
                role="tablist"
                aria-label="편집 언어"
              >
                {SUPPORTED_LOCALES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    role="tab"
                    aria-selected={editLocale === code}
                    onClick={() => switchEditLocale(code)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      editLocale === code
                        ? 'bg-white text-ink shadow-sm'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {code === 'ko' ? '한국어' : 'English'}
                  </button>
                ))}
              </div>
            )}

            {editLocale === 'ko' && selectedDocId && !localeAvailable && !dirty && (
              <span className="text-xs text-amber-700">아직 한국어 번역 없음 — 새로 작성 후 저장</span>
            )}

            {editLocale === 'ko' && selectedDocId && (
              <span className="text-xs text-ink-faint">URL 경로는 English 페이지와 동일 · 제목만 한국어</span>
            )}

            {isNewDoc || !selectedDocId ? (
              <>
                <div className="min-w-[12rem] flex-1">
                  <label className="sr-only">제목</label>
                  <input
                    className="admin-input text-base font-medium"
                    placeholder="페이지 제목"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setDirty(true)
                    }}
                    disabled={!isLatest}
                  />
                </div>
                {isNewDoc && (
                  <span className="text-xs text-ink-faint">
                    URL slug는 제목에서 자동 생성됩니다
                  </span>
                )}
              </>
            ) : (
              <input
                className="admin-input min-w-[12rem] flex-1 text-base font-medium"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setDirty(true)
                }}
                disabled={!isLatest}
                aria-label="페이지 제목"
              />
            )}

            {dirty && (
              <span className="text-xs text-ink-faint">저장되지 않음</span>
            )}

            {selectedDocId && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="admin-btn-secondary py-1.5"
                  aria-expanded={settingsOpen}
                >
                  <Settings2 size={16} />
                  설정
                </button>
                {settingsOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-stone-200 bg-white p-4 shadow-lg">
                    <p className="mb-2 text-xs font-medium uppercase text-ink-faint">
                      상위 페이지
                    </p>
                    <select
                      className="admin-input mb-3"
                      value={parentId}
                      onChange={(e) =>
                        setParentId(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      disabled={!isLatest}
                    >
                      <option value="">(최상위)</option>
                      {flatDocs
                        .filter((d) => !invalidParentIds.has(d.id))
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleMoveParent()}
                        className="admin-btn-secondary flex-1 py-1.5 text-xs"
                        disabled={!isLatest}
                      >
                        적용
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        className="admin-btn-danger flex-1 py-1.5 text-xs"
                        disabled={!isLatest}
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Editor area */}
          <div className="flex-1 overflow-hidden bg-surface-muted/30 p-4">
            {!isNewDoc && !selectedDocSlug ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
                <p className="text-lg font-medium text-ink">편집할 페이지를 선택하세요</p>
                <p className="mt-2 max-w-sm text-sm text-ink-muted">
                  왼쪽 트리에서 페이지를 고르거나 새 페이지를 만드세요.
                </p>
                <button
                  type="button"
                  onClick={openNewPageModal}
                  className="admin-btn-primary mt-6"
                  disabled={!isLatest}
                >
                  새 페이지 만들기
                </button>
              </div>
            ) : (
              <div
                ref={editorWrapRef}
                className="h-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card"
                data-color-mode="light"
              >
                <MDEditor
                  value={content}
                  onChange={(val) => {
                    setContent(val || '')
                    setDirty(true)
                  }}
                  height={editorHeight}
                  preview="live"
                  enableScroll
                  visibleDragbar={false}
                  previewOptions={{
                    className: 'doc-prose max-w-none',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={newPageModalOpen}
        title="새 페이지"
        onClose={() => setNewPageModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => setNewPageModalOpen(false)}
            >
              취소
            </button>
            <button
              type="button"
              className="admin-btn-primary"
              onClick={() => startNewDoc(newPageParentId)}
              disabled={!isLatest}
            >
              만들기
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-muted">
          상위 페이지를 선택하세요. URL slug는 저장 시 제목에서 자동 생성됩니다.
        </p>
        <label className="mb-1 block text-xs font-medium uppercase text-ink-faint">
          상위 페이지
        </label>
        <select
          className="admin-input"
          value={newPageParentId}
          onChange={(e) =>
            setNewPageParentId(e.target.value === '' ? '' : Number(e.target.value))
          }
        >
          <option value="">(최상위)</option>
          {flatDocs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </Modal>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AdminLayout>
  )
}
