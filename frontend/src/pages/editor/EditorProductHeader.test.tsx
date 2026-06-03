import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EditorProductHeader from './EditorProductHeader'

describe('EditorProductHeader', () => {
  it('changes product and version selections', async () => {
    const user = userEvent.setup()
    const onChangeProduct = vi.fn()
    const onChangeVersion = vi.fn()

    render(
      <EditorProductHeader
        products={[
          { id: 1, name: 'Alpha', slug: 'alpha' },
          { id: 2, name: 'Beta', slug: 'beta' },
        ]}
        versions={[
          { id: 10, name: 'latest', slug: 'latest', is_latest: true, is_published: false },
          { id: 11, name: '2026.01', slug: 'pub-01', is_latest: false, is_published: true },
        ]}
        selectedProduct="alpha"
        selectedVersion="latest"
        uiLocale="ko"
        readOnlyBadgeLabel={null}
        version={{ id: 10, name: 'latest', slug: 'latest', is_latest: true, is_published: false }}
        onChangeProduct={onChangeProduct}
        onChangeVersion={onChangeVersion}
      />,
    )

    await user.selectOptions(screen.getByLabelText('제품'), 'beta')
    expect(onChangeProduct).toHaveBeenCalledWith('beta')

    await user.selectOptions(screen.getByLabelText('버전'), 'pub-01')
    expect(onChangeVersion).toHaveBeenCalledWith('pub-01')
  })
})
