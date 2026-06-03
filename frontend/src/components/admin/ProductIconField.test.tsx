import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductIconField from './ProductIconField'

vi.mock('../../api/client', () => ({
  default: { post: vi.fn() },
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

import client from '../../api/client'

describe('ProductIconField', () => {
  beforeEach(() => {
    vi.mocked(client.post).mockReset()
  })

  it('renders icon preview and remove control when value is set', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    const { container } = render(
      <ProductIconField
        productSlug="alpha"
        value="/media/icon.png"
        onChange={onChange}
      />,
    )

    expect(container.querySelector('img[src="/media/icon.png"]')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /아이콘 제거/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('uploads image file via API', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(client.post).mockResolvedValueOnce({ data: { url: '/uploads/icon.png' } })

    render(
      <ProductIconField productSlug="alpha" value={null} onChange={onChange} />,
    )

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'icon.png', { type: 'image/png' })
    await user.upload(input, file)

    expect(client.post).toHaveBeenCalledWith(
      '/upload',
      expect.any(FormData),
      expect.objectContaining({
        params: { product_slug: 'alpha', version_slug: '_icon' },
      }),
    )
    expect(onChange).toHaveBeenCalledWith('/uploads/icon.png')
  })
})
