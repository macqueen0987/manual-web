import type { DocNode } from '../../components/admin/DocTreeNav'
import AdminDialog from '../../components/admin/AdminDialog'

interface EditorNewPageDialogProps {
  open: boolean
  flatDocs: DocNode[]
  newPageParentId: number | ''
  canEdit: boolean
  onClose: () => void
  onParentChange: (parentId: number | '') => void
  onCreate: () => void
}

export default function EditorNewPageDialog({
  open,
  flatDocs,
  newPageParentId,
  canEdit,
  onClose,
  onParentChange,
  onCreate,
}: EditorNewPageDialogProps) {
  return (
    <AdminDialog
      open={open}
      title="새 페이지"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="button" className="admin-btn-primary" onClick={onCreate} disabled={!canEdit}>
            만들기
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-muted">
        상위 페이지를 선택하세요. URL slug는 저장 시 제목에서 자동 생성됩니다.
      </p>
      <label className="mb-1 block text-xs font-medium uppercase text-ink-faint">상위 페이지</label>
      <select
        className="admin-input"
        value={newPageParentId}
        onChange={(e) => onParentChange(e.target.value === '' ? '' : Number(e.target.value))}
      >
        <option value="">(최상위)</option>
        {flatDocs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>
    </AdminDialog>
  )
}
