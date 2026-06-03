import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocSearchCombobox from './DocSearchCombobox'

const mockClose = vi.fn()
const mockSetQuery = vi.fn()
const mockSubmit = vi.fn()

vi.mock('../../hooks/useDocLocale', () => ({
  useDocLocale: () => ({ locale: 'ko', setDocLocale: vi.fn() }),
}))

vi.mock('../../hooks/useDocSearch', () => ({
  useDocSearch: vi.fn(),
}))

import { useDocSearch } from '../../hooks/useDocSearch'

describe('DocSearchCombobox', () => {
  beforeEach(() => {
    vi.mocked(useDocSearch).mockReturnValue({
      query: '',
      setQuery: mockSetQuery,
      results: [],
      open: false,
      setOpen: vi.fn(),
      loading: false,
      close: mockClose,
      submit: mockSubmit,
      runSearch: vi.fn(),
    })
    mockClose.mockReset()
    mockSetQuery.mockReset()
    mockSubmit.mockReset()
  })

  it('renders search field with placeholder', () => {
    render(
      <MemoryRouter>
        <DocSearchCombobox placeholder="Search docs" />
      </MemoryRouter>,
    )
    expect(screen.getByPlaceholderText('Search docs')).toBeInTheDocument()
  })

  it('shows empty-state panel when open with no results', () => {
    vi.mocked(useDocSearch).mockReturnValue({
      query: 'missing',
      setQuery: mockSetQuery,
      results: [],
      open: true,
      setOpen: vi.fn(),
      loading: false,
      close: mockClose,
      submit: mockSubmit,
      runSearch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DocSearchCombobox />
      </MemoryRouter>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/검색 결과가 없습니다/i)).toBeInTheDocument()
  })

  it('lists search hits and closes on escape', async () => {
    const user = userEvent.setup()
    vi.mocked(useDocSearch).mockReturnValue({
      query: 'guide',
      setQuery: mockSetQuery,
      results: [
        {
          id: 1,
          title: 'Getting Started',
          slug: 'getting-started',
          product_slug: 'alpha',
          product_name: 'Alpha',
          version_slug: 'latest',
          version_name: 'Latest',
          excerpt: '# Intro\n\nWelcome **reader**',
        },
      ],
      open: true,
      setOpen: vi.fn(),
      loading: false,
      close: mockClose,
      submit: mockSubmit,
      runSearch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DocSearchCombobox />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /Getting Started/i })).toHaveAttribute(
      'href',
      '/alpha/latest/getting-started',
    )
    expect(screen.getByText(/Intro Welcome reader/i)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(mockClose).toHaveBeenCalled()
  })
})
