import { describe, expect, it } from 'vitest'
import { headingToId } from './markdown'

describe('headingToId', () => {
  it('lowercases and hyphenates headings', () => {
    expect(headingToId('Getting Started')).toBe('getting-started')
  })

  it('strips punctuation', () => {
    expect(headingToId('Hello, World!')).toBe('hello-world')
  })
})
