import { Settings2, Trash2 } from 'lucide-react'
import type { DocNode } from '../../components/admin/DocTreeNav'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate, type Locale } from '../../i18n'
import { isSecondaryContentLocale, localeDisplayLabel } from '../../utils/contentLocale'

interface EditorPageBarProps {
  uiLocale: Locale
  editLocale: Locale
  isNewDoc: boolean
  selectedDocId: number | null
  localeAvailable: boolean
  dirty: boolean
  title: string
  canEdit: boolean
  settingsOpen: boolean
  flatDocs: DocNode[]
  invalidParentIds: Set<number>
  parentId: number | ''
  onSwitchLocale: (locale: Locale) => void
  onTitleChange: (title: string) => void
  onToggleSettings: () => void
  onParentChange: (parentId: number | '') => void
  onMoveParent: () => void
  onDelete: () => void
}

export default function EditorPageBar({
  uiLocale,
  editLocale,
  isNewDoc,
  selectedDocId,
  localeAvailable,
  dirty,
  title,
  canEdit,
  settingsOpen,
  flatDocs,
  invalidParentIds,
  parentId,
  onSwitchLocale,
  onTitleChange,
  onToggleSettings,
  onParentChange,
  onMoveParent,
  onDelete,
}: EditorPageBarProps) {
  return (
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
              onClick={() => onSwitchLocale(code)}
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

      {isSecondaryContentLocale(editLocale) && selectedDocId && !localeAvailable && !dirty && (
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
              onChange={(e) => onTitleChange(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          {isNewDoc && (
            <span className="text-xs text-ink-faint">URL slug는 제목에서 자동 생성됩니다</span>
          )}
        </>
      ) : (
        <input
          className="admin-input min-w-[12rem] flex-1 text-base font-medium"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={!canEdit}
          aria-label="페이지 제목"
        />
      )}

      {dirty && <span className="text-xs text-ink-faint">저장되지 않음</span>}

      {selectedDocId && (
        <div className="relative">
          <button
            type="button"
            onClick={onToggleSettings}
            className="admin-btn-secondary py-1.5"
            aria-expanded={settingsOpen}
          >
            <Settings2 size={16} />
            설정
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-stone-200 bg-white p-4 shadow-lg">
              <p className="mb-2 text-xs font-medium uppercase text-ink-faint">상위 페이지</p>
              <select
                className="admin-input mb-3"
                value={parentId}
                onChange={(e) =>
                  onParentChange(e.target.value === '' ? '' : Number(e.target.value))
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
                  onClick={onMoveParent}
                  className="admin-btn-secondary flex-1 py-1.5 text-xs"
                  disabled={!canEdit}
                >
                  적용
                </button>
                <button
                  type="button"
                  onClick={onDelete}
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
  )
}
