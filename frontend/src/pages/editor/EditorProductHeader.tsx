import { translate, type Locale } from '../../i18n'
import { formatVersionOptionLabel, readOnlySnapshotBadgeClass } from '../../utils/versionEdit'
import type { EditorProduct, EditorVersion } from './types'

interface EditorProductHeaderProps {
  products: EditorProduct[]
  versions: EditorVersion[]
  selectedProduct: string
  selectedVersion: string
  uiLocale: Locale
  readOnlyBadgeLabel: string | null
  version: EditorVersion | undefined
  onChangeProduct: (slug: string) => void
  onChangeVersion: (slug: string) => void
}

export default function EditorProductHeader({
  products,
  versions,
  selectedProduct,
  selectedVersion,
  uiLocale,
  readOnlyBadgeLabel,
  version,
  onChangeProduct,
  onChangeVersion,
}: EditorProductHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-stone-200 bg-surface-raised px-3 py-2">
      <select
        className="admin-input w-auto min-w-[8rem] py-1.5"
        value={selectedProduct}
        onChange={(e) => onChangeProduct(e.target.value)}
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
        onChange={(e) => onChangeVersion(e.target.value)}
        aria-label="버전"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.slug}>
            {formatVersionOptionLabel(v.name, v, (key) => translate(uiLocale, key))}
          </option>
        ))}
      </select>

      {readOnlyBadgeLabel && version && (
        <span className={`rounded-full px-2 py-0.5 text-xs ${readOnlySnapshotBadgeClass(version)}`}>
          {readOnlyBadgeLabel}
        </span>
      )}
    </header>
  )
}
