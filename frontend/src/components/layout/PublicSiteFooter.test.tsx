import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PublicSiteFooter from './PublicSiteFooter'

vi.mock('../../hooks/useSiteBranding', () => ({
  useSiteBranding: () => ({
    title: 'Acme Docs',
    logo_url: null,
    logo_letter: 'A',
  }),
}))

vi.mock('../../hooks/useSiteFooter', () => ({
  useSiteFooter: vi.fn(() => null),
}))

import { useSiteFooter } from '../../hooks/useSiteFooter'

describe('PublicSiteFooter', () => {
  it('renders default copyright when no custom HTML', () => {
    vi.mocked(useSiteFooter).mockReturnValue(null)
    render(<PublicSiteFooter locale="en" />)
    expect(screen.getByText(/Acme Docs/)).toBeInTheDocument()
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })

  it('renders custom footer template HTML when provided', () => {
    vi.mocked(useSiteFooter).mockReturnValue(
      '<footer><p class="custom-ft">Custom footer</p></footer>',
    )
    render(<PublicSiteFooter locale="ko" />)
    expect(screen.getByText('Custom footer')).toBeInTheDocument()
    expect(document.querySelector('.site-footer-template')).toBeTruthy()
  })
})
