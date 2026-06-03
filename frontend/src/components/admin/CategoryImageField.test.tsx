import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CategoryImageField from './CategoryImageField'

vi.mock('../../api/client', () => ({
  default: { post: vi.fn() },
}))

vi.mock('../../stores/localeStore', () => ({
  useLocaleStore: (selector: (state: { locale: 'ko' }) => unknown) =>
    selector({ locale: 'ko' }),
}))

import client from '../../api/client'

describe('CategoryImageField', () => {
  beforeEach(() => {
    vi.mocked(client.post).mockReset()
  })

  it('renders preview image when value is set', () => {
    const { container } = render(
      <CategoryImageField value="/media/showcase.png" onChange={vi.fn()} />,
    )

    expect(container.querySelector('img[src="/media/showcase.png"]')).toBeTruthy()
  })

  it('uploads image to site media path', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    vi.mocked(client.post).mockResolvedValueOnce({ data: { url: '/uploads/showcase.png' } })

    render(<CategoryImageField value={null} onChange={onChange} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['x'], 'showcase.png', { type: 'image/png' })
    await user.upload(input, file)

    expect(client.post).toHaveBeenCalledWith(
      '/upload',
      expect.any(FormData),
      expect.objectContaining({
        params: { product_slug: '_site', version_slug: 'home' },
      }),
    )
    expect(onChange).toHaveBeenCalledWith('/uploads/showcase.png')
  })
})
