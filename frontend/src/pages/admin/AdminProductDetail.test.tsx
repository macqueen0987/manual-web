import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AdminProductDetail from './AdminProductDetail'
import { draftVersion, publishedVersion, sampleProduct, workingVersion } from '../../test/adminFixtures'

describe('AdminProductDetail', () => {
  it('renders product metadata and version sections', () => {
    render(
      <AdminProductDetail
        product={sampleProduct}
        locale="ko"
        versionGroups={{
          working: [workingVersion],
          published: [publishedVersion],
          drafts: [draftVersion],
        }}
        selectedVersions={[workingVersion, publishedVersion, draftVersion]}
        onOpenEditor={vi.fn()}
        onOpenEditProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onOpenNewVersion={vi.fn()}
        onEditVersion={vi.fn()}
        onRenameVersion={vi.fn()}
        onPublishWorkingCopy={vi.fn()}
        onPublishSnapshot={vi.fn()}
        onUnpublish={vi.fn()}
        onDeleteVersion={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Alpha Docs' })).toBeInTheDocument()
    expect(screen.getByText('/alpha')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.getByText('latest')).toBeInTheDocument()
  })

  it('invokes editor navigation handler', async () => {
    const user = userEvent.setup()
    const onOpenEditor = vi.fn()

    render(
      <AdminProductDetail
        product={sampleProduct}
        locale="ko"
        versionGroups={{ working: [workingVersion], published: [], drafts: [] }}
        selectedVersions={[workingVersion]}
        onOpenEditor={onOpenEditor}
        onOpenEditProduct={vi.fn()}
        onDeleteProduct={vi.fn()}
        onOpenNewVersion={vi.fn()}
        onEditVersion={vi.fn()}
        onRenameVersion={vi.fn()}
        onPublishWorkingCopy={vi.fn()}
        onPublishSnapshot={vi.fn()}
        onUnpublish={vi.fn()}
        onDeleteVersion={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '문서 편집' }))
    expect(onOpenEditor).toHaveBeenCalledTimes(1)
  })
})
