import { describe, expect, it } from 'vitest'
import { SITE_MEDIA_PRODUCT_SLUG, SITE_MEDIA_VERSION_SLUG } from './siteMedia'

describe('siteMedia constants', () => {
  it('defines site upload paths', () => {
    expect(SITE_MEDIA_PRODUCT_SLUG).toBe('_site')
    expect(SITE_MEDIA_VERSION_SLUG).toBe('home')
  })
})
