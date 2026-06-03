import type { RefObject } from 'react'
import EditorToolbar from '../../components/editor/EditorToolbar'
import MarkdownEditorPane from '../../components/editor/MarkdownEditorPane'
import WysiwygEditorPane, { type WysiwygEditorHandle } from '../../components/editor/WysiwygEditorPane'
import client from '../../api/client'
import { notify } from '@/lib/notify'
import type { EditorMode } from '../../hooks/useEditorMode'
import type { Locale } from '../../i18n'

interface EditorWorkspaceProps {
  isNewDoc: boolean
  selectedDocSlug: string
  selectedDocId: number | null
  canEdit: boolean
  openNewPageModal: () => void
  imageInputRef: RefObject<HTMLInputElement>
  fileInputRef: RefObject<HTMLInputElement>
  editorWrapRef: RefObject<HTMLDivElement>
  wysiwygEditorRef: RefObject<WysiwygEditorHandle | null>
  uiLocale: Locale
  editorMode: EditorMode
  onEditorModeChange: (mode: EditorMode) => void
  saving: boolean
  dirty: boolean
  onSave: () => void
  onDelete?: () => void
  onMediaUpload: (file: File) => void
  onVideoEmbed: () => void
  uploading: boolean
  selectedProduct: string
  selectedVersion: string
  editorPaneKey: string
  content: string
  onContentChange: (value: string) => void
  onDirty: () => void
  setUploading: (uploading: boolean) => void
}

export default function EditorWorkspace({
  isNewDoc,
  selectedDocSlug,
  selectedDocId,
  canEdit,
  openNewPageModal,
  imageInputRef,
  fileInputRef,
  editorWrapRef,
  wysiwygEditorRef,
  uiLocale,
  editorMode,
  onEditorModeChange,
  saving,
  dirty,
  onSave,
  onDelete,
  onMediaUpload,
  onVideoEmbed,
  uploading,
  selectedProduct,
  selectedVersion,
  editorPaneKey,
  content,
  onContentChange,
  onDirty,
  setUploading,
}: EditorWorkspaceProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface-muted/30">
      {!isNewDoc && !selectedDocSlug ? (
        <div className="m-4 flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center">
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
        <div className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onMediaUpload(file)
              e.target.value = ''
            }}
          />
          <EditorToolbar
            uiLocale={uiLocale}
            editorMode={editorMode}
            onEditorModeChange={onEditorModeChange}
            readOnly={!canEdit}
            saving={saving}
            dirty={dirty}
            canSave={canEdit && (isNewDoc || !!selectedDocId)}
            onSave={onSave}
            onDelete={onDelete}
            fileInputRef={fileInputRef}
            onFilePick={(e) => {
              const file = e.target.files?.[0]
              if (file) onMediaUpload(file)
              e.target.value = ''
            }}
            onImageUploadClick={() => imageInputRef.current?.click()}
            onVideoEmbed={onVideoEmbed}
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
                  onContentChange(val)
                  onDirty()
                }}
                readOnly={!canEdit}
              />
            ) : (
              <WysiwygEditorPane
                editorKey={editorPaneKey}
                initialMarkdown={content}
                readOnly={!canEdit}
                onChange={onDirty}
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
                      onDirty()
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
  )
}
