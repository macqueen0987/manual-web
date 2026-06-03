import { useId, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type DragEvent } from 'react'
import { ClipboardPaste, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import client from '../../api/client'
import { PRODUCT_ICON_VERSION_SLUG } from '../../constants/productIconMedia'
import { translate } from '../../i18n'
import { useLocaleStore } from '../../stores/localeStore'
import { getImageFromClipboard } from '../../utils/editorPaste'

interface ProductIconFieldProps {
  productSlug: string
  value: string | null | undefined
  onChange: (url: string | null) => void
  onUploadError?: (message: string) => void
  disabled?: boolean
}

export default function ProductIconField({
  productSlug,
  value,
  onChange,
  onUploadError,
  disabled = false,
}: ProductIconFieldProps) {
  const locale = useLocaleStore((s) => s.locale)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File | undefined) => {
    if (!file || disabled || !productSlug.trim()) return
    const isImage =
      file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.svg')
    if (!isImage) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post<{ url: string }>('/upload', formData, {
        params: {
          product_slug: productSlug.trim(),
          version_slug: PRODUCT_ICON_VERSION_SLUG,
        },
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(res.data.url)
    } catch {
      onUploadError?.(translate(locale, 'admin.productIconUploadFailed'))
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
    const file = e.dataTransfer.files[0]
    void uploadFile(file)
  }

  const url = value?.trim() || ''
  const canUpload = Boolean(productSlug.trim()) && !disabled

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">
        {translate(locale, 'admin.productIcon')}
      </label>
      <p className="text-xs text-ink-faint">{translate(locale, 'admin.productIconHint')}</p>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-accent-muted text-accent"
          aria-hidden
        >
          {url ? (
            <img src={url} alt="" className="h-7 w-7 object-contain" />
          ) : (
            <ImagePlus size={20} strokeWidth={1.5} className="text-ink-faint" />
          )}
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          {url ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-btn-secondary py-1.5 text-sm"
                disabled={!canUpload || uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImagePlus size={16} />
                )}
                {translate(locale, 'admin.productIconReplace')}
              </button>
              <button
                type="button"
                className="ui-btn-ghost py-1.5 text-sm text-red-600"
                disabled={disabled}
                onClick={() => onChange(null)}
              >
                <Trash2 size={16} />
                {translate(locale, 'admin.productIconRemove')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ui-btn-secondary py-1.5 text-sm"
              disabled={!canUpload || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImagePlus size={16} />
              )}
              {translate(locale, 'admin.productIconUpload')}
            </button>
          )}

          <div
            tabIndex={canUpload ? 0 : -1}
            role="button"
            aria-disabled={!canUpload}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => canUpload && e.preventDefault()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && canUpload) {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
            className={`rounded-md border border-dashed px-3 py-2 text-xs outline-none ${
              canUpload
                ? 'cursor-pointer border-stone-300 bg-stone-50/80 text-ink-faint hover:border-stone-400 focus-visible:ring-2 focus-visible:ring-accent/40'
                : 'border-stone-200 bg-stone-50 text-ink-faint/60'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ClipboardPaste size={14} />
              {translate(locale, 'admin.productIconPaste')}
            </span>
          </div>

          <input
            className="ui-input font-mono text-xs"
            value={url}
            placeholder="/uploads/…/_icon/…"
            disabled={disabled}
            onChange={(e) => onChange(e.target.value.trim() || null)}
            onPaste={(e) => {
              const imageFile = getImageFromClipboard(e.nativeEvent)
              if (imageFile) {
                e.preventDefault()
                void uploadFile(imageFile)
              }
            }}
          />
        </div>
      </div>

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,.svg"
        className="sr-only"
        onChange={(e) => void uploadFile(e.target.files?.[0])}
      />
    </div>
  )
}
