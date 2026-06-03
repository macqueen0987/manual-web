import AdminLayout from '../components/admin/AdminLayout'
import DocTreeNav from '../components/admin/DocTreeNav'
import EditorNewPageDialog from './editor/EditorNewPageDialog'
import EditorPageBar from './editor/EditorPageBar'
import EditorProductHeader from './editor/EditorProductHeader'
import EditorWorkspace from './editor/EditorWorkspace'
import { useEditorPage } from './editor/useEditorPage'

export default function EditorPage() {
  const editor = useEditorPage()

  return (
    <AdminLayout
      userEmail={editor.user?.email}
      onLogout={editor.handleLogout}
      variant="editor"
      breadcrumbs={editor.editorBreadcrumbs}
    >
      <EditorProductHeader
        products={editor.products}
        versions={editor.versions}
        selectedProduct={editor.selectedProduct}
        selectedVersion={editor.selectedVersion}
        uiLocale={editor.uiLocale}
        readOnlyBadgeLabel={editor.readOnlyBadgeLabel}
        version={editor.version}
        onChangeProduct={editor.changeProduct}
        onChangeVersion={editor.changeVersion}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DocTreeNav
          docs={editor.docTree}
          currentSlug={editor.isNewDoc ? undefined : editor.selectedDocSlug}
          onSelect={editor.selectDoc}
          onNewPage={editor.openNewPageModal}
          onReposition={editor.canEdit ? editor.handleReposition : undefined}
          dragEnabled={editor.canEdit}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <EditorPageBar
            uiLocale={editor.uiLocale}
            editLocale={editor.editLocale}
            isNewDoc={editor.isNewDoc}
            selectedDocId={editor.selectedDocId}
            localeAvailable={editor.localeAvailable}
            dirty={editor.dirty}
            title={editor.title}
            canEdit={editor.canEdit}
            settingsOpen={editor.settingsOpen}
            flatDocs={editor.flatDocs}
            invalidParentIds={editor.invalidParentIds}
            parentId={editor.parentId}
            onSwitchLocale={editor.switchEditLocale}
            onTitleChange={(value) => {
              editor.setTitle(value)
              editor.setDirty(true)
            }}
            onToggleSettings={() => editor.setSettingsOpen(!editor.settingsOpen)}
            onParentChange={editor.setParentId}
            onMoveParent={() => void editor.handleMoveParent()}
            onDelete={() => void editor.handleDelete()}
          />

          <EditorWorkspace
            isNewDoc={editor.isNewDoc}
            selectedDocSlug={editor.selectedDocSlug}
            selectedDocId={editor.selectedDocId}
            canEdit={editor.canEdit}
            openNewPageModal={editor.openNewPageModal}
            imageInputRef={editor.imageInputRef}
            fileInputRef={editor.fileInputRef}
            editorWrapRef={editor.editorWrapRef}
            wysiwygEditorRef={editor.wysiwygEditorRef}
            uiLocale={editor.uiLocale}
            editorMode={editor.editorMode}
            onEditorModeChange={editor.handleEditorModeChange}
            saving={editor.saving}
            dirty={editor.dirty}
            onSave={() => void editor.handleSave()}
            onDelete={editor.selectedDocId ? () => void editor.handleDelete() : undefined}
            onMediaUpload={(file) => void editor.handleMediaUpload(file)}
            onVideoEmbed={editor.handleVideoEmbed}
            uploading={editor.uploading}
            selectedProduct={editor.selectedProduct}
            selectedVersion={editor.selectedVersion}
            editorPaneKey={editor.editorPaneKey}
            content={editor.content}
            onContentChange={editor.setContent}
            onDirty={() => editor.setDirty(true)}
            setUploading={editor.setUploading}
          />
        </div>
      </div>

      <EditorNewPageDialog
        open={editor.newPageModalOpen}
        flatDocs={editor.flatDocs}
        newPageParentId={editor.newPageParentId}
        canEdit={editor.canEdit}
        onClose={() => editor.setNewPageModalOpen(false)}
        onParentChange={editor.setNewPageParentId}
        onCreate={() => editor.startNewDoc(editor.newPageParentId)}
      />
    </AdminLayout>
  )
}
