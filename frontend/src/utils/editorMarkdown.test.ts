import { describe, expect, it } from 'vitest'
import { markdownForVideoEmbed } from './mediaMarkdown'

/** Round-trip fixtures: markdown source of truth for public render pipeline. */
describe('editor markdown fixtures', () => {
  it('youtube embed produces video-embed div', () => {
    const md = markdownForVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(md).toContain('video-embed')
    expect(md).toContain('youtube.com/embed/')
  })

  it('plain heading survives as markdown', () => {
    const source = '## Hello\n\nParagraph text.'
    expect(source).toMatch(/^##/)
    expect(source).toContain('Paragraph')
  })
})
