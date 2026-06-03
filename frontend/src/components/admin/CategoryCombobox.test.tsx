import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CategoryCombobox from './CategoryCombobox'

describe('CategoryCombobox', () => {
  it('filters suggestions and selects a category', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <CategoryCombobox
        value=""
        onChange={onChange}
        suggestions={['Platform', 'Automation']}
        locale="ko"
        placeholder="Category"
      />,
    )

    const input = screen.getByRole('combobox')
    await user.click(input)
    await user.click(screen.getByRole('option', { name: /Platform/ }))

    expect(onChange).toHaveBeenCalledWith('Platform')
  })

  it('selects highlighted option on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <CategoryCombobox
        value="Auto"
        onChange={onChange}
        suggestions={['Platform', 'Automation']}
        locale="ko"
      />,
    )

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('Automation')
  })
})
