import CategoryCombobox from '../../components/admin/CategoryCombobox'
import ProductIconField from '../../components/admin/ProductIconField'
import AdminDialog from '../../components/admin/AdminDialog'
import { notify } from '@/lib/notify'
import { translate } from '../../i18n'
import { ADMIN_ONLY_CATEGORY } from '../../utils/productCategories'
import type { UseAdminPageReturn } from './useAdminPage'

type AdminPageDialogsProps = Pick<
  UseAdminPageReturn,
  | 'locale'
  | 'selected'
  | 'categorySuggestions'
  | 'productModalOpen'
  | 'setProductModalOpen'
  | 'editProductOpen'
  | 'setEditProductOpen'
  | 'renameVersionOpen'
  | 'setRenameVersionOpen'
  | 'versionModalOpen'
  | 'setVersionModalOpen'
  | 'publishModalOpen'
  | 'setPublishModalOpen'
  | 'newProductName'
  | 'setNewProductName'
  | 'newProductDesc'
  | 'setNewProductDesc'
  | 'newProductCategory'
  | 'setNewProductCategory'
  | 'newIconUrl'
  | 'setNewIconUrl'
  | 'newProductSlugPreview'
  | 'editName'
  | 'setEditName'
  | 'editDesc'
  | 'setEditDesc'
  | 'editCategory'
  | 'setEditCategory'
  | 'editIconUrl'
  | 'setEditIconUrl'
  | 'renameVersionName'
  | 'setRenameVersionName'
  | 'newVersionName'
  | 'setNewVersionName'
  | 'baseVersionId'
  | 'setBaseVersionId'
  | 'newVersionSlugPreview'
  | 'selectedVersions'
  | 'versionStatusSuffix'
  | 'publishName'
  | 'setPublishName'
  | 'publishSlugPreview'
  | 'handleCreateProduct'
  | 'handleUpdateProduct'
  | 'handleRenameVersion'
  | 'handleCreateVersion'
  | 'handlePublish'
>

export default function AdminPageDialogs(props: AdminPageDialogsProps) {
  const {
    locale,
    selected,
    categorySuggestions,
    productModalOpen,
    setProductModalOpen,
    editProductOpen,
    setEditProductOpen,
    renameVersionOpen,
    setRenameVersionOpen,
    versionModalOpen,
    setVersionModalOpen,
    publishModalOpen,
    setPublishModalOpen,
    newProductName,
    setNewProductName,
    newProductDesc,
    setNewProductDesc,
    newProductCategory,
    setNewProductCategory,
    newIconUrl,
    setNewIconUrl,
    newProductSlugPreview,
    editName,
    setEditName,
    editDesc,
    setEditDesc,
    editCategory,
    setEditCategory,
    editIconUrl,
    setEditIconUrl,
    renameVersionName,
    setRenameVersionName,
    newVersionName,
    setNewVersionName,
    baseVersionId,
    setBaseVersionId,
    newVersionSlugPreview,
    selectedVersions,
    versionStatusSuffix,
    publishName,
    setPublishName,
    publishSlugPreview,
    handleCreateProduct,
    handleUpdateProduct,
    handleRenameVersion,
    handleCreateVersion,
    handlePublish,
  } = props

  return (
    <>
      <AdminDialog
        open={productModalOpen}
        title="새 제품"
        onClose={() => setProductModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setProductModalOpen(false)} className="admin-btn-secondary">
              취소
            </button>
            <button
              type="button"
              onClick={handleCreateProduct}
              disabled={!newProductName.trim()}
              className="admin-btn-primary"
            >
              만들기
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">제품명</label>
            <input
              className="admin-input"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {translate(locale, 'admin.category')}
            </label>
            <CategoryCombobox
              value={newProductCategory}
              onChange={setNewProductCategory}
              suggestions={categorySuggestions}
              locale={locale}
              placeholder={translate(locale, 'admin.categoryHint')}
            />
            <p className="mt-1 text-xs text-ink-faint">
              {translate(locale, 'admin.adminOnlyCategoryNote', {
                name: translate(locale, 'admin.categoryAdminOnly'),
                code: ADMIN_ONLY_CATEGORY,
              })}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">설명 (선택)</label>
            <textarea
              className="admin-input"
              rows={2}
              value={newProductDesc}
              onChange={(e) => setNewProductDesc(e.target.value)}
            />
          </div>
          <ProductIconField
            productSlug={newProductSlugPreview}
            value={newIconUrl}
            onChange={setNewIconUrl}
            disabled={!newProductSlugPreview}
            onUploadError={(msg) => notify(msg, 'error')}
          />
        </div>
      </AdminDialog>

      <AdminDialog
        open={editProductOpen}
        title="제품 정보 수정"
        onClose={() => setEditProductOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setEditProductOpen(false)} className="admin-btn-secondary">
              취소
            </button>
            <button type="button" onClick={handleUpdateProduct} className="admin-btn-primary">
              저장
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">제품명</label>
            <input className="admin-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {translate(locale, 'admin.category')}
            </label>
            <CategoryCombobox
              value={editCategory}
              onChange={setEditCategory}
              suggestions={categorySuggestions}
              locale={locale}
              placeholder={translate(locale, 'admin.categoryHint')}
            />
            <p className="mt-1 text-xs text-ink-faint">
              {translate(locale, 'admin.adminOnlyCategoryNote', {
                name: translate(locale, 'admin.categoryAdminOnly'),
                code: ADMIN_ONLY_CATEGORY,
              })}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">설명</label>
            <textarea
              className="admin-input"
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          {selected ? (
            <ProductIconField
              productSlug={selected.slug}
              value={editIconUrl}
              onChange={setEditIconUrl}
              onUploadError={(msg) => notify(msg, 'error')}
            />
          ) : null}
        </div>
      </AdminDialog>

      <AdminDialog
        open={renameVersionOpen}
        title={translate(locale, 'admin.renameVersion')}
        onClose={() => setRenameVersionOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setRenameVersionOpen(false)} className="admin-btn-secondary">
              {translate(locale, 'common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleRenameVersion}
              disabled={!renameVersionName.trim()}
              className="admin-btn-primary"
            >
              {translate(locale, 'common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              {translate(locale, 'admin.versionDisplayName')}
            </label>
            <input
              className="admin-input"
              value={renameVersionName}
              onChange={(e) => setRenameVersionName(e.target.value)}
            />
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        open={versionModalOpen}
        title={translate(locale, 'admin.newVersionModalTitle')}
        onClose={() => setVersionModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setVersionModalOpen(false)} className="admin-btn-secondary">
              취소
            </button>
            <button
              type="button"
              onClick={handleCreateVersion}
              disabled={
                !newVersionName.trim() ||
                !baseVersionId ||
                !newVersionSlugPreview ||
                newVersionSlugPreview === 'latest'
              }
              className="admin-btn-primary"
            >
              만들기
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-muted">{translate(locale, 'admin.newVersionModalBody')}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">원본 버전</label>
            <select
              className="admin-input"
              value={baseVersionId}
              onChange={(e) => setBaseVersionId(Number(e.target.value))}
            >
              {selectedVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {versionStatusSuffix(v)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">새 버전 이름</label>
            <input
              className="admin-input"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="2026.06.02-draft"
            />
          </div>
        </div>
      </AdminDialog>

      <AdminDialog
        open={publishModalOpen}
        title={translate(locale, 'admin.publishModalTitle')}
        onClose={() => setPublishModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setPublishModalOpen(false)} className="admin-btn-secondary">
              취소
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!publishName.trim() || !publishSlugPreview || publishSlugPreview === 'latest'}
              className="admin-btn-primary"
            >
              게시
            </button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-muted">{translate(locale, 'admin.publishModalBody')}</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">버전 이름</label>
            <input
              className="admin-input"
              value={publishName}
              onChange={(e) => setPublishName(e.target.value)}
              placeholder="2026.06.03"
            />
          </div>
        </div>
      </AdminDialog>
    </>
  )
}
