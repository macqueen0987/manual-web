import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomeHeroSection from './HomeHeroSection'

describe('HomeHeroSection', () => {
  it('renders default hero copy when no custom HTML is provided', () => {
    render(<HomeHeroSection locale="ko" customHtml={null} />)
    expect(screen.getByText(/README/i)).toBeInTheDocument()
  })

  it('renders sanitized custom hero HTML when provided', () => {
    render(
      <HomeHeroSection
        locale="en"
        customHtml="<p class='hero-custom'>Custom hero</p>"
      />,
    )
    expect(screen.getByText('Custom hero')).toBeInTheDocument()
    expect(document.querySelector('.home-hero-template')).toBeTruthy()
  })
})
