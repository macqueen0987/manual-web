import { useId, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent } from 'react'
import { ClipboardPaste, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import client from '../../api/client'
import {
  SITE_MEDIA_PRODUCT_SLUG,
  SITE_MEDIA_VERSION_SLUG,
} from '../../constants/siteMedia'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'
import { getImageFromClipboard } from '../../utils/editorPaste'

interface CategoryImageFieldProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  onUploadError?: (message: string) => void
}

export default function CategoryImageField({
  value,
  onChange,
  onUploadError,
}: CategoryImageFieldProps) {
  const locale = useLocaleStore((s) => s.locale)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const pasteZoneRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pasteActive, setPasteActive] = useState(false)

  const uploadFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post<{ url: string }>('/upload', formData, {
        params: {
          product_slug: SITE_MEDIA_PRODUCT_SLUG,
          version_slug: SITE_MEDIA_VERSION_SLUG,
        },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
    } catch {
      onUploadError?.(translate(locale, 'admin.homeEditorImageUploadFailed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handlePaste = (e: ReactClipboardEvent) => {
    const imageFile = getImageFromClipboard(e.nativeEvent)
    if (!imageFile) return
    e.preventDefault()
    e.stopPropagation()
    void uploadFile(imageFile)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setPasteActive(false)
    const file = e.dataTransfer.files[0]
    void uploadFile(file)
  }

  const url = value?.trim() || ''

  const pasteZone = (
    <div
      ref={pasteZoneRef}
      tabIndex={0}
      role="button"
      aria-label={translate(locale, 'admin.homeEditorImagePasteZone')}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        setPasteActive(true)
      }}
      onDragLeave={() => setPasteActive(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          fileRef.current?.click()
        }
      }}
      className={`mt-3 flex min-h-[7rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        pasteActive
          ? 'border-accent bg-accent-muted/30'
          : 'border-stone-300 bg-stone-50/80 hover:border-stone-400 hover:bg-stone-50'
      } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      onClick={() => pasteZoneRef.current?.focus()}
    >
      {uploading ? (
        <Loader2 size={28} className="animate-spin text-accent" />
      ) : (
        <>
          <span className="flex items-center gap-2 text-ink-muted">
            <ImagePlus size={20} strokeWidth={1.5} />
            <ClipboardPaste size={20} strokeWidth={1.5} />
          </span>
          <span className="text-sm font-medium text-ink">
            {translate(locale, 'admin.homeEditorImagePasteZone')}
          </span>
          <span className="max-w-sm text-xs text-ink-faint">
            {translate(locale, 'admin.homeEditorImagePasteHint')}
          </span>
        </>
      )}
    </div>
  )

  return (
    <div className="sm:col-span-2">
      <span className="text-xs text-ink-faint">
        {translate(locale, 'admin.homeEditorImageUrl')}
      </span>
      <p className="mt-0.5 text-xs text-ink-faint">
        {translate(locale, 'admin.homeEditorImageHint')}
      </p>

      {url ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-start gap-4">
            <img
              src={url}
              alt=""
              className="h-24 w-auto max-w-full rounded-lg border border-stone-200 bg-white object-contain p-1"
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="ui-btn-secondary py-1.5 text-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImagePlus size={16} />
                )}
                {translate(locale, 'admin.homeEditorImageReplace')}
              </button>
              <button
                type="button"
                className="ui-btn-ghost py-1.5 text-sm text-red-600"
                onClick={() => onChange(null)}
              >
                <Trash2 size={16} />
                {translate(locale, 'admin.homeEditorImageRemove')}
              </button>
            </div>
          </div>
          <div
            tabIndex={0}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-md border border-stone-200 bg-surface px-3 py-2 text-xs text-ink-faint outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {translate(locale, 'admin.homeEditorImagePasteReplace')}
          </div>
        </div>
      ) : (
        <>
          {pasteZone}
          <button
            type="button"
            className="ui-btn-secondary mt-2 py-1.5 text-sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {translate(locale, 'admin.homeEditorImageUpload')}
          </button>
        </>
      )}

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        onChange={(e) => void uploadFile(e.target.files?.[0])}
      />

      <label className="mt-4 block">
        <span className="text-xs text-ink-faint">
          {translate(locale, 'admin.homeEditorImageUrlManual')}
        </span>
        <input
          className="ui-input mt-1 font-mono text-xs"
          value={url}
          placeholder="/uploads/_site/home/…"
          onChange={(e) => onChange(e.target.value.trim() || null)}
          onPaste={(e) => {
            const imageFile = getImageFromClipboard(e.nativeEvent)
            if (imageFile) {
              e.preventDefault()
              void uploadFile(imageFile)
            }
          }}
        />
      </label>
    </div>
  )
}
