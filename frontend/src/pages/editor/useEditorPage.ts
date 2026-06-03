import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEditorMode, type EditorMode } from '../../hooks/useEditorMode'
import client from '../../api/client'
import { type DocNode } from '../../components/admin/DocTreeNav'
import { type WysiwygEditorHandle } from '../../components/editor/WysiwygEditorPane'
import { notify } from '@/lib/notify'
import { useAuthStore } from '../../stores/authStore'
import { useLocaleStore } from '../../stores/localeStore'
import { useEnsureUser } from '../../components/auth/useEnsureUser'
import {
  focusTextareaAt,
  getEditorTextarea,
  getImageFromClipboard,
  insertAtSelection,
  isPasteableUrl,
  markdownLink,
} from '../../utils/editorPaste'
import {
  markdownForUpload,
  markdownForVideoEmbed,
  uploadKindFromFilename,
} from '../../utils/mediaMarkdown'
import { DEFAULT_LOCALE, translate, type Locale } from '../../i18n'
import {
  isSecondaryContentLocale,
  localeDisplayLabel,
  localeToApiParam,
} from '../../utils/contentLocale'
import {
  formatEditorReadOnlyBadge,
  isVersionEditable,
} from '../../utils/versionEdit'
import {
  flattenDocTree,
  findDocNode,
  invalidParentIdsForDoc,
} from '../../utils/docTree'
import type { EditorProduct, EditorVersion } from './types'

export type { EditorProduct, EditorVersion } from './types'

export function useEditorPage() {
  const { productSlug, versionSlug, docId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  useEnsureUser()
  const [products, setProducts] = useState<EditorProduct[]>([])
  const [versions, setVersions] = useState<EditorVersion[]>([])
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
  const readOnlyBadgeLabel = version
    ? formatEditorReadOnlyBadge(version, (key) => translate(uiLocale, key))
    : null

  const invalidParentIds = useMemo(
    () => invalidParentIdsForDoc(docTree, selectedDocId),
    [docTree, selectedDocId],
  )

  const reloadDocs = useCallback(async () => {
    if (!selectedProduct || !selectedVersion) return
    const res = await client.get(
      `/products/${selectedProduct}/versions/${selectedVersion}/documents`,
      { params: { locale: editLocale } },
    )
    setDocTree(res.data)
    setFlatDocs(flattenDocTree(res.data))
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
      if (!res.data.find((v: EditorVersion) => v.slug === selectedVersion)) {
        const latest = res.data.find((v: EditorVersion) => v.is_latest)
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
    const node = findDocNode(docTree, selectedDocId)
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

  return {
    user,
    uiLocale,
    editLocale,
    products,
    versions,
    docTree,
    flatDocs,
    selectedProduct,
    selectedVersion,
    selectedDocSlug,
    selectedDocId,
    isNewDoc,
    content,
    setContent,
    title,
    setTitle,
    parentId,
    setParentId,
    newPageModalOpen,
    setNewPageModalOpen,
    newPageParentId,
    setNewPageParentId,
    saving,
    uploading,
    setUploading,
    settingsOpen,
    setSettingsOpen,
    dirty,
    setDirty,
    localeAvailable,
    editorMode,
    handleEditorModeChange,
    product,
    version,
    canEdit,
    readOnlyBadgeLabel,
    invalidParentIds,
    handleLogout,
    selectDoc,
    openNewPageModal,
    startNewDoc,
    handleReposition,
    switchEditLocale,
    handleSave,
    handleDelete,
    handleMoveParent,
    insertSnippet,
    handleMediaUpload,
    handleVideoEmbed,
    changeProduct,
    changeVersion,
    editorPaneKey,
    editorBreadcrumbs,
    imageInputRef,
    fileInputRef,
    editorWrapRef,
    wysiwygEditorRef,
    getContentSnapshot,
  }
}
