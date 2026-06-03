import { describe, expect, it, vi } from 'vitest'
import {
  markdownForUpload,
  markdownForVideoEmbed,
  uploadKindFromFilename,
  vimeoVideoId,
  youtubeVideoId,
} from './mediaMarkdown'

describe('youtubeVideoId', () => {
  it('extracts id from common URL formats', () => {
    expect(youtubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(youtubeVideoId('https://example.com')).toBeNull()
  })
})

describe('vimeoVideoId', () => {
  it('extracts numeric id', () => {
    expect(vimeoVideoId('https://vimeo.com/123456789')).toBe('123456789')
    expect(vimeoVideoId('https://vimeo.com/video/987654321')).toBe('987654321')
  })
})

describe('markdownForUpload', () => {
  it('builds image and file markdown', () => {
    expect(markdownForUpload('/a.png', 'shot.png', 'image')).toContain('![shot.png]')
    expect(markdownForUpload('/a.pdf', 'doc.pdf', 'file')).toContain('[doc.pdf]')
  })
})

describe('markdownForVideoEmbed', () => {
  it('returns iframe markdown for supported hosts', () => {
    expect(markdownForVideoEmbed('https://youtu.be/dQw4w9WgXcQ')).toContain('youtube.com/embed')
    expect(markdownForVideoEmbed('https://vimeo.com/123456789')).toContain('player.vimeo.com')
    expect(markdownForVideoEmbed('https://example.com')).toBeNull()
  })
})

describe('uploadKindFromFilename', () => {
  it('classifies by extension', () => {
    expect(uploadKindFromFilename('photo.jpg')).toBe('image')
    expect(uploadKindFromFilename('clip.mp4')).toBe('video')
    expect(uploadKindFromFilename('readme')).toBe('file')
  })
})
