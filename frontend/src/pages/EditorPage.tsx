import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Settings2, Trash2 } from 'lucide-react'
import EditorToolbar from '../components/editor/EditorToolbar'
import MarkdownEditorPane from '../components/editor/MarkdownEditorPane'
import WysiwygEditorPane, { type WysiwygEditorHandle } from '../components/editor/WysiwygEditorPane'
import { useEditorMode, type EditorMode } from '../hooks/useEditorMode'
import client from '../api/client'
import AdminLayout from '../components/admin/AdminLayout'
import DocTreeNav, { type DocNode } from '../components/admin/DocTreeNav'
import AdminDialog from '../components/admin/AdminDialog'
import { notify } from '@/lib/notify'
import { useAuthStore } from '../stores/authStore'
import { useLocaleStore } from '../stores/localeStore'
import { useEnsureUser } from '../components/auth/useEnsureUser'
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
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate, type Locale } from '../i18n'
import {
  isSecondaryContentLocale,
  localeDisplayLabel,
  localeToApiParam,
} from '../utils/contentLocale'
import { isVersionEditable } from '../utils/versionEdit'

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
  is_published: boolean
}

export default function EditorPage() {
  const { productSlug, versionSlug, docId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  useEnsureUser()
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
  const [dirty, setDirty] = useState(false)
  const uiLocale = useLocaleStore((s) => s.locale)
  const [editLocale, setEditLocale] = useState<Locale>(uiLocale)
  const [localeAvailable, setLocaleAvailable] = useState(true)

  const { mode: editorMode, requestModeChange } = useEditorMode()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorWrapRef = useRef<HTMLDivElement>(null)
  const wysiwygEditorRef = useRef<WysiwygEditorHandle | null>(null)
  const contentRef = useRef(content)
  contentRef.current = content

  const getContentSnapshot = useCallback(() => {
    if (editorMode === 'wysiwyg' && wysiwygEditorRef.current) {
      return wysiwygEditorRef.current.getMarkdown()
    }
    return contentRef.current
  }, [editorMode])

  const handleEditorModeChange = useCallback(
    (next: EditorMode) => {
      const ok = requestModeChange(
        next,
        dirty,
        translate(uiLocale, 'admin.editorModeSwitchDirty'),
      )
      if (!ok) return
      if (editorMode === 'wysiwyg' && wysiwygEditorRef.current) {
        const md = wysiwygEditorRef.current.getMarkdown()
        setContent(md)
        contentRef.current = md
      }
    },
    [dirty, editorMode, requestModeChange, uiLocale],
  )

  const product = products.find((p) => p.slug === selectedProduct)
  const version =
    selectedVersion === 'latest'
      ? versions.find((v) => v.is_latest)
      : versions.find((v) => v.slug === selectedVersion)
  const canEdit = version ? isVersionEditable(version) : false

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
        const hasTranslation =
          !isSecondaryContentLocale(editLocale) || res.data.locale_available !== false
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
    const contentToSave = getContentSnapshot()
    if (editorMode === 'wysiwyg') {
      setContent(contentToSave)
      contentRef.current = contentToSave
    }
    if (isNewDoc && isSecondaryContentLocale(editLocale)) {
      notify(
        translate(uiLocale, 'admin.editorCreateOnDefault', {
          lang: localeDisplayLabel(DEFAULT_LOCALE, uiLocale),
        }),
        'error',
      )
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
          content: contentToSave,
          parent_id: parentId === '' ? null : parentId,
          locale: localeToApiParam(editLocale),
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
        content: contentToSave,
        title,
        locale: localeToApiParam(editLocale),
      })
      setLocaleAvailable(true)
      setDirty(false)
      notify(
        isSecondaryContentLocale(editLocale)
          ? translate(uiLocale, 'admin.editorSavedTranslation', {
              lang: localeDisplayLabel(editLocale, uiLocale),
            })
          : translate(uiLocale, 'admin.editorSaved'),
      )
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
    getContentSnapshot,
    editorMode,
    parentId,
    version,
    selectedDocId,
    selectedDocSlug,
    selectedProduct,
    selectedVersion,
    reloadDocs,
    editLocale,
    uiLocale,
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
      if (editorMode === 'wysiwyg' && wysiwygEditorRef.current) {
        wysiwygEditorRef.current.insertText(snippet)
        setDirty(true)
        return
      }
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
    [editorMode],
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
    if (editorMode !== 'markdown') return
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
  }, [handleMediaUpload, editorMode])

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

  const editorPaneKey = `${selectedDocId ?? 'new'}-${editLocale}-${editorMode}`

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
                {v.is_published ? ' (게시됨)' : ''}
              </option>
            ))}
          </select>

          {version && !canEdit && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-ink-muted">
              {translate(uiLocale, 'admin.editorReadOnlySnapshot')}
            </span>
          )}

      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DocTreeNav
          docs={docTree}
          currentSlug={isNewDoc ? undefined : selectedDocSlug}
          onSelect={selectDoc}
          onNewPage={openNewPageModal}
          onReposition={canEdit ? handleReposition : undefined}
          dragEnabled={canEdit}
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

            {isSecondaryContentLocale(editLocale) &&
              selectedDocId &&
              !localeAvailable &&
              !dirty && (
                <span className="text-xs text-amber-700">
                  {translate(uiLocale, 'admin.editorNoTranslation', {
                    lang: localeDisplayLabel(editLocale, uiLocale),
                  })}
                </span>
              )}

            {isSecondaryContentLocale(editLocale) && selectedDocId && (
              <span className="text-xs text-ink-faint">
                {translate(uiLocale, 'admin.editorUrlPathHint', {
                  base: localeDisplayLabel(DEFAULT_LOCALE, uiLocale),
                  lang: localeDisplayLabel(editLocale, uiLocale),
                })}
              </span>
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
                    disabled={!canEdit}
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
                disabled={!canEdit}
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
                      disabled={!canEdit}
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
                        disabled={!canEdit}
                      >
                        적용
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        className="admin-btn-danger flex-1 py-1.5 text-xs"
                        disabled={!canEdit}
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
          <div className="flex flex-1 flex-col overflow-hidden bg-surface-muted/30">
            {!isNewDoc && !selectedDocSlug ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center m-4">
                <p className="text-lg font-medium text-ink">편집할 페이지를 선택하세요</p>
                <p className="mt-2 max-w-sm text-sm text-ink-muted">
                  왼쪽 트리에서 페이지를 고르거나 새 페이지를 만드세요.
                </p>
                <button
                  type="button"
                  onClick={openNewPageModal}
                  className="admin-btn-primary mt-6"
                  disabled={!canEdit}
                >
                  새 페이지 만들기
                </button>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden m-4 rounded-xl border border-stone-200 bg-white shadow-card">
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
                <EditorToolbar
                  uiLocale={uiLocale}
                  editorMode={editorMode}
                  onEditorModeChange={handleEditorModeChange}
                  readOnly={!canEdit}
                  saving={saving}
                  dirty={dirty}
                  canSave={canEdit && (isNewDoc || !!selectedDocId)}
                  onSave={() => void handleSave()}
                  onDelete={selectedDocId ? () => void handleDelete() : undefined}
                  fileInputRef={fileInputRef}
                  onFilePick={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleMediaUpload(file)
                    e.target.value = ''
                  }}
                  onImageUploadClick={() => imageInputRef.current?.click()}
                  onVideoEmbed={handleVideoEmbed}
                  uploading={uploading}
                  onOpenPublic={
                    selectedProduct
                      ? () =>
                          window.open(
                            `/${selectedProduct}/${selectedVersion}${selectedDocSlug ? `/${selectedDocSlug}` : ''}`,
                            '_blank',
                          )
                      : undefined
                  }
                />
                <div className="min-h-0 flex-1 overflow-auto p-2" data-color-mode="light">
                  {editorMode === 'markdown' ? (
                    <MarkdownEditorPane
                      wrapRef={editorWrapRef}
                      value={content}
                      onChange={(val) => {
                        setContent(val)
                        setDirty(true)
                      }}
                      readOnly={!canEdit}
                    />
                  ) : (
                    <WysiwygEditorPane
                      editorKey={editorPaneKey}
                      initialMarkdown={content}
                      readOnly={!canEdit}
                      onChange={() => setDirty(true)}
                      onUploadImage={(file, callback) => {
                        void (async () => {
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
                            callback(res.data.url as string)
                            setDirty(true)
                            notify('이미지를 삽입했습니다')
                          } catch {
                            notify('업로드에 실패했습니다', 'error')
                          } finally {
                            setUploading(false)
                          }
                        })()
                      }}
                      editorRef={wysiwygEditorRef}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminDialog
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
              disabled={!canEdit}
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
      </AdminDialog>
    </AdminLayout>
  )
}
