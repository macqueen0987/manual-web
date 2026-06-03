import {
  ExternalLink,
  Eye,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react'
import { translate, type Locale } from '../../i18n'
import type { AdminProduct, AdminVersion } from './types'

interface AdminVersionRowProps {
  version: AdminVersion
  product: AdminProduct
  locale: Locale
  onEdit: (version: AdminVersion) => void
  onRename: (version: AdminVersion) => void
  onPublishWorkingCopy: () => void
  onPublishSnapshot: (version: AdminVersion) => void
  onUnpublish: (version: AdminVersion) => void
  onDelete: (version: AdminVersion) => void
}

export default function AdminVersionRow({
  version: v,
  product,
  locale,
  onEdit,
  onRename,
  onPublishWorkingCopy,
  onPublishSnapshot,
  onUnpublish,
  onDelete,
}: AdminVersionRowProps) {
  return (
    <tr className="border-t border-stone-50">
      <td className="px-4 py-3 font-medium">
        <span className="inline-flex items-center gap-1">
          {v.name}
          <button
            type="button"
            onClick={() => onRename(v)}
            className="inline-flex rounded p-0.5 text-accent transition-colors hover:bg-accent/10"
            title={translate(locale, 'admin.renameVersion')}
            aria-label={translate(locale, 'admin.renameVersion')}
          >
            <Pencil size={14} />
          </button>
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={
            v.is_latest
              ? 'rounded-full bg-accent-muted px-2 py-0.5 text-xs font-medium text-accent-hover'
              : v.is_published
                ? 'rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-ink-muted'
                : 'rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900'
          }
        >
          {v.is_latest
            ? translate(locale, 'admin.workingCopyStatus')
            : v.is_published
              ? translate(locale, 'admin.publishedBadge')
              : translate(locale, 'admin.draftSnapshotBadge')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div
          className="flex flex-wrap items-center justify-end gap-1.5"
          role="group"
          aria-label={`${v.name} 버전 작업`}
        >
          <button type="button" onClick={() => onEdit(v)} className="admin-btn-secondary admin-btn-sm">
            <Pencil size={14} aria-hidden />
            편집
          </button>
          {v.is_latest ? (
            <>
              <a
                href={`/${product.slug}/latest`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn-secondary admin-btn-sm"
                title="관리자 미리보기 (독자에게는 비공개)"
              >
                <Eye size={14} aria-hidden />
                미리보기
              </a>
              <button
                type="button"
                onClick={onPublishWorkingCopy}
                className="admin-btn-primary admin-btn-sm"
              >
                <Send size={14} aria-hidden />
                {translate(locale, 'admin.publishFromWorkingCopy')}
              </button>
            </>
          ) : v.is_published ? (
            <>
              <a
                href={`/${product.slug}/${v.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn-secondary admin-btn-sm"
              >
                <ExternalLink size={14} aria-hidden />
                {translate(locale, 'admin.viewPublic')}
              </a>
              <button
                type="button"
                onClick={() => onUnpublish(v)}
                className="admin-btn-danger admin-btn-sm"
              >
                <XCircle size={14} aria-hidden />
                게시 취소
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onPublishSnapshot(v)}
              className="admin-btn-primary admin-btn-sm"
            >
              <Send size={14} aria-hidden />
              {translate(locale, 'admin.publishDraftSnapshot')}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(v)}
            className="admin-btn-danger admin-btn-sm"
            title={
              v.is_latest
                ? translate(locale, 'admin.deleteWorkingCopyConfirm', { name: v.name })
                : translate(locale, 'admin.deleteVersionConfirm', { name: v.name })
            }
          >
            <Trash2 size={14} aria-hidden />
            {translate(locale, 'common.delete')}
          </button>
        </div>
      </td>
    </tr>
  )
}
