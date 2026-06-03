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
import { Button } from '@/components/ui/button'
import { translate, type Locale } from '../../i18n'
import type { EditorMode } from '../../hooks/useEditorMode'

interface EditorToolbarProps {
  uiLocale: Locale
  editorMode: EditorMode
  onEditorModeChange: (mode: EditorMode) => void
  readOnly: boolean
  saving: boolean
  dirty: boolean
  canSave: boolean
  onSave: () => void
  onDelete?: () => void
  onOpenSettings?: () => void
  onOpenPublic?: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFilePick: (e: React.ChangeEvent<HTMLInputElement>) => void
  onImageUploadClick: () => void
  onVideoEmbed: () => void
  uploading: boolean
}

export default function EditorToolbar({
  uiLocale,
  editorMode,
  onEditorModeChange,
  readOnly,
  saving,
  dirty,
  canSave,
  onSave,
  onDelete,
  onOpenSettings,
  onOpenPublic,
  fileInputRef,
  onFilePick,
  onImageUploadClick,
  onVideoEmbed,
  uploading,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-surface-raised px-4 py-2">
      <div className="mr-2 inline-flex rounded-lg border border-stone-200 p-0.5">
        <button
          type="button"
          disabled={readOnly}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            editorMode === 'markdown'
              ? 'bg-primary text-primary-foreground'
              : 'text-ink-muted hover:bg-surface-muted'
          }`}
          onClick={() => onEditorModeChange('markdown')}
        >
          {translate(uiLocale, 'admin.editorModeMarkdown')}
        </button>
        <button
          type="button"
          disabled={readOnly}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            editorMode === 'wysiwyg'
              ? 'bg-primary text-primary-foreground'
              : 'text-ink-muted hover:bg-surface-muted'
          }`}
          onClick={() => onEditorModeChange('wysiwyg')}
        >
          {translate(uiLocale, 'admin.editorModeWysiwyg')}
        </button>
      </div>

      {!readOnly && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.zip,.mp4,application/pdf,application/zip,video/mp4"
            onChange={onFilePick}
          />
          <Button type="button" variant="outline" size="sm" onClick={onImageUploadClick} disabled={uploading}>
            <ImagePlus size={16} />
            {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <FileUp size={16} />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onVideoEmbed} title="YouTube / Vimeo embed">
            <Video size={16} />
          </Button>
        </>
      )}

      <div className="flex-1" />

      {onOpenPublic && (
        <Button type="button" variant="ghost" size="sm" onClick={onOpenPublic}>
          <ExternalLink size={16} />
        </Button>
      )}
      {onOpenSettings && (
        <Button type="button" variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings2 size={16} />
        </Button>
      )}
      {onDelete && !readOnly && (
        <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 size={16} />
        </Button>
      )}
      {!readOnly && (
        <Button type="button" size="sm" onClick={onSave} disabled={saving || !canSave}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {dirty ? ' *' : ''}
          {translate(uiLocale, 'common.save')}
        </Button>
      )}
    </div>
  )
}
