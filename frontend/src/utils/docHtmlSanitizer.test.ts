import { describe, expect, it } from 'vitest'
import { docHtmlSanitizer } from './docHtmlSanitizer'

describe('docHtmlSanitizer', () => {
  it('keeps img width and height attributes', () => {
    const html = docHtmlSanitizer(
      '<img src="/uploads/a.png" alt="x" width="320" height="180" />',
    )
    expect(html).toContain('width="320"')
    expect(html).toContain('height="180"')
  })

  it('strips unsafe img styles', () => {
    const html = docHtmlSanitizer('<img src="/a.png" alt="x" style="position:absolute" />')
    expect(html).not.toContain('style=')
  })
})
