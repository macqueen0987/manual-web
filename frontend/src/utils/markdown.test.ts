import { describe, expect, it } from 'vitest'
import { headingTextFromMarkdown, headingToId } from './markdown'

describe('headingToId', () => {
  it('lowercases and hyphenates headings', () => {
    expect(headingToId('Getting Started')).toBe('getting-started')
  })

  it('strips punctuation', () => {
    expect(headingToId('Hello, World!')).toBe('hello-world')
  })
})

describe('headingTextFromMarkdown', () => {
  it('strips inline emphasis for slug alignment', () => {
    expect(headingTextFromMarkdown('## Hello **World**')).toBe('Hello World')
    expect(headingToId(headingTextFromMarkdown('## Hello **World**'))).toBe('hello-world')
  })
})
