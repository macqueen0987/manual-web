import { Plus } from 'lucide-react'
import AdminLayout from '../components/admin/AdminLayout'
import ProductSidebarList from '../components/admin/ProductSidebarList'
import AdminPageDialogs from './admin/AdminPageDialogs'
import AdminProductDetail from './admin/AdminProductDetail'
import { useAdminPage } from './admin/useAdminPage'

export default function AdminPage() {
  const admin = useAdminPage()

  return (
    <AdminLayout userEmail={admin.user?.email} onLogout={admin.handleLogout}>
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-surface-raised px-4 py-3 sm:px-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">제품 관리</h1>
          <p className="mt-0.5 text-sm text-ink-muted">제품·버전을 관리하고 문서 편집으로 이동합니다</p>
        </div>
        <button
          type="button"
          onClick={() => admin.setProductModalOpen(true)}
          className="admin-btn-primary"
        >
          <Plus size={16} />
          새 제품
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 shrink-0 overflow-y-auto border-r border-stone-200 bg-surface-muted/50 p-3 lg:w-64">
          {admin.loading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-200/60" />
              ))}
            </div>
          ) : admin.products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
              <p className="text-sm text-ink-muted">등록된 제품이 없습니다</p>
              <button
                type="button"
                onClick={() => admin.setProductModalOpen(true)}
                className="admin-btn-primary mt-4 w-full"
              >
                첫 제품 만들기
              </button>
            </div>
          ) : (
            <ProductSidebarList
              groups={admin.productGroups}
              selectedId={admin.selectedId}
              versions={admin.versions}
              locale={admin.locale}
              onSelect={admin.setSelectedId}
              onReorder={admin.handleReorderProducts}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!admin.selected ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-ink-muted">왼쪽에서 제품을 선택하거나 새로 만드세요</p>
            </div>
          ) : (
            <AdminProductDetail
              product={admin.selected}
              locale={admin.locale}
              versionGroups={admin.versionGroups}
              selectedVersions={admin.selectedVersions}
              onOpenEditor={() =>
                admin.navigate(`/admin/products/${admin.selected!.slug}/latest/editor`)
              }
              onOpenEditProduct={admin.openEditProduct}
              onDeleteProduct={admin.handleDeleteProduct}
              onOpenNewVersion={admin.openNewVersion}
              onEditVersion={admin.openEditor}
              onRenameVersion={admin.openRenameVersion}
              onPublishWorkingCopy={admin.openPublish}
              onPublishSnapshot={admin.handlePublishSnapshot}
              onUnpublish={admin.handleUnpublish}
              onDeleteVersion={admin.handleDeleteVersion}
            />
          )}
        </div>
      </div>

      <AdminPageDialogs {...admin} />
    </AdminLayout>
  )
}
