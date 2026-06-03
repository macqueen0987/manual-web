import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AdminVersionRow from './AdminVersionRow'
import { publishedVersion, sampleProduct, workingVersion } from '../../test/adminFixtures'

describe('AdminVersionRow', () => {
  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()

    render(
      <table>
        <tbody>
          <AdminVersionRow
            version={workingVersion}
            product={sampleProduct}
            locale="ko"
            onEdit={onEdit}
            onRename={vi.fn()}
            onPublishWorkingCopy={vi.fn()}
            onPublishSnapshot={vi.fn()}
            onUnpublish={vi.fn()}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    )

    await user.click(screen.getByRole('button', { name: '편집' }))
    expect(onEdit).toHaveBeenCalledWith(workingVersion)
  })

  it('calls onUnpublish for published versions', async () => {
    const user = userEvent.setup()
    const onUnpublish = vi.fn()

    render(
      <table>
        <tbody>
          <AdminVersionRow
            version={publishedVersion}
            product={sampleProduct}
            locale="ko"
            onEdit={vi.fn()}
            onRename={vi.fn()}
            onPublishWorkingCopy={vi.fn()}
            onPublishSnapshot={vi.fn()}
            onUnpublish={onUnpublish}
            onDelete={vi.fn()}
          />
        </tbody>
      </table>,
    )

    await user.click(screen.getByRole('button', { name: '게시 취소' }))
    expect(onUnpublish).toHaveBeenCalledWith(publishedVersion)
  })
})
