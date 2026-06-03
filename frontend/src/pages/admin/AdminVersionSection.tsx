import { translate, type Locale } from '../../i18n'
import AdminVersionRow from './AdminVersionRow'
import type { AdminProduct, AdminVersion } from './types'

interface AdminVersionSectionProps {
  title: string
  description: string
  rows: AdminVersion[]
  product: AdminProduct
  locale: Locale
  onEdit: (version: AdminVersion) => void
  onRename: (version: AdminVersion) => void
  onPublishWorkingCopy: () => void
  onPublishSnapshot: (version: AdminVersion) => void
  onUnpublish: (version: AdminVersion) => void
  onDelete: (version: AdminVersion) => void
}

export default function AdminVersionSection({
  title,
  description,
  rows,
  product,
  locale,
  onEdit,
  onRename,
  onPublishWorkingCopy,
  onPublishSnapshot,
  onUnpublish,
  onDelete,
}: AdminVersionSectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card">
      <div className="border-b border-stone-100 bg-surface-muted/60 px-4 py-3">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">{description}</p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-100 text-xs uppercase tracking-wider text-ink-faint">
            <th className="px-4 py-2 font-medium">이름</th>
            <th className="px-4 py-2 font-medium">상태</th>
            <th className="px-4 py-2 text-right font-medium">작업</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center text-xs text-ink-muted">
                {translate(locale, 'admin.versionGroupEmpty')}
              </td>
            </tr>
          ) : (
            rows.map((v) => (
              <AdminVersionRow
                key={v.id}
                version={v}
                product={product}
                locale={locale}
                onEdit={onEdit}
                onRename={onRename}
                onPublishWorkingCopy={onPublishWorkingCopy}
                onPublishSnapshot={onPublishSnapshot}
                onUnpublish={onUnpublish}
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
