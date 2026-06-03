import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { translate, type Locale } from '../../i18n'
import {
  categoryDisplayLabel,
  isAdminOnlyCategory,
} from '../../utils/productCategories'
import AdminVersionSection from './AdminVersionSection'
import type { AdminProduct, AdminVersion } from './types'

interface AdminProductDetailProps {
  product: AdminProduct
  locale: Locale
  versionGroups: {
    working: AdminVersion[]
    published: AdminVersion[]
    drafts: AdminVersion[]
  }
  selectedVersions: AdminVersion[]
  onOpenEditor: () => void
  onOpenEditProduct: () => void
  onDeleteProduct: (id: number) => void
  onOpenNewVersion: () => void
  onEditVersion: (version: AdminVersion) => void
  onRenameVersion: (version: AdminVersion) => void
  onPublishWorkingCopy: () => void
  onPublishSnapshot: (version: AdminVersion) => void
  onUnpublish: (version: AdminVersion) => void
  onDeleteVersion: (version: AdminVersion) => void
}

export default function AdminProductDetail({
  product: selected,
  locale,
  versionGroups,
  selectedVersions,
  onOpenEditor,
  onOpenEditProduct,
  onDeleteProduct,
  onOpenNewVersion,
  onEditVersion,
  onRenameVersion,
  onPublishWorkingCopy,
  onPublishSnapshot,
  onUnpublish,
  onDeleteVersion,
}: AdminProductDetailProps) {
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">{selected.name}</h2>
          <p className="mt-1 font-mono text-sm text-ink-faint">/{selected.slug}</p>
          {selected.category?.trim() && (
            <p
              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isAdminOnlyCategory(selected.category)
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-accent-muted text-accent'
              }`}
            >
              {categoryDisplayLabel(selected.category, locale)}
              {isAdminOnlyCategory(selected.category)
                ? ` · ${translate(locale, 'admin.adminOnlyBadge')}`
                : null}
            </p>
          )}
          {selected.description && (
            <p className="mt-3 max-w-xl text-sm text-ink-muted">{selected.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenEditor} className="admin-btn-primary">
            <Pencil size={16} />
            문서 편집
          </button>
          <a
            href={`/${selected.slug}`}
            target="_blank"
            rel="noreferrer"
            className="admin-btn-secondary"
          >
            <ExternalLink size={16} />
            공개 보기
          </a>
          <button type="button" onClick={onOpenEditProduct} className="admin-btn-secondary">
            정보 수정
          </button>
          <button
            type="button"
            onClick={() => onDeleteProduct(selected.id)}
            className="admin-btn-danger"
          >
            <Trash2 size={16} />
            삭제
          </button>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">버전</h3>
          <button
            type="button"
            onClick={onOpenNewVersion}
            disabled={selectedVersions.length === 0}
            className="admin-btn-secondary py-1.5 text-xs"
            title={translate(locale, 'admin.newVersionModalBody')}
          >
            <Plus size={14} />
            {translate(locale, 'admin.cloneSnapshotButton')}
          </button>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-ink-faint">
          {translate(locale, 'admin.versionSectionIntro')}
        </p>
        {selectedVersions.length === 0 ? (
          <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-ink-muted shadow-card">
            버전이 없습니다
          </p>
        ) : (
          <div className="space-y-4">
            <AdminVersionSection
              title={translate(locale, 'admin.workingCopySectionTitle')}
              description={translate(locale, 'admin.workingCopySectionDesc')}
              rows={versionGroups.working}
              product={selected}
              locale={locale}
              onEdit={onEditVersion}
              onRename={onRenameVersion}
              onPublishWorkingCopy={onPublishWorkingCopy}
              onPublishSnapshot={onPublishSnapshot}
              onUnpublish={onUnpublish}
              onDelete={onDeleteVersion}
            />
            <AdminVersionSection
              title={translate(locale, 'admin.publishedSectionTitle')}
              description={translate(locale, 'admin.publishedSectionDesc')}
              rows={versionGroups.published}
              product={selected}
              locale={locale}
              onEdit={onEditVersion}
              onRename={onRenameVersion}
              onPublishWorkingCopy={onPublishWorkingCopy}
              onPublishSnapshot={onPublishSnapshot}
              onUnpublish={onUnpublish}
              onDelete={onDeleteVersion}
            />
            <AdminVersionSection
              title={translate(locale, 'admin.draftSectionTitle')}
              description={translate(locale, 'admin.draftSectionDesc')}
              rows={versionGroups.drafts}
              product={selected}
              locale={locale}
              onEdit={onEditVersion}
              onRename={onRenameVersion}
              onPublishWorkingCopy={onPublishWorkingCopy}
              onPublishSnapshot={onPublishSnapshot}
              onUnpublish={onUnpublish}
              onDelete={onDeleteVersion}
            />
          </div>
        )}
      </section>
    </>
  )
}
