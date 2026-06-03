import { describe, expect, it } from 'vitest'
import { PRODUCT_ICON_VERSION_SLUG } from './productIconMedia'

describe('productIconMedia constants', () => {
  it('defines icon upload version slug', () => {
    expect(PRODUCT_ICON_VERSION_SLUG).toBe('_icon')
  })
})
