import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import EditorPage from './EditorPage'

vi.mock('./editor/useEditorPage', () => ({
  useEditorPage: vi.fn(),
}))

vi.mock('../components/admin/AdminLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/admin/DocTreeNav', () => ({
  default: () => <div>Doc tree</div>,
}))

vi.mock('./editor/EditorProductHeader', () => ({
  default: () => <div>Editor header</div>,
}))

vi.mock('./editor/EditorPageBar', () => ({
  default: () => <div>Editor bar</div>,
}))

vi.mock('./editor/EditorWorkspace', () => ({
  default: () => <div>Editor workspace</div>,
}))

vi.mock('./editor/EditorNewPageDialog', () => ({
  default: () => null,
}))

import { useEditorPage } from './editor/useEditorPage'

describe('EditorPage', () => {
  it('renders editor shell sections', () => {
    vi.mocked(useEditorPage).mockReturnValue({
      user: { email: 'admin@example.com', is_superuser: true },
      handleLogout: vi.fn(),
      editorBreadcrumbs: [],
      docTree: [],
      isNewDoc: false,
      selectedDocSlug: '',
      selectDoc: vi.fn(),
      openNewPageModal: vi.fn(),
      canEdit: true,
      handleReposition: vi.fn(),
      uiLocale: 'ko',
      editLocale: 'ko',
      selectedDocId: null,
      localeAvailable: true,
      dirty: false,
      title: '',
      settingsOpen: false,
      flatDocs: [],
      invalidParentIds: new Set<number>(),
      parentId: null,
      switchEditLocale: vi.fn(),
      setTitle: vi.fn(),
      setDirty: vi.fn(),
      setSettingsOpen: vi.fn(),
      setParentId: vi.fn(),
      handleMoveParent: vi.fn(),
      handleDelete: vi.fn(),
      products: [],
      versions: [],
      selectedProduct: null,
      selectedVersion: null,
      readOnlyBadgeLabel: '',
      version: '',
      changeProduct: vi.fn(),
      changeVersion: vi.fn(),
      newPageModalOpen: false,
      newPageParentId: null,
      setNewPageModalOpen: vi.fn(),
      setNewPageParentId: vi.fn(),
      startNewDoc: vi.fn(),
      imageInputRef: { current: null },
      fileInputRef: { current: null },
      editorWrapRef: { current: null },
      wysiwygEditorRef: { current: null },
      handleEditorModeChange: vi.fn(),
      saving: false,
      handleSave: vi.fn(),
      handleMediaUpload: vi.fn(),
      handleVideoEmbed: vi.fn(),
      uploading: false,
      editorPaneKey: 'key',
      content: '',
      setContent: vi.fn(),
      setUploading: vi.fn(),
      editorMode: 'markdown',
    } as never)

    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Editor header')).toBeInTheDocument()
    expect(screen.getByText('Doc tree')).toBeInTheDocument()
    expect(screen.getByText('Editor bar')).toBeInTheDocument()
    expect(screen.getByText('Editor workspace')).toBeInTheDocument()
  })
})
