import { describe, expect, it } from 'vitest'
import { plainSearchExcerpt } from './searchExcerpt'

describe('plainSearchExcerpt', () => {
  it('strips markdown formatting', () => {
    const raw = '# Title\n\n**Bold** and *italic* with `code` and [link](https://x.com)'
    expect(plainSearchExcerpt(raw)).toBe('Title Bold and italic with code and link')
  })

  it('truncates long text with ellipsis', () => {
    const long = 'word '.repeat(60).trim()
    const excerpt = plainSearchExcerpt(long, 20)
    expect(excerpt.endsWith('…')).toBe(true)
    expect(excerpt.length).toBeLessThanOrEqual(21)
  })

  it('returns short text unchanged', () => {
    expect(plainSearchExcerpt('hello')).toBe('hello')
  })
})
